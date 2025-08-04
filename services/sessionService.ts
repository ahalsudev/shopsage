import { v4 as uuidv4 } from 'react-native-uuid'
import { log } from '../config/environment'
import { dataProvider } from './dataProvider'
import { paymentService } from './paymentService'
import { VideoCallCredentials, videoCallService } from './videoCallService'

export interface CreateSessionRequest {
  expertId: string
  startTime: string // ISO 8601 format
  amount: string // BigDecimal as string
}

export interface UpdateSessionRequest {
  status?: 'pending' | 'active' | 'completed' | 'cancelled'
  endTime?: string
  paymentStatus?: 'pending' | 'completed' | 'failed'
  transactionHash?: string
}

export interface SessionWithDetails {
  id: string
  expertId: string
  expertName: string
  expertSpecialization: string
  shopperId: string
  shopperName: string
  startTime: string
  endTime?: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  amount: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  transactionHash?: string
  createdAt: string
  updatedAt: string
  videoCallId?: string
  videoCallCredentials?: VideoCallCredentials
}

export interface SessionResponse {
  id: string
  expertId: string
  shopperId: string
  status: string
  amount: string
  createdAt: string
}

export interface SessionsListResponse {
  sessions: SessionWithDetails[]
}

export const sessionService = {
  async createSession(sessionData: CreateSessionRequest): Promise<SessionResponse> {
    try {
      log.info('SessionService: Creating session', sessionData)
      return await dataProvider.createSession(sessionData)
    } catch (error) {
      log.error('Failed to create session:', error)
      throw error
    }
  },

  async getSession(sessionId: string): Promise<SessionResponse> {
    try {
      log.info('SessionService: Getting session', { sessionId })
      return await dataProvider.getSession(sessionId)
    } catch (error) {
      log.error('Failed to get session:', error)
      throw error
    }
  },

  async getUserSessions(): Promise<SessionWithDetails[]> {
    try {
      log.info('SessionService: Getting user sessions')
      return await dataProvider.getUserSessions()
    } catch (error) {
      log.error('Failed to get user sessions:', error)
      throw error
    }
  },

  async updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<SessionResponse> {
    try {
      log.info('SessionService: Updating session', { sessionId, updates })
      return await dataProvider.updateSession(sessionId, updates)
    } catch (error) {
      log.error('Failed to update session:', error)
      throw error
    }
  },

  async cancelSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, { status: 'cancelled' })
    } catch (error) {
      throw error
    }
  },

  async completeSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      })
    } catch (error) {
      throw error
    }
  },

  async startSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, { status: 'active' })
    } catch (error) {
      throw error
    }
  },

  async getActiveSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions()
      return sessions.filter((session) => session.status === 'active')
    } catch (error) {
      throw error
    }
  },

  async getUpcomingSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions()
      return sessions.filter((session) => session.status === 'pending' && new Date(session.startTime) > new Date())
    } catch (error) {
      throw error
    }
  },

  async getPastSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions()
      return sessions.filter((session) => session.status === 'completed' || session.status === 'cancelled')
    } catch (error) {
      throw error
    }
  },

  // Blockchain-integrated session methods
  async createSessionOnChain(sessionData: CreateSessionRequest): Promise<{ sessionId: string; txId: string }> {
    try {
      // Generate unique session ID
      const sessionId = uuidv4().toString()

      // Create session on blockchain first
      const { sessionTxId } = await paymentService.createSessionWithPayment(
        sessionId,
        sessionData.expertId,
        parseFloat(sessionData.amount),
      )

      // Then create in backend database for UI/search purposes
      try {
        await this.createSession({
          ...sessionData,
          startTime: sessionData.startTime,
          amount: sessionData.amount,
        })
      } catch (backendError) {
        console.warn('Backend session creation failed, but blockchain session exists:', backendError)
        // Continue since blockchain is the source of truth
      }

      return { sessionId, txId: sessionTxId }
    } catch (error) {
      console.error('Failed to create session on chain:', error)
      throw new Error('Failed to create session on blockchain')
    }
  },

  async startSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    try {
      // Start session on blockchain
      const txId = await paymentService.startSessionOnChain(sessionId, expertWalletAddress)

      // Update backend status for UI purposes
      try {
        await this.updateSession(sessionId, { status: 'active' })
      } catch (backendError) {
        console.warn('Backend session update failed:', backendError)
      }

      return txId
    } catch (error) {
      console.error('Failed to start session on chain:', error)
      throw new Error('Failed to start session on blockchain')
    }
  },

  async endSessionOnChain(sessionId: string, expertWalletAddress: string): Promise<string> {
    try {
      // End session on blockchain
      const txId = await paymentService.endSessionOnChain(sessionId, expertWalletAddress)

      // Update backend status for UI purposes
      try {
        await this.updateSession(sessionId, {
          status: 'completed',
          endTime: new Date().toISOString(),
        })
      } catch (backendError) {
        console.warn('Backend session update failed:', backendError)
      }

      return txId
    } catch (error) {
      console.error('Failed to end session on chain:', error)
      throw new Error('Failed to end session on blockchain')
    }
  },

  async getSessionFromChain(sessionId: string): Promise<any> {
    try {
      return await paymentService.getSessionFromChain(sessionId)
    } catch (error) {
      console.error('Failed to get session from chain:', error)
      return null
    }
  },

  async syncSessionWithChain(sessionId: string): Promise<SessionWithDetails | null> {
    try {
      // Get session data from blockchain
      const chainSession = await this.getSessionFromChain(sessionId)

      if (!chainSession) {
        console.warn('Session not found on chain:', sessionId)
        return null
      }

      // Get session from backend for additional metadata
      let backendSession: SessionWithDetails | null = null
      try {
        const backendSessions = await this.getUserSessions()
        backendSession = backendSessions.find((s) => s.id === sessionId) || null
      } catch (error) {
        console.warn('Failed to get backend session:', error)
      }

      // Merge blockchain truth with backend metadata
      const syncedSession: SessionWithDetails = {
        id: chainSession.sessionId,
        expertId: chainSession.expert.toString(),
        expertName: backendSession?.expertName || 'Unknown Expert',
        expertSpecialization: backendSession?.expertSpecialization || 'Unknown',
        shopperId: chainSession.shopper.toString(),
        shopperName: backendSession?.shopperName || 'Unknown Shopper',
        startTime: new Date(chainSession.startTime * 1000).toISOString(),
        endTime: chainSession.endTime ? new Date(chainSession.endTime * 1000).toISOString() : undefined,
        status: this.mapChainStatusToFrontend(chainSession.status),
        amount: (chainSession.amount.toNumber() / 1_000_000_000).toString(), // Convert lamports to SOL
        paymentStatus: chainSession.status === 'Completed' ? 'completed' : 'pending',
        transactionHash: undefined, // Would need to track this separately
        createdAt: new Date(chainSession.startTime * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return syncedSession
    } catch (error) {
      console.error('Failed to sync session with chain:', error)
      return null
    }
  },

  mapChainStatusToFrontend(chainStatus: any): 'pending' | 'active' | 'completed' | 'cancelled' {
    if (typeof chainStatus === 'object') {
      if (chainStatus.pending !== undefined) return 'pending'
      if (chainStatus.active !== undefined) return 'active'
      if (chainStatus.completed !== undefined) return 'completed'
      if (chainStatus.cancelled !== undefined) return 'cancelled'
    }

    // Fallback to string comparison
    const statusStr = chainStatus.toString().toLowerCase()
    if (statusStr.includes('pending')) return 'pending'
    if (statusStr.includes('active')) return 'active'
    if (statusStr.includes('completed')) return 'completed'
    if (statusStr.includes('cancelled')) return 'cancelled'

    return 'pending' // Default fallback
  },

  // Hybrid method that tries blockchain first, falls back to backend
  async getSessionHybrid(sessionId: string): Promise<SessionWithDetails | null> {
    try {
      // Try to get synced data from blockchain
      const syncedSession = await this.syncSessionWithChain(sessionId)
      if (syncedSession) {
        return syncedSession
      }

      // Fallback to backend only
      const backendSessions = await this.getUserSessions()
      return backendSessions.find((s) => s.id === sessionId) || null
    } catch (error) {
      console.error('Failed to get session (hybrid):', error)
      return null
    }
  },

  // Video calling integration methods
  async startVideoCall(sessionId: string, participantIds: string[]): Promise<VideoCallCredentials> {
    try {
      log.info('SessionService: Starting video call for session', { sessionId, participantIds })

      // Start the video call
      const credentials = await videoCallService.startVideoCall({
        sessionId,
        participantIds,
        callType: 'video',
      })

      // Update session with video call information
      try {
        await this.updateSession(sessionId, {
          status: 'active',
        })
      } catch (updateError) {
        log.warn('Failed to update session status after starting video call:', updateError)
      }

      return credentials
    } catch (error) {
      log.error('Failed to start video call for session:', error)
      throw new Error('Failed to start video call')
    }
  },

  async joinVideoCall(sessionId: string, userId: string): Promise<VideoCallCredentials> {
    try {
      log.info('SessionService: Joining video call for session', { sessionId, userId })

      // Get session to retrieve call ID
      const session = await this.getSessionHybrid(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      if (!session.videoCallId) {
        throw new Error('No video call active for this session')
      }

      return await videoCallService.joinVideoCall(session.videoCallId, userId)
    } catch (error) {
      log.error('Failed to join video call for session:', error)
      throw new Error('Failed to join video call')
    }
  },

  async endVideoCall(sessionId: string): Promise<void> {
    try {
      log.info('SessionService: Ending video call for session', { sessionId })

      // Get session to retrieve call ID
      const session = await this.getSessionHybrid(sessionId)
      if (!session?.videoCallId) {
        log.warn('No video call ID found for session:', sessionId)
        return
      }

      // End the video call
      await videoCallService.endVideoCall(session.videoCallId)

      // Complete the session
      await this.completeSession(sessionId)
    } catch (error) {
      log.error('Failed to end video call for session:', error)
      throw new Error('Failed to end video call')
    }
  },

  async isVideoCallAvailable(): Promise<boolean> {
    return videoCallService.isVideoCallAvailable()
  },

  async getVideoCallCredentials(sessionId: string, userId: string): Promise<VideoCallCredentials | null> {
    try {
      const session = await this.getSessionHybrid(sessionId)
      if (!session) {
        return null
      }

      // If session already has credentials cached, return them
      if (session.videoCallCredentials) {
        return session.videoCallCredentials
      }

      // If there's a call ID but no cached credentials, rejoin
      if (session.videoCallId) {
        return await this.joinVideoCall(sessionId, userId)
      }

      return null
    } catch (error) {
      log.error('Failed to get video call credentials:', error)
      return null
    }
  },
}
