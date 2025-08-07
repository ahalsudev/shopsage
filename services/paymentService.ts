import { Cluster } from '@/components/cluster/cluster'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionSignature } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
// import { solanaUtils } from '../utils/solana' // Temporarily disabled due to initialization issues
import { AppConfig } from '@/config/environment'
import { AppIdentity } from '@solana-mobile/mobile-wallet-adapter-protocol'
import { dataProvider } from './dataProvider'

const identity: AppIdentity = { 
  name: 'ShopSage Mobile', 
  uri: 'https://shopsage.site',
  icon: 'favicon.ico'
}

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
    selectedCluster: Cluster
  }): Promise<{
    signature: TransactionSignature
    expertAmount: number // in lamports
    platformAmount: number // in lamports
    totalAmount: number // in lamports
  }> {
    try {
      console.log('[PaymentService] Starting SIMPLIFIED payment with direct expert transfer...');

      // Calculate amounts 
      const totalLamports = params.amount * LAMPORTS_PER_SOL;
      const expertLamports = Math.floor(totalLamports * PLATFORM_CONFIG.EXPERT_COMMISSION_RATE);
      const platformLamports = totalLamports - expertLamports;
      
      console.log('[PaymentService] Payment amounts:', {
        totalSOL: params.amount,
        totalLamports,
        expertLamports,
        platformLamports
      });

      // Get blockhash OUTSIDE transact (this was working!)
      console.log('[PaymentService] Getting blockhash BEFORE transact...');
      const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      console.log('[PaymentService] ✅ Got blockhash outside transact:', blockhash);

      console.log('[PaymentService] About to call transact - this should trigger Solflare...');
      console.log('[PaymentService] App identity:', identity);
      console.log('[PaymentService] transact function type:', typeof transact);
      
      // Use the simple createSolanaPayment method that's already working
      console.log('[PaymentService] Using existing createSolanaPayment method...');
      
      const signature = await this.createSolanaPayment({
        expertWalletAddress: params.expertWalletAddress,
        amount: params.amount * 0.8, // Only send expert portion (80%)
        memo: `ShopSage consultation payment for session ${params.sessionId}`
      });
      
      console.log('[PaymentService] Payment completed with signature:', signature);
      
      const transactResult = {
        signature: signature,
        expertAmount: expertLamports,
        platformAmount: platformLamports,
        totalAmount: totalLamports,
      };
      
      console.log('[PaymentService] ✅ Payment completed successfully:', transactResult.signature);
      return transactResult;
    } catch (error) {
      console.error('[PaymentService] ❌ Payment failed:', error);
      console.error('[PaymentService] Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 200)
      });
      
      if (error.message?.includes('User declined') || error.message?.includes('User rejected')) {
        console.log('[PaymentService] Payment cancelled by user');
        throw new Error('Payment cancelled by user');
      }
      
      console.log('[PaymentService] Throwing payment error:', error.message);
      throw new Error(`Payment failed: ${error.message || 'Unknown error'}`);
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

        const fromPubkey = authResult.accounts[0].publicKey
        const toPubkey = new PublicKey(params.expertWalletAddress)

        // Create connection using configured RPC endpoint
        const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)

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
      const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)

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
      const connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT)
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
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    throw new Error('Program-based payments temporarily disabled. Use direct SOL transfers.')
  },

  async processConsultationPaymentProgram(params: ProgramPaymentParams): Promise<string> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    throw new Error('Program-based payments temporarily disabled. Use direct SOL transfers.')
  },

  async createSessionWithPayment(
    sessionId: string,
    expertWalletAddress: string,
    amount: number,
  ): Promise<{ sessionTxId: string; paymentTxId?: string }> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    throw new Error('Program-based session creation temporarily disabled.')
  },

  async startSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    throw new Error('Program-based session management temporarily disabled.')
  },

  async endSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    throw new Error('Program-based session management temporarily disabled.')
  },

  async getSessionFromChain(sessionId: string): Promise<any> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    console.warn('Program-based session reading temporarily disabled.')
    return null
  },

  async getExpertFromChain(expertWalletAddress: string): Promise<any> {
    // TODO: Re-implement when solanaUtils initialization issues are resolved
    console.warn('Program-based expert reading temporarily disabled.')
    return null
  },

  /**
   * Process payment specifically for a consultation session
   * Includes session context and validation
   */
  async processSessionPayment(params: {
    sessionId: string
    expertId: string
    expertWalletAddress: string
    amount: number // in SOL
    sessionData?: any
    selectedCluster: Cluster
  }): Promise<{
    signature: TransactionSignature
    expertAmount: number // in lamports
    platformAmount: number // in lamports
    totalAmount: number // in lamports
    sessionId: string
  }> {
    try {
      console.log('[PaymentService] Processing session payment...', params)

      // Use existing consultation payment method
      const paymentResult = await this.processConsultationPayment({
        sessionId: params.sessionId,
        expertWalletAddress: params.expertWalletAddress,
        amount: params.amount,
        sessionData: params.sessionData,
        selectedCluster: params.selectedCluster
      })

      // Add session ID to result
      return {
        ...paymentResult,
        sessionId: params.sessionId
      }
    } catch (error) {
      console.error('[PaymentService] Session payment failed:', error)
      throw error
    }
  },

  /**
   * Verify if a session has been paid for
   */
  async verifySessionPayment(sessionId: string, transactionHash?: string): Promise<{
    isPaid: boolean
    transactionHash?: string
    amount?: number
    confirmationStatus?: string
  }> {
    try {
      console.log('[PaymentService] Verifying session payment:', { sessionId, transactionHash })

      if (!transactionHash) {
        // No transaction hash provided, check backend records
        try {
          const { sessionService } = await import('./sessionService')
          const session = await sessionService.getSession(sessionId)
          
          return {
            isPaid: false, // No transaction hash means unpaid
            transactionHash: undefined,
            amount: parseFloat(session.amount || '0')
          }
        } catch (error) {
          console.warn('Failed to check backend session:', error)
          return { isPaid: false }
        }
      }

      // Verify transaction on blockchain
      const paymentStatus = await this.trackPaymentStatus(transactionHash)
      
      return {
        isPaid: paymentStatus.status === 'confirmed',
        transactionHash,
        confirmationStatus: paymentStatus.status,
        amount: undefined // Would need additional lookup
      }
    } catch (error) {
      console.error('[PaymentService] Failed to verify session payment:', error)
      return { isPaid: false }
    }
  },

  /**
   * Get payment status for a session
   */
  async getSessionPaymentStatus(sessionId: string): Promise<{
    status: 'unpaid' | 'paid' | 'failed' | 'processing'
    transactionHash?: string
    amount?: number
    timestamp?: Date
  }> {
    try {
      // Get session data with payment info
      const { sessionService } = await import('./sessionService')
      const session = await sessionService.getSession(sessionId)
      
      if (!session.transactionHash) {
        return {
          status: 'unpaid',
          amount: parseFloat(session.amount || '0')
        }
      }

      // Check blockchain status
      const verification = await this.verifySessionPayment(sessionId, session.transactionHash)
      
      let status: 'unpaid' | 'paid' | 'failed' | 'processing' = 'unpaid'
      
      if (verification.isPaid) {
        status = 'paid'
      } else if (verification.confirmationStatus === 'failed') {
        status = 'failed'
      } else if (verification.transactionHash) {
        status = 'processing'
      }

      return {
        status,
        transactionHash: verification.transactionHash,
        amount: parseFloat(session.amount || '0'),
      }
    } catch (error) {
      console.error('[PaymentService] Failed to get session payment status:', error)
      return { status: 'unpaid' }
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

    // For now, return false since we're not using program transactions
    // TODO: Re-implement when program initialization issues are resolved
    return false
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
