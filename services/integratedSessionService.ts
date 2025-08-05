import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { PublicKey, TransactionSignature } from '@solana/web3.js'
import { v4 as uuidv4 } from 'react-native-uuid'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { sessionService } from './sessionService'
import { paymentService } from './paymentService'
import { videoCallService } from './videoCallService'
import { sessionStateSyncService } from './sessionStateSyncService'
import { log } from '../config/environment'

export interface SessionCreationRequest {
  expertId: string
  expertWalletAddress: string
  expertName: string
  expertSpecialization: string
  sessionRate: number // in SOL
  startTime: string // ISO 8601 format
  duration?: number // in minutes, default 30
  shopperNote?: string
}

export interface SessionCreationResult {
  // Blockchain data
  signature: TransactionSignature
  sessionId: string
  sessionAccount: PublicKey
  shopperPublicKey: PublicKey
  expertPublicKey: PublicKey
  amount: number // in lamports
  
  // Backend data
  backendSessionId?: string
  
  // Video call data
  videoCallId?: string
  videoCallCredentials?: any
  
  // Status
  success: boolean
  errors: string[]
}

export interface SessionStartResult {
  signature: TransactionSignature
  sessionId: string
  status: 'active'
  videoCallReady: boolean
  videoCallId?: string
}

/**
 * Integrated Session Service - Combines blockchain, backend, and video calling
 */
export const integratedSessionService = {
  /**
   * Complete session creation workflow
   * 1. Connect wallet (shopper)
   * 2. Create session on blockchain with payment escrow
   * 3. Sync with backend
   * 4. Initialize video call
   * 5. Start state monitoring
   */
  async createSession(request: SessionCreationRequest): Promise<SessionCreationResult> {
    log.info('[IntegratedSession] Starting complete session creation...', {
      expertId: request.expertId,
      sessionRate: request.sessionRate,
      expertWallet: request.expertWalletAddress
    })

    const errors: string[] = []
    let signature: TransactionSignature = ''
    let sessionId = ''
    let sessionAccount: PublicKey
    let shopperPublicKey: PublicKey
    let expertPublicKey: PublicKey
    let amount = 0
    let backendSessionId: string | undefined
    let videoCallId: string | undefined

    try {
      // Step 1: Blockchain session creation with Mobile Wallet Adapter
      const blockchainResult = await transact(async (wallet) => {
        log.info('[IntegratedSession] Authorizing wallet for session creation...')
        
        // Authorize wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Session Creation',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const shopperPubKey = authResult.accounts[0].publicKey
        const expertPubKey = new PublicKey(request.expertWalletAddress)
        const sessionUuid = uuidv4().toString()
        const amountLamports = solanaUtils.solToLamports(request.sessionRate)

        log.info('[IntegratedSession] Creating session on blockchain...', {
          sessionId: sessionUuid,
          shopper: shopperPubKey.toString(),
          expert: expertPubKey.toString(),
          amount: `${request.sessionRate} SOL (${amountLamports} lamports)`
        })

        // Initialize Solana utils
        await solanaUtils.initializePrograms(shopperPubKey)

        // Get session account PDA
        const [sessionAcc, bump] = solanaUtils.findSessionAccount(sessionUuid)
        log.info('[IntegratedSession] Session PDA:', sessionAcc.toString(), 'bump:', bump)

        // Build session creation transaction
        const transaction = await solanaUtils.buildCreateSessionTransaction(
          sessionUuid,
          expertPubKey,
          shopperPubKey,
          amountLamports
        )

        log.info('[IntegratedSession] Requesting transaction signature...')

        // Sign and send transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const txSignature = signatures[0]
        log.info('[IntegratedSession] Blockchain session created successfully!', {
          signature: txSignature,
          sessionAccount: sessionAcc.toString()
        })

        return {
          signature: txSignature,
          sessionId: sessionUuid,
          sessionAccount: sessionAcc,
          shopperPublicKey: shopperPubKey,
          expertPublicKey: expertPubKey,
          amount: amountLamports
        }
      })

      // Update our variables with blockchain results
      signature = blockchainResult.signature
      sessionId = blockchainResult.sessionId
      sessionAccount = blockchainResult.sessionAccount
      shopperPublicKey = blockchainResult.shopperPublicKey
      expertPublicKey = blockchainResult.expertPublicKey
      amount = blockchainResult.amount

      log.info('[IntegratedSession] Step 1 ✅ Blockchain session created')

      // Step 2: Sync with backend
      try {
        log.info('[IntegratedSession] Step 2: Syncing with backend...')
        
        const backendSession = await sessionService.createSession({
          expertId: request.expertId,
          startTime: request.startTime,
          amount: request.sessionRate.toString(),
          // Add blockchain context
          sessionId: sessionId,
          transactionHash: signature,
          shopperWalletAddress: shopperPublicKey.toString(),
          expertWalletAddress: expertPublicKey.toString(),
        } as any)

        backendSessionId = backendSession.id
        log.info('[IntegratedSession] Step 2 ✅ Backend sync successful:', backendSessionId)
      } catch (backendError) {
        log.error('[IntegratedSession] Step 2 ⚠️ Backend sync failed:', backendError)
        errors.push(`Backend sync failed: ${backendError.message}`)
        // Continue - blockchain is source of truth
      }

      // Step 3: Initialize video call
      try {
        log.info('[IntegratedSession] Step 3: Initializing video call...')
        
        const videoCall = await videoCallService.createCall({
          participants: [
            { id: shopperPublicKey.toString(), role: 'shopper' },
            { id: expertPublicKey.toString(), role: 'expert' }
          ],
          sessionId: sessionId,
          metadata: {
            sessionRate: request.sessionRate,
            expertId: request.expertId,
            expertName: request.expertName,
            duration: request.duration || 30
          }
        })

        videoCallId = videoCall.id
        log.info('[IntegratedSession] Step 3 ✅ Video call initialized:', videoCallId)
      } catch (videoError) {
        log.error('[IntegratedSession] Step 3 ⚠️ Video call initialization failed:', videoError)
        errors.push(`Video call setup failed: ${videoError.message}`)
        // Continue - video can be set up later
      }

      // Step 4: Start state monitoring
      try {
        log.info('[IntegratedSession] Step 4: Starting state monitoring...')
        sessionStateSyncService.startMonitoring(sessionId)
        log.info('[IntegratedSession] Step 4 ✅ State monitoring started')
      } catch (monitorError) {
        log.error('[IntegratedSession] Step 4 ⚠️ State monitoring failed:', monitorError)
        errors.push(`State monitoring failed: ${monitorError.message}`)
      }

      const result: SessionCreationResult = {
        signature,
        sessionId,
        sessionAccount,
        shopperPublicKey,
        expertPublicKey,
        amount,
        backendSessionId,
        videoCallId,
        success: true,
        errors
      }

      log.info('[IntegratedSession] ✅ Session creation completed successfully!', {
        sessionId,
        signature,
        backendSynced: !!backendSessionId,
        videoCallReady: !!videoCallId,
        errorsCount: errors.length
      })

      return result

    } catch (error) {
      log.error('[IntegratedSession] ❌ Session creation failed:', error)
      
      // Enhanced error handling
      let errorMessage = 'Unknown error'
      if (error.message?.includes('User declined')) {
        errorMessage = 'Session creation cancelled by user'
      } else if (error.message?.includes('Insufficient funds')) {
        errorMessage = 'Insufficient SOL for session payment and transaction fees'
      } else if (error.message?.includes('Expert not available')) {
        errorMessage = 'Expert is currently not available for sessions'
      } else {
        errorMessage = error.message || 'Session creation failed'
      }

      errors.push(errorMessage)

      return {
        signature: '',
        sessionId: '',
        sessionAccount: new PublicKey('11111111111111111111111111111112'),
        shopperPublicKey: new PublicKey('11111111111111111111111111111112'),
        expertPublicKey: new PublicKey('11111111111111111111111111111112'),
        amount: 0,
        success: false,
        errors
      }
    }
  },

  /**
   * Start a session (called by expert)
   */
  async startSession(sessionId: string): Promise<SessionStartResult> {
    log.info('[IntegratedSession] Starting session...', { sessionId })

    try {
      return await transact(async (wallet) => {
        // Authorize expert wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Start Session',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const expertPublicKey = authResult.accounts[0].publicKey
        log.info('[IntegratedSession] Expert starting session:', expertPublicKey.toString())

        // Update blockchain state
        await solanaUtils.initializePrograms(expertPublicKey)
        const transaction = await solanaUtils.buildStartSessionTransaction(sessionId, expertPublicKey)

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        log.info('[IntegratedSession] Session started on blockchain:', signature)

        // Update backend
        try {
          await sessionService.startSession(sessionId)
          log.info('[IntegratedSession] Backend session started')
        } catch (backendError) {
          log.warn('[IntegratedSession] Backend start failed:', backendError)
        }

        // Check video call readiness
        let videoCallReady = false
        let videoCallId: string | undefined
        try {
          const session = await sessionService.getSessionHybrid(sessionId)
          if (session?.videoCallId) {
            videoCallId = session.videoCallId
            videoCallReady = true
            log.info('[IntegratedSession] Video call ready:', videoCallId)
          }
        } catch (videoError) {
          log.warn('[IntegratedSession] Video call check failed:', videoError)
        }

        // Update state sync
        sessionStateSyncService.handleUserStatusChange(sessionId, 'active', expertPublicKey)

        return {
          signature,
          sessionId,
          status: 'active' as const,
          videoCallReady,
          videoCallId
        }
      })
    } catch (error) {
      log.error('[IntegratedSession] Failed to start session:', error)
      throw new Error(`Failed to start session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * End a session (called by expert)
   */
  async endSession(sessionId: string): Promise<{
    signature: TransactionSignature
    sessionId: string
    status: 'completed'
    paymentProcessed: boolean
  }> {
    log.info('[IntegratedSession] Ending session...', { sessionId })

    try {
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
        log.info('[IntegratedSession] Expert ending session:', expertPublicKey.toString())

        // End session on blockchain (this should trigger payment release)
        await solanaUtils.initializePrograms(expertPublicKey)
        const transaction = await solanaUtils.buildEndSessionTransaction(sessionId, expertPublicKey)

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        log.info('[IntegratedSession] Session ended on blockchain:', signature)

        // Update backend
        let paymentProcessed = false
        try {
          await sessionService.completeSession(sessionId)
          paymentProcessed = true
          log.info('[IntegratedSession] Backend session completed')
        } catch (backendError) {
          log.warn('[IntegratedSession] Backend completion failed:', backendError)
        }

        // End video call
        try {
          await sessionService.endVideoCall(sessionId)
          log.info('[IntegratedSession] Video call ended')
        } catch (videoError) {
          log.warn('[IntegratedSession] Video call end failed:', videoError)
        }

        // Update state sync
        sessionStateSyncService.handleUserStatusChange(sessionId, 'completed', expertPublicKey)

        return {
          signature,
          sessionId,
          status: 'completed' as const,
          paymentProcessed
        }
      })
    } catch (error) {
      log.error('[IntegratedSession] Failed to end session:', error)
      throw new Error(`Failed to end session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * Cancel a session (can be called by shopper or expert)
   */
  async cancelSession(sessionId: string): Promise<{
    signature: TransactionSignature
    sessionId: string
    status: 'cancelled'
    refundProcessed: boolean
  }> {
    log.info('[IntegratedSession] Cancelling session...', { sessionId })

    try {
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
        log.info('[IntegratedSession] User cancelling session:', userPublicKey.toString())

        // Cancel on blockchain (should handle refund)
        await solanaUtils.initializePrograms(userPublicKey)
        
        // Note: This may need to be updated based on your program's cancel logic
        const transaction = await solanaUtils.buildCancelSessionTransaction(
          sessionId,
          userPublicKey, // This should be determined from session data
          userPublicKey  // This should be determined from session data
        )

        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        log.info('[IntegratedSession] Session cancelled on blockchain:', signature)

        // Update backend
        let refundProcessed = false
        try {
          await sessionService.cancelSession(sessionId)
          refundProcessed = true
          log.info('[IntegratedSession] Backend session cancelled')
        } catch (backendError) {
          log.warn('[IntegratedSession] Backend cancellation failed:', backendError)
        }

        // End video call if active
        try {
          await sessionService.endVideoCall(sessionId)
          log.info('[IntegratedSession] Video call ended due to cancellation')
        } catch (videoError) {
          log.warn('[IntegratedSession] Video call end failed:', videoError)
        }

        // Update state sync
        sessionStateSyncService.handleUserStatusChange(sessionId, 'cancelled', userPublicKey)

        return {
          signature,
          sessionId,
          status: 'cancelled' as const,
          refundProcessed
        }
      })
    } catch (error) {
      log.error('[IntegratedSession] Failed to cancel session:', error)
      throw new Error(`Failed to cancel session: ${error.message || 'Unknown error'}`)
    }
  },

  /**
   * Get comprehensive session data (blockchain + backend + video)
   */
  async getSessionDetails(sessionId: string): Promise<{
    blockchainData: any
    backendData: any
    videoCallData: any
    currentState: any
    conflicts: string[]
  }> {
    log.info('[IntegratedSession] Getting comprehensive session details...', { sessionId })

    try {
      const [blockchainData, backendData, currentState] = await Promise.all([
        sessionService.getSessionFromChain(sessionId),
        sessionService.getSessionHybrid(sessionId),
        sessionStateSyncService.getSessionState(sessionId)
      ])

      let videoCallData = null
      if (backendData?.videoCallId) {
        try {
          videoCallData = await videoCallService.getCallDetails(backendData.videoCallId)
        } catch (videoError) {
          log.warn('[IntegratedSession] Failed to get video call data:', videoError)
        }
      }

      // Check for conflicts between data sources
      const conflicts: string[] = []
      if (blockchainData && backendData) {
        // Compare statuses
        const chainStatus = sessionService.mapChainStatusToFrontend(blockchainData.status)
        if (chainStatus !== backendData.status) {
          conflicts.push(`Status mismatch: blockchain=${chainStatus}, backend=${backendData.status}`)
        }
      }

      return {
        blockchainData,
        backendData,
        videoCallData,
        currentState,
        conflicts
      }
    } catch (error) {
      log.error('[IntegratedSession] Failed to get session details:', error)
      throw new Error(`Failed to get session details: ${error.message}`)
    }
  },

  /**
   * Monitor session state changes
   */
  async monitorSession(sessionId: string, callback: (state: any) => void): Promise<() => void> {
    log.info('[IntegratedSession] Starting session monitoring...', { sessionId })
    
    sessionStateSyncService.addListener(sessionId, callback)
    sessionStateSyncService.startMonitoring(sessionId)
    
    // Return cleanup function
    return () => {
      sessionStateSyncService.removeListener(sessionId, callback)
      sessionStateSyncService.stopMonitoring(sessionId)
    }
  }
}