import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { PublicKey, TransactionSignature } from '@solana/web3.js'
import { v4 as uuidv4 } from 'react-native-uuid'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { videoCallService } from './videoCallService'

export interface CreateSessionRequest {
  expertId: string
  expertWalletAddress: string
  sessionRate: number // in SOL
  startTime: string // ISO 8601 format
  duration?: number // in minutes, default 30
}

export interface SessionCreationResult {
  signature: TransactionSignature
  sessionId: string
  sessionAccount: PublicKey
  shopperPublicKey: PublicKey
  expertPublicKey: PublicKey
  amount: number // in lamports
  videoCallId?: string
}

export interface SessionStateUpdate {
  signature: TransactionSignature
  sessionId: string
  newStatus: 'pending' | 'active' | 'completed' | 'cancelled'
  updatedBy: PublicKey
}

export const sessionProgramService = {
  /**
   * Complete session creation workflow:
   * 1. Connect wallet
   * 2. Create session on-chain with payment escrow
   * 3. Initialize video call
   * 4. Return session details
   */
  async createSessionWithPayment(request: CreateSessionRequest): Promise<SessionCreationResult> {
    try {
      console.log('[SessionProgram] Starting session creation workflow...', request)

      return await transact(async (wallet) => {
        // Authorize wallet for session creation
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Session Creation',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const shopperPublicKey = authResult.accounts[0].publicKey
        const expertPublicKey = new PublicKey(request.expertWalletAddress)
        const sessionId = uuidv4().toString()
        const amountLamports = solanaUtils.solToLamports(request.sessionRate)

        console.log('[SessionProgram] Session details:', {
          sessionId,
          shopper: shopperPublicKey.toString(),
          expert: expertPublicKey.toString(),
          amount: `${request.sessionRate} SOL (${amountLamports} lamports)`
        })

        // Initialize Solana utils
        await solanaUtils.initializePrograms(shopperPublicKey)

        // Get session account PDA
        const [sessionAccount, bump] = solanaUtils.findSessionAccount(sessionId)
        console.log('[SessionProgram] Session account PDA:', sessionAccount.toString(), 'bump:', bump)

        // Build session creation transaction with payment escrow
        const transaction = await solanaUtils.buildCreateSessionTransaction(
          sessionId,
          expertPublicKey,
          shopperPublicKey,
          amountLamports
        )

        console.log('[SessionProgram] Session transaction built, requesting signature...')

        // Sign and send transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[SessionProgram] Session created on-chain successfully!', {
          signature,
          sessionAccount: sessionAccount.toString()
        })

        // Initialize video call after successful payment
        let videoCallId: string | undefined
        try {
          const videoCallResult = await videoCallService.createCall({
            participants: [
              { id: shopperPublicKey.toString(), role: 'shopper' },
              { id: expertPublicKey.toString(), role: 'expert' }
            ],
            sessionId,
            metadata: {
              sessionRate: request.sessionRate,
              expertId: request.expertId,
              duration: request.duration || 30
            }
          })
          
          videoCallId = videoCallResult.id
          console.log('[SessionProgram] Video call created:', videoCallId)
        } catch (videoError) {
          console.warn('[SessionProgram] Video call creation failed:', videoError)
          // Continue without video call - can be created later
        }

        return {
          signature,
          sessionId,
          sessionAccount,
          shopperPublicKey,
          expertPublicKey,
          amount: amountLamports,
          videoCallId
        }
      })
    } catch (error) {
      console.error('[SessionProgram] Failed to create session:', error)
      
      // Enhanced error handling
      if (error.message?.includes('User declined')) {
        throw new Error('Session creation cancelled by user')
      } else if (error.message?.includes('Insufficient funds')) {
        throw new Error('Insufficient SOL for session payment and transaction fees')
      } else if (error.message?.includes('Expert not available')) {
        throw new Error('Expert is currently not available for sessions')
      } else {
        throw new Error(`Session creation failed: ${error.message || 'Unknown error'}`)
      }
    }
  },

  /**
   * Start an active session (called by expert)
   */
  async startSession(sessionId: string): Promise<SessionStateUpdate> {
    try {
      console.log('[SessionProgram] Starting session:', sessionId)

      return await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Start Session',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const expertPublicKey = authResult.accounts[0].publicKey
        console.log('[SessionProgram] Expert starting session:', expertPublicKey.toString())

        await solanaUtils.initializePrograms(expertPublicKey)

        const transaction = await solanaUtils.buildStartSessionTransaction(sessionId, expertPublicKey)

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[SessionProgram] Session started successfully:', signature)

        return {
          signature,
          sessionId,
          newStatus: 'active' as const,
          updatedBy: expertPublicKey
        }
      })
    } catch (error) {
      console.error('[SessionProgram] Failed to start session:', error)
      throw new Error(`Failed to start session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * End a session (called by expert)
   */
  async endSession(sessionId: string): Promise<SessionStateUpdate> {
    try {
      console.log('[SessionProgram] Ending session:', sessionId)

      return await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage End Session',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const expertPublicKey = authResult.accounts[0].publicKey
        console.log('[SessionProgram] Expert ending session:', expertPublicKey.toString())

        await solanaUtils.initializePrograms(expertPublicKey)

        const transaction = await solanaUtils.buildEndSessionTransaction(sessionId, expertPublicKey)

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[SessionProgram] Session ended successfully:', signature)

        // End video call if exists
        try {
          await videoCallService.endCall(sessionId)
          console.log('[SessionProgram] Video call ended')
        } catch (videoError) {
          console.warn('[SessionProgram] Failed to end video call:', videoError)
        }

        return {
          signature,
          sessionId,
          newStatus: 'completed' as const,
          updatedBy: expertPublicKey
        }
      })
    } catch (error) {
      console.error('[SessionProgram] Failed to end session:', error)
      throw new Error(`Failed to end session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * Cancel a session (can be called by shopper or expert)
   */
  async cancelSession(sessionId: string): Promise<SessionStateUpdate> {
    try {
      console.log('[SessionProgram] Cancelling session:', sessionId)

      return await transact(async (wallet) => {
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Cancel Session',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const userPublicKey = authResult.accounts[0].publicKey
        console.log('[SessionProgram] User cancelling session:', userPublicKey.toString())

        await solanaUtils.initializePrograms(userPublicKey)

        // Get session participants from on-chain data
        const participants = await solanaUtils.getSessionParticipants(sessionId)
        if (!participants) {
          throw new Error('Session not found or unable to retrieve participants')
        }

        console.log('[SessionProgram] Session participants:', {
          shopper: participants.shopper.toString(),
          expert: participants.expert.toString(),
          currentUser: userPublicKey.toString()
        })

        // Verify that the current user is either the shopper or expert
        const isParticipant = participants.shopper.equals(userPublicKey) || participants.expert.equals(userPublicKey)
        if (!isParticipant) {
          throw new Error('Only session participants can cancel the session')
        }

        const transaction = await solanaUtils.buildCancelSessionTransaction(
          sessionId, 
          participants.shopper,
          participants.expert
        )

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[SessionProgram] Session cancelled successfully:', signature)

        // End video call if exists
        try {
          await videoCallService.endCall(sessionId)
          console.log('[SessionProgram] Video call ended due to cancellation')
        } catch (videoError) {
          console.warn('[SessionProgram] Failed to end video call:', videoError)
        }

        return {
          signature,
          sessionId,
          newStatus: 'cancelled' as const,
          updatedBy: userPublicKey
        }
      })
    } catch (error) {
      console.error('[SessionProgram] Failed to cancel session:', error)
      throw new Error(`Failed to cancel session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * Get session data from blockchain
   */
  async getSessionFromChain(sessionId: string): Promise<any> {
    try {
      console.log('[SessionProgram] Fetching session from chain:', sessionId)
      
      const [sessionAccount] = solanaUtils.findSessionAccount(sessionId)
      const sessionData = await solanaUtils.connection.getAccountInfo(sessionAccount)
      
      if (!sessionData) {
        console.log('[SessionProgram] Session not found on chain:', sessionId)
        return null
      }

      // Parse session data based on your program's account structure
      // This would need to be implemented based on your session program's data layout
      console.log('[SessionProgram] Session found on chain, data length:', sessionData.data.length)
      
      return {
        sessionId,
        account: sessionAccount.toString(),
        dataLength: sessionData.data.length,
        owner: sessionData.owner.toString(),
        lamports: sessionData.lamports
      }
    } catch (error) {
      console.error('[SessionProgram] Failed to get session from chain:', error)
      return null
    }
  },

  /**
   * Hybrid session creation - creates on chain and syncs with backend
   */
  async createSessionHybrid(request: CreateSessionRequest): Promise<{
    chainResult: SessionCreationResult;
    backendSession?: any;
  }> {
    try {
      console.log('[SessionProgram] Starting hybrid session creation...')

      // Create session on blockchain first
      const chainResult = await this.createSessionWithPayment(request)
      console.log('[SessionProgram] Blockchain session creation successful:', chainResult.signature)

      // Sync with backend
      let backendSession = null
      try {
        const { sessionService } = await import('./sessionService')
        
        backendSession = await sessionService.createSession({
          expertId: request.expertId,
          startTime: request.startTime,
          amount: request.sessionRate.toString(),
          // Include blockchain data
          sessionId: chainResult.sessionId,
          transactionHash: chainResult.signature,
          shopperWalletAddress: chainResult.shopperPublicKey.toString(),
          expertWalletAddress: chainResult.expertPublicKey.toString(),
          videoCallId: chainResult.videoCallId
        })

        console.log('[SessionProgram] Backend session sync successful')
      } catch (backendError) {
        console.warn('[SessionProgram] Backend session sync failed:', backendError)
        // Continue since blockchain is source of truth
      }

      return {
        chainResult,
        backendSession
      }
    } catch (error) {
      console.error('[SessionProgram] Failed to create session (hybrid):', error)
      throw error
    }
  }
}