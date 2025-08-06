import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { dataProvider } from './dataProvider'

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
  /**
   * Process SOL-based consultation payment with platform fee distribution
   * 80% to expert, 20% to platform
   */
  async processConsultationPayment(params: {
    sessionId: string
    expertWalletAddress: string
    amount: number // in SOL
    sessionData?: any
  }): Promise<{
    signature: TransactionSignature
    expertAmount: number // in lamports
    platformAmount: number // in lamports
    totalAmount: number // in lamports
  }> {
    try {
      console.log('[PaymentService] Processing SOL consultation payment...', params)

      return await transact(async (wallet) => {
        // Authorize wallet for payment
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Payment',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const shopperPublicKey = authResult.accounts[0].publicKey
        const expertPublicKey = new PublicKey(params.expertWalletAddress)
        const totalLamports = solanaUtils.solToLamports(params.amount)

        // Calculate fee distribution
        const expertLamports = Math.floor(totalLamports * PLATFORM_CONFIG.EXPERT_COMMISSION_RATE)
        const platformLamports = totalLamports - expertLamports

        console.log('[PaymentService] Payment breakdown:', {
          total: `${params.amount} SOL (${totalLamports} lamports)`,
          expert: `${solanaUtils.lamportsToSol(expertLamports)} SOL (${expertLamports} lamports)`,
          platform: `${solanaUtils.lamportsToSol(platformLamports)} SOL (${platformLamports} lamports)`,
          shopper: shopperPublicKey.toString(),
          expert: expertPublicKey.toString()
        })

        // Initialize Solana utils
        await solanaUtils.initializePrograms(shopperPublicKey)

        // Build payment processing transaction
        const transaction = await solanaUtils.buildProcessPaymentTransaction(
          shopperPublicKey,
          expertPublicKey,
          totalLamports
        )

        console.log('[PaymentService] Payment transaction built, requesting signature...')

        // Sign and send transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[PaymentService] Payment processed successfully!', {
          signature,
          expertAmount: expertLamports,
          platformAmount: platformLamports
        })

        return {
          signature,
          expertAmount: expertLamports,
          platformAmount: platformLamports,
          totalAmount: totalLamports
        }
      })
    } catch (error) {
      console.error('[PaymentService] Failed to process consultation payment:', error)
      
      // Enhanced error handling
      if (error.message?.includes('User declined')) {
        throw new Error('Payment cancelled by user')
      } else if (error.message?.includes('Insufficient funds')) {
        throw new Error('Insufficient SOL for payment and transaction fees')
      } else {
        throw new Error(`Payment failed: ${error.message || 'Unknown error'}`)
      }
    }
  },

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
            uri: 'https://shopsage.site',
            icon: 'favicon.ico',
          },
        })

        const fromPubkey = solanaUtils.getPublicKeyFromAddress(authResult.accounts[0].address)
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
            uri: 'https://shopsage.site',
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
            uri: 'https://shopsage.site',
            icon: 'favicon.ico',
          },
        })

        const shopperPubkey = solanaUtils.getPublicKeyFromAddress(authResult.accounts[0].address)
        const expertPubkey = new PublicKey(params.expertWalletAddress)

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(shopperPubkey)

        // Build process payment transaction
        const transaction = await solanaUtils.buildProcessPaymentTransaction(
          shopperPubkey,
          expertPubkey,
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
            uri: 'https://shopsage.site',
            icon: 'favicon.ico',
          },
        })

        const shopperPubkey = solanaUtils.getPublicKeyFromAddress(authResult.accounts[0].address)
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
            uri: 'https://shopsage.site',
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
            uri: 'https://shopsage.site',
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

  /**
   * Enhanced payment history with blockchain transaction tracking
   */
  async getEnhancedPaymentHistory(walletAddress?: string): Promise<{
    payments: PaymentWithDetails[]
    blockchainTransactions: any[]
    summary: {
      totalPaid: number
      totalReceived: number
      transactionCount: number
      platformFeesTotal: number
    }
  }> {
    try {
      console.log('[PaymentService] Fetching enhanced payment history...')

      // Get backend payment history
      const backendPayments = await this.getPaymentHistory()

      // Get blockchain transaction history if wallet address provided
      let blockchainTransactions: any[] = []
      if (walletAddress) {
        blockchainTransactions = await this.getWalletTransactionHistory(walletAddress)
      }

      // Calculate summary
      const summary = {
        totalPaid: 0,
        totalReceived: 0,
        transactionCount: backendPayments.length,
        platformFeesTotal: 0
      }

      for (const payment of backendPayments) {
        const amount = parseFloat(payment.amount)
        // Assume if payment has a transaction hash, user was the payer
        if (payment.transactionHash) {
          summary.totalPaid += amount
          summary.platformFeesTotal += amount * PLATFORM_CONFIG.PLATFORM_COMMISSION_RATE
        } else {
          summary.totalReceived += amount * PLATFORM_CONFIG.EXPERT_COMMISSION_RATE
        }
      }

      console.log('[PaymentService] Payment history summary:', summary)

      return {
        payments: backendPayments,
        blockchainTransactions,
        summary
      }
    } catch (error) {
      console.error('[PaymentService] Failed to get enhanced payment history:', error)
      throw new Error('Failed to load payment history')
    }
  },

  /**
   * Get transaction history for a specific wallet from Solana blockchain
   */
  async getWalletTransactionHistory(walletAddress: string, limit: number = 50): Promise<any[]> {
    try {
      const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)
      const publicKey = new PublicKey(walletAddress)

      console.log(`[PaymentService] Fetching transaction history for wallet: ${walletAddress}`)

      // Get confirmed signature for this wallet
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit })

      // Get transaction details for each signature
      const transactions = await Promise.all(
        signatures.map(async (signatureInfo) => {
          try {
            const transaction = await connection.getTransaction(signatureInfo.signature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            })

            if (!transaction) return null

            // Parse transaction for ShopSage-related activity
            const isShopSageTransaction = this.isShopSageTransaction(transaction)

            return {
              signature: signatureInfo.signature,
              slot: signatureInfo.slot,
              blockTime: signatureInfo.blockTime,
              confirmationStatus: signatureInfo.confirmationStatus,
              err: signatureInfo.err,
              isShopSageTransaction,
              transaction: isShopSageTransaction ? transaction : null
            }
          } catch (error) {
            console.warn(`[PaymentService] Failed to get transaction ${signatureInfo.signature}:`, error)
            return null
          }
        })
      )

      const validTransactions = transactions.filter(Boolean)
      console.log(`[PaymentService] Found ${validTransactions.length} transactions for wallet`)

      return validTransactions
    } catch (error) {
      console.error('[PaymentService] Failed to get wallet transaction history:', error)
      return []
    }
  },

  /**
   * Check if a transaction is related to ShopSage programs
   */
  isShopSageTransaction(transaction: any): boolean {
    if (!transaction?.transaction?.message) return false

    const programIds = solanaUtils.getProgramIds()
    const shopsageProgramIds = Object.values(programIds).map(id => id.toString())

    // Check if any instruction involves our programs
    const instructions = transaction.transaction.message.instructions || []
    return instructions.some((instruction: any) => {
      const programId = transaction.transaction.message.accountKeys[instruction.programIdIndex]?.toString()
      return shopsageProgramIds.includes(programId || '')
    })
  },

  /**
   * Track payment status on blockchain
   */
  async trackPaymentStatus(transactionSignature: string): Promise<{
    status: 'pending' | 'confirmed' | 'failed'
    confirmations: number
    blockTime?: number
    fee?: number
  }> {
    try {
      const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)
      
      console.log(`[PaymentService] Tracking payment status: ${transactionSignature}`)

      // Get transaction details
      const transaction = await connection.getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      })

      if (!transaction) {
        return {
          status: 'pending',
          confirmations: 0
        }
      }

      // Get current slot to calculate confirmations
      const currentSlot = await connection.getSlot('confirmed')
      const confirmations = transaction.slot ? currentSlot - transaction.slot : 0

      const status = transaction.meta?.err ? 'failed' : 'confirmed'
      
      console.log(`[PaymentService] Payment status:`, {
        signature: transactionSignature,
        status,
        confirmations,
        slot: transaction.slot
      })

      return {
        status,
        confirmations,
        blockTime: transaction.blockTime || undefined,
        fee: transaction.meta?.fee
      }
    } catch (error) {
      console.error('[PaymentService] Failed to track payment status:', error)
      return {
        status: 'pending',
        confirmations: 0
      }
    }
  },
}
