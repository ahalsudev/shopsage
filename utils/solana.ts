import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'

import { PROGRAM_IDS, PLATFORM_CONFIG, PDA_SEEDS } from '../constants/programs'
import { IDL as PaymentIDL, ShopsagePayment } from '../types/programs/shopsage-payment'
import { IDL as SessionIDL, ShopsageSession } from '../types/programs/shopsage-session'
import { IDL as ExpertIDL, ShopsageExpert } from '../types/programs/shopsage-expert'

export class SolanaUtils {
  private connection: Connection
  private paymentProgram: Program<ShopsagePayment> | null = null
  private sessionProgram: Program<ShopsageSession> | null = null
  private expertProgram: Program<ShopsageExpert> | null = null

  constructor() {
    this.connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT, 'confirmed')
  }

  // Initialize programs with wallet provider
  async initializePrograms(walletPublicKey: PublicKey): Promise<void> {
    try {
      // Create a mock provider for program initialization
      const provider = new AnchorProvider(
        this.connection,
        {
          publicKey: walletPublicKey,
          signTransaction: async (tx: Transaction) => tx,
          signAllTransactions: async (txs: Transaction[]) => txs,
        },
        { commitment: 'confirmed' },
      )

      this.paymentProgram = new Program(PaymentIDL, PROGRAM_IDS.SHOPSAGE_PAYMENT, provider)
      this.sessionProgram = new Program(SessionIDL, PROGRAM_IDS.SHOPSAGE_SESSION, provider)
      this.expertProgram = new Program(ExpertIDL, PROGRAM_IDS.SHOPSAGE_EXPERT, provider)
    } catch (error) {
      console.error('Failed to initialize programs:', error)
      throw error
    }
  }

  // Utility functions for PDA derivation
  static findProgramAddress(seeds: (string | Buffer | Uint8Array)[], programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      seeds.map((seed) => (typeof seed === 'string' ? Buffer.from(seed) : seed)),
      programId,
    )
  }

  static findPaymentAccount(): [PublicKey, number] {
    return this.findProgramAddress([PDA_SEEDS.PAYMENT], PROGRAM_IDS.SHOPSAGE_PAYMENT)
  }

  static findSessionAccount(sessionId: string): [PublicKey, number] {
    return this.findProgramAddress([PDA_SEEDS.SESSION, sessionId], PROGRAM_IDS.SHOPSAGE_SESSION)
  }

  static findExpertAccount(authority: PublicKey): [PublicKey, number] {
    return this.findProgramAddress([PDA_SEEDS.EXPERT, authority.toBuffer()], PROGRAM_IDS.SHOPSAGE_EXPERT)
  }

  // Payment program interactions
  async buildInitializePaymentTransaction(authority: PublicKey, consultationFee: number): Promise<Transaction> {
    if (!this.paymentProgram) {
      throw new Error('Payment program not initialized')
    }

    const [paymentAccount] = SolanaUtils.findPaymentAccount()

    const tx = await this.paymentProgram.methods
      .initializePayment(new BN(consultationFee))
      .accounts({
        paymentAccount,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .transaction()

    return tx
  }

  async buildProcessPaymentTransaction(
    shopper: PublicKey,
    shopperTokenAccount: PublicKey,
    expertTokenAccount: PublicKey,
    amount: number,
  ): Promise<Transaction> {
    if (!this.paymentProgram) {
      throw new Error('Payment program not initialized')
    }

    const [paymentAccount] = SolanaUtils.findPaymentAccount()

    const tx = await this.paymentProgram.methods
      .processConsultationPayment(new BN(amount))
      .accounts({
        paymentAccount,
        shopper,
        shopperTokenAccount,
        expertTokenAccount,
        platformTokenAccount: PLATFORM_CONFIG.PLATFORM_WALLET,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      })
      .transaction()

    return tx
  }

  // Session program interactions
  async buildCreateSessionTransaction(
    sessionId: string,
    expert: PublicKey,
    shopper: PublicKey,
    amount: number,
  ): Promise<Transaction> {
    if (!this.sessionProgram) {
      throw new Error('Session program not initialized')
    }

    const [sessionAccount] = SolanaUtils.findSessionAccount(sessionId)

    const tx = await this.sessionProgram.methods
      .createSession(sessionId, new BN(amount))
      .accounts({
        session: sessionAccount,
        expert,
        shopper,
        systemProgram: SystemProgram.programId,
      })
      .transaction()

    return tx
  }

  async buildStartSessionTransaction(sessionId: string, expert: PublicKey): Promise<Transaction> {
    if (!this.sessionProgram) {
      throw new Error('Session program not initialized')
    }

    const [sessionAccount] = SolanaUtils.findSessionAccount(sessionId)

    const tx = await this.sessionProgram.methods
      .startSession(sessionId)
      .accounts({
        session: sessionAccount,
        expert,
      })
      .transaction()

    return tx
  }

  async buildEndSessionTransaction(sessionId: string, expert: PublicKey): Promise<Transaction> {
    if (!this.sessionProgram) {
      throw new Error('Session program not initialized')
    }

    const [sessionAccount] = SolanaUtils.findSessionAccount(sessionId)

    const tx = await this.sessionProgram.methods
      .endSession(sessionId)
      .accounts({
        session: sessionAccount,
        expert,
      })
      .transaction()

    return tx
  }

  async buildCancelSessionTransaction(sessionId: string, shopper: PublicKey, expert: PublicKey): Promise<Transaction> {
    if (!this.sessionProgram) {
      throw new Error('Session program not initialized')
    }

    const [sessionAccount] = SolanaUtils.findSessionAccount(sessionId)

    const tx = await this.sessionProgram.methods
      .cancelSession(sessionId)
      .accounts({
        session: sessionAccount,
        shopper,
        expert,
      })
      .transaction()

    return tx
  }

  // Expert program interactions
  async buildRegisterExpertTransaction(
    authority: PublicKey,
    name: string,
    specialization: string,
    hourlyRate: number,
  ): Promise<Transaction> {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = SolanaUtils.findExpertAccount(authority)

    const tx = await this.expertProgram.methods
      .registerExpert(name, specialization, new BN(hourlyRate))
      .accounts({
        expert: expertAccount,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .transaction()

    return tx
  }

  async buildUpdateExpertStatusTransaction(authority: PublicKey, isOnline: boolean): Promise<Transaction> {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = SolanaUtils.findExpertAccount(authority)

    const tx = await this.expertProgram.methods
      .updateExpertStatus(isOnline)
      .accounts({
        expert: expertAccount,
        authority,
      })
      .transaction()

    return tx
  }

  // Utility functions for account fetching
  async getSessionAccount(sessionId: string) {
    if (!this.sessionProgram) {
      throw new Error('Session program not initialized')
    }

    const [sessionAccount] = SolanaUtils.findSessionAccount(sessionId)

    try {
      return await this.sessionProgram.account.sessionAccount.fetch(sessionAccount)
    } catch (error) {
      console.error('Failed to fetch session account:', error)
      return null
    }
  }

  async getExpertAccount(authority: PublicKey) {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = SolanaUtils.findExpertAccount(authority)

    try {
      return await this.expertProgram.account.expertAccount.fetch(expertAccount)
    } catch (error) {
      console.error('Failed to fetch expert account:', error)
      return null
    }
  }

  // Transaction execution with Mobile Wallet Adapter
  async executeTransaction(transaction: Transaction, description: string = 'ShopSage Transaction'): Promise<string> {
    try {
      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const fromPubkey = authResult.accounts[0].publicKey

        // Get latest blockhash
        const { blockhash } = await this.connection.getLatestBlockhash()

        // Set transaction details
        transaction.feePayer = fromPubkey
        transaction.recentBlockhash = blockhash

        // Sign and send transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        })

        const signature = await this.connection.sendRawTransaction(signedTransactions[0])

        // Wait for confirmation
        await this.connection.confirmTransaction(signature)

        return signature
      })
    } catch (error) {
      console.error('Transaction execution failed:', error)
      throw error
    }
  }

  // Helper functions
  lamportsToSol(lamports: number): number {
    return lamports / web3.LAMPORTS_PER_SOL
  }

  solToLamports(sol: number): number {
    return sol * web3.LAMPORTS_PER_SOL
  }

  async getAccountBalance(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return this.lamportsToSol(balance)
    } catch (error) {
      console.error('Failed to get account balance:', error)
      return 0
    }
  }
}

// Export singleton instance
export const solanaUtils = new SolanaUtils()
