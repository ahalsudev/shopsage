import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import { dataProvider } from './dataProvider'
import { solanaUtils } from '../utils/solana'

export interface ProcessPaymentRequest {
  sessionId: string
  transactionHash: string
}

export interface ProcessPaymentResponse {
  payment: {
    id: string
    sessionId: string
    amount: string
    status: 'pending' | 'completed' | 'failed'
    transactionHash?: string
    createdAt: string
    updatedAt: string
  }
  session: {
    id: string
    expertId: string
    shopperId: string
    status: string
    amount: string
    paymentStatus: 'pending' | 'completed' | 'failed'
    transactionHash?: string
  }
}

export interface PaymentWithDetails {
  id: string
  sessionId: string
  amount: string
  status: 'pending' | 'completed' | 'failed'
  transactionHash?: string
  expertName: string
  expertSpecialization: string
  sessionStartTime: string
  createdAt: string
  updatedAt: string
}

export interface PaymentHistoryResponse {
  payments: PaymentWithDetails[]
}

export interface SolanaPaymentParams {
  expertWalletAddress: string
  amount: number // in SOL
  memo?: string
}

export interface ProgramPaymentParams {
  sessionId: string
  expertWalletAddress: string
  amount: number // in SOL
  shopperTokenAccount?: string
  expertTokenAccount?: string
}

export const paymentService = {
  async processPayment(paymentData: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    try {
      const response = await dataProvider.processPayment({
        sessionId: paymentData.sessionId,
        transactionHash: paymentData.transactionHash,
      })

      return {
        payment: {
          id: response.payment.id,
          sessionId: response.payment.session_id,
          amount: response.payment.amount,
          status: response.payment.status,
          transactionHash: response.payment.transaction_hash,
          createdAt: response.payment.created_at,
          updatedAt: response.payment.updated_at,
        },
        session: {
          id: response.session.id,
          expertId: response.session.expert_id,
          shopperId: response.session.shopper_id,
          status: response.session.status,
          amount: response.session.amount,
          paymentStatus: response.session.payment_status,
          transactionHash: response.session.transaction_hash,
        },
      }
    } catch (error) {
      throw error
    }
  },

  async getPaymentHistory(): Promise<PaymentWithDetails[]> {
    try {
      return await dataProvider.getPaymentHistory()
    } catch (error) {
      throw error
    }
  },

  async createSolanaPayment(params: SolanaPaymentParams): Promise<string> {
    try {
      // Convert SOL to lamports
      const lamports = params.amount * LAMPORTS_PER_SOL

      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'ShopSage',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const fromPubkey = authResult.accounts[0].publicKey
        const toPubkey = new PublicKey(params.expertWalletAddress)

        // Create connection to Solana devnet
        const connection = new Connection('https://api.devnet.solana.com')

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash()

        // Create transfer transaction
        const transaction = new Transaction({
          feePayer: fromPubkey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          }),
        )

        // Add memo if provided
        if (params.memo) {
          const { TransactionInstruction } = await import('@solana/web3.js')
          transaction.add(
            new TransactionInstruction({
              keys: [],
              programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
              data: Buffer.from(params.memo, 'utf-8'),
            }),
          )
        }

        // Sign and send transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        })

        const signature = await connection.sendRawTransaction(signedTransactions[0])

        // Wait for confirmation
        await connection.confirmTransaction(signature)

        return signature
      })
    } catch (error) {
      console.error('Solana payment error:', error)
      throw new Error('Failed to process Solana payment')
    }
  },

  async verifyPayment(transactionHash: string, expectedAmount: string): Promise<boolean> {
    try {
      const connection = new Connection('https://api.devnet.solana.com')

      // Get transaction details
      const transaction = await connection.getTransaction(transactionHash, {
        commitment: 'confirmed',
      })

      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Verify transaction amount (basic verification)
      // In a production app, you'd want more thorough verification
      const expectedLamports = parseFloat(expectedAmount) * LAMPORTS_PER_SOL

      // Check if transaction contains a transfer of approximately the right amount
      const hasValidTransfer = transaction.transaction.message.instructions.some((instruction) => {
        // This is a simplified check - in production you'd parse the instruction more carefully
        return instruction.programId.toString() === SystemProgram.programId.toString()
      })

      return hasValidTransfer && transaction.meta?.err === null
    } catch (error) {
      console.error('Payment verification error:', error)
      return false
    }
  },

  async calculateNetworkFee(): Promise<number> {
    try {
      const connection = new Connection('https://api.devnet.solana.com')
      const recentBlockhash = await connection.getLatestBlockhash()

      // Create a dummy transaction to estimate fee
      const transaction = new Transaction({
        recentBlockhash: recentBlockhash.blockhash,
        feePayer: new PublicKey('11111111111111111111111111111112'), // Dummy address
      }).add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey('11111111111111111111111111111112'),
          toPubkey: new PublicKey('11111111111111111111111111111113'),
          lamports: 1000000, // 0.001 SOL
        }),
      )

      const fee = await connection.getFeeForMessage(transaction.compileMessage(), 'confirmed')

      return (fee?.value || 5000) / LAMPORTS_PER_SOL // Default to 0.000005 SOL if unable to get fee
    } catch (error) {
      console.error('Fee calculation error:', error)
      return 0.000005 // Default network fee
    }
  },

  async getRecommendedGasPrice(): Promise<number> {
    // Solana doesn't have gas prices like Ethereum, but we can return the base fee
    return await this.calculateNetworkFee()
  },

  formatSolAmount(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(6)
  },

  formatUsdAmount(solAmount: number, solPriceUsd: number): string {
    return (solAmount * solPriceUsd).toFixed(2)
  },

  async getSolPrice(): Promise<number> {
    try {
      // You might want to use a different price API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      const data = await response.json()
      return data.solana?.usd || 0
    } catch (error) {
      console.error('Failed to get SOL price:', error)
      return 0
    }
  },

  // New program-integrated payment methods
  async initializePaymentProgram(consultationFee: number): Promise<string> {
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

        const authority = authResult.accounts[0].publicKey

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(authority)

        // Build initialize payment transaction
        const transaction = await solanaUtils.buildInitializePaymentTransaction(
          authority,
          solanaUtils.solToLamports(consultationFee),
        )

        return await solanaUtils.executeTransaction(transaction, 'Initialize Payment Program')
      })
    } catch (error) {
      console.error('Failed to initialize payment program:', error)
      throw new Error('Failed to initialize payment program')
    }
  },

  async processConsultationPayment(params: ProgramPaymentParams): Promise<string> {
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

        const shopperPubkey = authResult.accounts[0].publicKey
        const expertPubkey = new PublicKey(params.expertWalletAddress)

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(shopperPubkey)

        // For now, we'll use native SOL transfer
        // In the future, you can implement SPL token support
        const shopperTokenAccount = params.shopperTokenAccount
          ? new PublicKey(params.shopperTokenAccount)
          : shopperPubkey

        const expertTokenAccount = params.expertTokenAccount ? new PublicKey(params.expertTokenAccount) : expertPubkey

        // Build process payment transaction
        const transaction = await solanaUtils.buildProcessPaymentTransaction(
          shopperPubkey,
          shopperTokenAccount,
          expertTokenAccount,
          solanaUtils.solToLamports(params.amount),
        )

        return await solanaUtils.executeTransaction(transaction, 'Process Consultation Payment')
      })
    } catch (error) {
      console.error('Failed to process consultation payment:', error)
      throw new Error('Failed to process consultation payment')
    }
  },

  async createSessionWithPayment(
    sessionId: string,
    expertWalletAddress: string,
    amount: number,
  ): Promise<{ sessionTxId: string; paymentTxId?: string }> {
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

        const shopperPubkey = authResult.accounts[0].publicKey
        const expertPubkey = new PublicKey(expertWalletAddress)

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(shopperPubkey)

        // First, create the session on-chain
        const sessionTransaction = await solanaUtils.buildCreateSessionTransaction(
          sessionId,
          expertPubkey,
          shopperPubkey,
          solanaUtils.solToLamports(amount),
        )

        const sessionTxId = await solanaUtils.executeTransaction(sessionTransaction, 'Create Session')

        // For now, return only session transaction
        // Payment will be processed separately when session starts
        return { sessionTxId }
      })
    } catch (error) {
      console.error('Failed to create session with payment:', error)
      throw new Error('Failed to create session')
    }
  },

  async startSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    try {
      return await transact(async (wallet) => {
        // Authorize the wallet (expert in this case)
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const expertPubkey = authResult.accounts[0].publicKey

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(expertPubkey)

        // Build start session transaction
        const transaction = await solanaUtils.buildStartSessionTransaction(sessionId, expertPubkey)

        return await solanaUtils.executeTransaction(transaction, 'Start Session')
      })
    } catch (error) {
      console.error('Failed to start session on-chain:', error)
      throw new Error('Failed to start session')
    }
  },

  async endSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    try {
      return await transact(async (wallet) => {
        // Authorize the wallet (expert in this case)
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const expertPubkey = authResult.accounts[0].publicKey

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(expertPubkey)

        // Build end session transaction
        const transaction = await solanaUtils.buildEndSessionTransaction(sessionId, expertPubkey)

        return await solanaUtils.executeTransaction(transaction, 'End Session')
      })
    } catch (error) {
      console.error('Failed to end session on-chain:', error)
      throw new Error('Failed to end session')
    }
  },

  async getSessionFromChain(sessionId: string): Promise<any> {
    try {
      // This doesn't require wallet authorization for reading
      const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)

      // We need to initialize with a dummy public key for reading
      const dummyPubkey = new PublicKey('11111111111111111111111111111112')
      await solanaUtils.initializePrograms(dummyPubkey)

      return await solanaUtils.getSessionAccount(sessionId)
    } catch (error) {
      console.error('Failed to get session from chain:', error)
      return null
    }
  },

  async getExpertFromChain(expertWalletAddress: string): Promise<any> {
    try {
      // This doesn't require wallet authorization for reading
      const expertPubkey = new PublicKey(expertWalletAddress)

      // We need to initialize with a dummy public key for reading
      const dummyPubkey = new PublicKey('11111111111111111111111111111112')
      await solanaUtils.initializePrograms(dummyPubkey)

      return await solanaUtils.getExpertAccount(expertPubkey)
    } catch (error) {
      console.error('Failed to get expert from chain:', error)
      return null
    }
  },
}
