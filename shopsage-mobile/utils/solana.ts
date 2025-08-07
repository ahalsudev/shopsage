import { AnchorProvider, BN, Program, web3 } from '@coral-xyz/anchor'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

import { AppConfig } from '../config/environment'
import { PDA_SEEDS, PLATFORM_CONFIG, getCurrentNetwork, getProgramIds } from '../constants/programs'
import { ShopsageExpert } from '../types/programs/shopsage-expert'
import { ShopsagePayment } from '../types/programs/shopsage-payment'
import { ShopsageSession } from '../types/programs/shopsage-session'

export class SolanaUtils {
  private connection: Connection
  private paymentProgram: Program<ShopsagePayment> | null = null
  private sessionProgram: Program<ShopsageSession> | null = null
  private expertProgram: Program<ShopsageExpert> | null = null
  private currentNetwork = getCurrentNetwork()
  private programIds = getProgramIds(this.currentNetwork)

  constructor() {
    // Use AppConfig for RPC endpoint, fallback to PLATFORM_CONFIG for compatibility
    const rpcEndpoint = AppConfig.blockchain.rpcUrl || PLATFORM_CONFIG.RPC_ENDPOINT
    this.connection = new Connection(rpcEndpoint, 'confirmed')
    
    console.log('[SolanaUtils] Constructor - current network:', this.currentNetwork)
    console.log('[SolanaUtils] Constructor - program IDs:', this.programIds)
    console.log('[SolanaUtils] Constructor - AppConfig blockchain:', AppConfig.blockchain)
  }

  // Initialize programs with wallet provider
  async initializePrograms(walletPublicKey: PublicKey): Promise<void> {
    try {
      console.log('[SolanaUtils] Initializing programs with walletPublicKey:', walletPublicKey.toString());
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
      console.log('[SolanaUtils] AnchorProvider created:', provider);
      console.log('[SolanaUtils] Program IDs before program initialization:', this.programIds);

            console.log('[SolanaUtils] Type of SHOPSAGE_EXPERT program ID:', typeof this.programIds.SHOPSAGE_EXPERT, this.programIds.SHOPSAGE_EXPERT instanceof PublicKey);
      
      try {
        console.log('[SolanaUtils] Initializing payment program...');
        console.log('[SolanaUtils] Payment program ID:', this.programIds.SHOPSAGE_PAYMENT);
        
        // Create a minimal working IDL that's compatible with Anchor v0.30.0
        const workingIDL = {
          "version": "0.1.0",
          "name": "shopsage_payment", 
          "instructions": [
            {
              "name": "initializePayment",
              "accounts": [
                {
                  "name": "paymentAccount",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "authority", 
                  "isMut": true,
                  "isSigner": true
                },
                {
                  "name": "systemProgram",
                  "isMut": false,
                  "isSigner": false
                }
              ],
              "args": [
                {
                  "name": "consultationFee",
                  "type": "u64"
                }
              ]
            },
            {
              "name": "processConsultationPayment",
              "accounts": [
                {
                  "name": "paymentAccount",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "shopper",
                  "isMut": true,
                  "isSigner": true
                },
                {
                  "name": "expert",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "platform",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "systemProgram",
                  "isMut": false,
                  "isSigner": false
                }
              ],
              "args": [
                {
                  "name": "amount",
                  "type": "u64"
                }
              ]
            }
          ],
          "accounts": [
            {
              "name": "PaymentAccount",
              "type": {
                "kind": "struct",
                "fields": [
                  {
                    "name": "authority",
                    "type": "publicKey"
                  },
                  {
                    "name": "consultationFee",
                    "type": "u64"
                  },
                  {
                    "name": "bump",
                    "type": "u8"
                  }
                ]
              }
            }
          ]
        };

        this.paymentProgram = new Program(
          workingIDL as any,
          this.programIds.SHOPSAGE_PAYMENT,
          provider
        )
        console.log('[SolanaUtils] Payment program initialized successfully');
      } catch (error) {
        console.error('[SolanaUtils] Failed to initialize payment program:', error);
        console.error('[SolanaUtils] Error details:', error.stack);
        throw error;
      }
      
      try {
        console.log('[SolanaUtils] Initializing session program...');
        
        // Create a minimal working IDL for session program
        const sessionWorkingIDL = {
          "version": "0.1.0",
          "name": "shopsage_session",
          "instructions": [
            {
              "name": "createSession",
              "accounts": [
                {
                  "name": "session",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "expert",
                  "isMut": false,
                  "isSigner": false
                },
                {
                  "name": "shopper",
                  "isMut": true,
                  "isSigner": true
                },
                {
                  "name": "systemProgram",
                  "isMut": false,
                  "isSigner": false
                }
              ],
              "args": [
                {
                  "name": "sessionId",
                  "type": "string"
                },
                {
                  "name": "amount",
                  "type": "u64"
                }
              ]
            }
          ],
          "accounts": [
            {
              "name": "SessionAccount",
              "type": {
                "kind": "struct",
                "fields": [
                  {
                    "name": "sessionId",
                    "type": "string"
                  },
                  {
                    "name": "expert",
                    "type": "publicKey"
                  },
                  {
                    "name": "shopper",
                    "type": "publicKey"
                  },
                  {
                    "name": "amount",
                    "type": "u64"
                  },
                  {
                    "name": "status",
                    "type": "u8"
                  },
                  {
                    "name": "startTime",
                    "type": "i64"
                  },
                  {
                    "name": "bump",
                    "type": "u8"
                  }
                ]
              }
            }
          ]
        };
        
        this.sessionProgram = new Program(
          sessionWorkingIDL as any,
          this.programIds.SHOPSAGE_SESSION,
          provider
        )
        console.log('[SolanaUtils] Session program initialized successfully');
      } catch (error) {
        console.error('[SolanaUtils] Failed to initialize session program:', error);
        throw error;
      }
      
      try {
        console.log('[SolanaUtils] Initializing expert program...');
        
        // Create a minimal working IDL for expert program
        const expertWorkingIDL = {
          "version": "0.1.0",
          "name": "shopsage_expert",
          "instructions": [
            {
              "name": "registerExpert",
              "accounts": [
                {
                  "name": "expert",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "authority",
                  "isMut": true,
                  "isSigner": true
                },
                {
                  "name": "systemProgram",
                  "isMut": false,
                  "isSigner": false
                }
              ],
              "args": [
                {
                  "name": "name",
                  "type": "string"
                },
                {
                  "name": "specialization",
                  "type": "string"
                },
                {
                  "name": "sessionRate",
                  "type": "u64"
                }
              ]
            },
            {
              "name": "updateExpertStatus",
              "accounts": [
                {
                  "name": "expert",
                  "isMut": true,
                  "isSigner": false
                },
                {
                  "name": "authority",
                  "isMut": false,
                  "isSigner": true
                }
              ],
              "args": [
                {
                  "name": "isOnline",
                  "type": "bool"
                }
              ]
            }
          ],
          "accounts": [
            {
              "name": "ExpertAccount",
              "type": {
                "kind": "struct",
                "fields": [
                  {
                    "name": "authority",
                    "type": "publicKey"
                  },
                  {
                    "name": "name",
                    "type": "string"
                  },
                  {
                    "name": "specialization",
                    "type": "string"
                  },
                  {
                    "name": "sessionRate",
                    "type": "u64"
                  },
                  {
                    "name": "rating",
                    "type": "u64"
                  },
                  {
                    "name": "totalConsultations",
                    "type": "u64"
                  },
                  {
                    "name": "isVerified",
                    "type": "bool"
                  },
                  {
                    "name": "isOnline",
                    "type": "bool"
                  },
                  {
                    "name": "bump",
                    "type": "u8"
                  }
                ]
              }
            }
          ]
        };
        
        this.expertProgram = new Program(
          expertWorkingIDL as any,
          this.programIds.SHOPSAGE_EXPERT,
          provider
        )
        console.log('[SolanaUtils] Expert program initialized successfully');
      } catch (error) {
        console.error('[SolanaUtils] Failed to initialize expert program:', error);
        throw error;
      }
      
      console.log('[SolanaUtils] All programs initialized. Program IDs:', this.programIds);
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

  findPaymentAccount(): [PublicKey, number] {
    return SolanaUtils.findProgramAddress([PDA_SEEDS.PAYMENT], this.programIds.SHOPSAGE_PAYMENT)
  }

  findSessionAccount(sessionId: string): [PublicKey, number] {
    return SolanaUtils.findProgramAddress([PDA_SEEDS.SESSION, sessionId], this.programIds.SHOPSAGE_SESSION)
  }

  findExpertAccount(authority: PublicKey): [PublicKey, number] {
    return SolanaUtils.findProgramAddress([PDA_SEEDS.EXPERT, authority.toBuffer()], this.programIds.SHOPSAGE_EXPERT)
  }

  // Payment program interactions
  async buildInitializePaymentTransaction(authority: PublicKey, consultationFee: number): Promise<Transaction> {
    if (!this.paymentProgram) {
      throw new Error('Payment program not initialized')
    }

    const [paymentAccount] = this.findPaymentAccount()

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
    expert: PublicKey,
    amount: number,
  ): Promise<Transaction> {
    if (!this.paymentProgram) {
      throw new Error('Payment program not initialized')
    }

    const [paymentAccount] = this.findPaymentAccount()

    const tx = await this.paymentProgram.methods
      .processConsultationPayment(new BN(amount))
      .accounts({
        paymentAccount,
        shopper,
        expert,
        platform: PLATFORM_CONFIG.PLATFORM_WALLET,
        systemProgram: SystemProgram.programId,
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

    const [sessionAccount] = this.findSessionAccount(sessionId)

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

    const [sessionAccount] = this.findSessionAccount(sessionId)

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

    const [sessionAccount] = this.findSessionAccount(sessionId)

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

    const [sessionAccount] = this.findSessionAccount(sessionId)

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
    sessionRate: number,
  ): Promise<Transaction> {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = this.findExpertAccount(authority)

    const tx = await this.expertProgram.methods
      .registerExpert(name, specialization, new BN(sessionRate))
      .accounts({
        expert: expertAccount,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .transaction()

    console.log('[SolanaUtils] Register Expert Transaction built:', JSON.stringify(tx.serializeMessage().toString('hex')));
    console.log('[SolanaUtils] Register Expert Transaction accounts:', tx.instructions[0].keys.map(key => key.pubkey.toString()));
    console.log('[SolanaUtils] Register Expert Transaction data:', tx.instructions[0].data.toString('hex'));

    return tx
  }

  async buildUpdateExpertStatusTransaction(authority: PublicKey, isOnline: boolean): Promise<Transaction> {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = this.findExpertAccount(authority)

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

    const [sessionAccount] = this.findSessionAccount(sessionId)

    try {
      return await this.sessionProgram.account.sessionAccount.fetch(sessionAccount)
    } catch (error) {
      console.error('Failed to fetch session account:', error)
      return null
    }
  }

  async getSessionParticipants(sessionId: string): Promise<{ shopper: PublicKey; expert: PublicKey } | null> {
    try {
      const sessionData = await this.getSessionAccount(sessionId)
      if (!sessionData) {
        return null
      }
      
      return {
        shopper: sessionData.shopper,
        expert: sessionData.expert
      }
    } catch (error) {
      console.error('Failed to get session participants:', error)
      return null
    }
  }

  async getExpertAccount(authority: PublicKey) {
    if (!this.expertProgram) {
      throw new Error('Expert program not initialized')
    }

    const [expertAccount] = this.findExpertAccount(authority)

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
          cluster: AppConfig.blockchain.cluster || PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: AppConfig.uri,
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

  getPublicKeyFromAddress(address: string): PublicKey {
    try {
      return new PublicKey(address)
    } catch (error) {
      console.error('Invalid public key address:', address, error)
      throw new Error(`Invalid public key address: ${address}`)
    }
  }

  getProgramIds(): { [key: string]: PublicKey } {
    console.log('[SolanaUtils] getProgramIds called, returning:', this.programIds)
    if (!this.programIds) {
      console.error('[SolanaUtils] Program IDs are undefined!')
      throw new Error('Program IDs not initialized properly')
    }
    return this.programIds
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

  async getAccountBalanceInLamports(publicKey: PublicKey): Promise<number> {
    try {
      const balance = await this.connection.getBalance(publicKey)
      return balance
    } catch (error) {
      console.error('Failed to get account balance:', error)
      return 0
    }
  }
}

// Export singleton instance
export const solanaUtils = new SolanaUtils()
