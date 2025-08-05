import { Connection, PublicKey } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { sessionProgramService } from './sessionProgramService'

export interface SessionState {
  sessionId: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  expert: PublicKey
  shopper: PublicKey
  amount: number // in lamports
  startTime?: number // timestamp
  endTime?: number // timestamp
  lastUpdated: number // timestamp
  blockchainConfirmed: boolean
  backendSynced: boolean
}

export interface SessionSyncResult {
  sessionId: string
  blockchainState: any
  backendState: any
  conflicts: string[]
  syncSuccess: boolean
}

/**
 * Service for synchronizing session state between Solana blockchain and backend
 */
export const sessionStateSyncService = {
  // Active session state cache
  activeSessions: new Map<string, SessionState>(),

  // Session event listeners
  listeners: new Map<string, Array<(state: SessionState) => void>>(),

  /**
   * Start monitoring a session for state changes
   */
  startMonitoring(sessionId: string): void {
    console.log(`[SessionSync] Starting monitoring for session: ${sessionId}`)
    
    // Start polling for blockchain state changes
    this.startBlockchainPolling(sessionId)
    
    // Mark session as being monitored
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, {
        sessionId,
        status: 'pending',
        expert: new PublicKey('11111111111111111111111111111112'), // placeholder
        shopper: new PublicKey('11111111111111111111111111111112'), // placeholder
        amount: 0,
        lastUpdated: Date.now(),
        blockchainConfirmed: false,
        backendSynced: false
      })
    }
  },

  /**
   * Stop monitoring a session
   */
  stopMonitoring(sessionId: string): void {
    console.log(`[SessionSync] Stopping monitoring for session: ${sessionId}`)
    this.activeSessions.delete(sessionId)
    this.listeners.delete(sessionId)
  },

  /**
   * Add a listener for session state changes
   */
  addListener(sessionId: string, callback: (state: SessionState) => void): void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, [])
    }
    this.listeners.get(sessionId)!.push(callback)
  },

  /**
   * Remove a listener for session state changes
   */
  removeListener(sessionId: string, callback: (state: SessionState) => void): void {
    const sessionListeners = this.listeners.get(sessionId)
    if (sessionListeners) {
      const index = sessionListeners.indexOf(callback)
      if (index > -1) {
        sessionListeners.splice(index, 1)
      }
    }
  },

  /**
   * Notify all listeners of session state change
   */
  notifyListeners(sessionId: string, state: SessionState): void {
    const sessionListeners = this.listeners.get(sessionId)
    if (sessionListeners) {
      sessionListeners.forEach(callback => {
        try {
          callback(state)
        } catch (error) {
          console.error(`[SessionSync] Listener error for session ${sessionId}:`, error)
        }
      })
    }
  },

  /**
   * Start polling blockchain for session state changes
   */
  startBlockchainPolling(sessionId: string, intervalMs: number = 5000): void {
    const pollBlockchain = async () => {
      try {
        const blockchainState = await sessionProgramService.getSessionFromChain(sessionId)
        
        if (blockchainState) {
          await this.updateSessionState(sessionId, {
            blockchainData: blockchainState,
            source: 'blockchain'
          })
        }
      } catch (error) {
        console.error(`[SessionSync] Blockchain polling error for session ${sessionId}:`, error)
      }

      // Continue polling if session is still being monitored
      if (this.activeSessions.has(sessionId)) {
        setTimeout(pollBlockchain, intervalMs)
      }
    }

    // Start initial poll
    setTimeout(pollBlockchain, 1000)
  },

  /**
   * Update session state from various sources
   */
  async updateSessionState(sessionId: string, update: {
    blockchainData?: any
    backendData?: any
    source: 'blockchain' | 'backend' | 'user'
  }): Promise<void> {
    try {
      let currentState = this.activeSessions.get(sessionId)
      
      if (!currentState) {
        console.warn(`[SessionSync] Session ${sessionId} not being monitored`)
        return
      }

      let stateChanged = false
      const newState = { ...currentState }

      // Update from blockchain data
      if (update.blockchainData) {
        // Parse blockchain session data (this would depend on your program's data structure)
        const blockchainStatus = this.parseBlockchainStatus(update.blockchainData)
        
        if (blockchainStatus && blockchainStatus !== newState.status) {
          console.log(`[SessionSync] Blockchain status update for ${sessionId}: ${newState.status} → ${blockchainStatus}`)
          newState.status = blockchainStatus
          newState.blockchainConfirmed = true
          newState.lastUpdated = Date.now()
          stateChanged = true
        }
      }

      // Update from backend data
      if (update.backendData) {
        const backendStatus = update.backendData.status
        
        if (backendStatus && backendStatus !== newState.status) {
          console.log(`[SessionSync] Backend status update for ${sessionId}: ${newState.status} → ${backendStatus}`)
          newState.status = backendStatus
          newState.backendSynced = true
          newState.lastUpdated = Date.now()
          stateChanged = true
        }
      }

      // Update the stored state
      if (stateChanged) {
        this.activeSessions.set(sessionId, newState)
        this.notifyListeners(sessionId, newState)

        // Sync with backend if blockchain was the source
        if (update.source === 'blockchain' && !newState.backendSynced) {
          await this.syncWithBackend(sessionId, newState)
        }
      }
    } catch (error) {
      console.error(`[SessionSync] Failed to update session state for ${sessionId}:`, error)
    }
  },

  /**
   * Parse blockchain session status from raw account data
   */
  parseBlockchainStatus(blockchainData: any): 'pending' | 'active' | 'completed' | 'cancelled' | null {
    // This would need to be implemented based on your session program's data structure
    // For now, return a placeholder
    if (!blockchainData) return null

    // Example parsing logic (adjust based on your program)
    if (blockchainData.isActive) return 'active'
    if (blockchainData.isCompleted) return 'completed'
    if (blockchainData.isCancelled) return 'cancelled'
    
    return 'pending'
  },

  /**
   * Sync session state with backend
   */
  async syncWithBackend(sessionId: string, state: SessionState): Promise<void> {
    try {
      console.log(`[SessionSync] Syncing session ${sessionId} with backend`)

      // Import session service to avoid circular dependency
      const { sessionService } = await import('./sessionService')

      await sessionService.updateSession(sessionId, {
        status: state.status,
        endTime: state.endTime ? new Date(state.endTime).toISOString() : undefined,
      })

      // Update sync status
      const currentState = this.activeSessions.get(sessionId)
      if (currentState) {
        currentState.backendSynced = true
        this.activeSessions.set(sessionId, currentState)
      }

      console.log(`[SessionSync] Backend sync successful for session ${sessionId}`)
    } catch (error) {
      console.error(`[SessionSync] Backend sync failed for session ${sessionId}:`, error)
    }
  },

  /**
   * Perform comprehensive session sync between blockchain and backend
   */
  async syncSession(sessionId: string): Promise<SessionSyncResult> {
    try {
      console.log(`[SessionSync] Performing comprehensive sync for session: ${sessionId}`)

      // Get state from both sources
      const [blockchainState, backendState] = await Promise.all([
        sessionProgramService.getSessionFromChain(sessionId),
        this.getBackendSessionState(sessionId)
      ])

      const conflicts: string[] = []
      let syncSuccess = true

      // Compare states and identify conflicts
      if (blockchainState && backendState) {
        const blockchainStatus = this.parseBlockchainStatus(blockchainState)
        const backendStatus = backendState.status

        if (blockchainStatus && backendStatus && blockchainStatus !== backendStatus) {
          conflicts.push(`Status mismatch: blockchain=${blockchainStatus}, backend=${backendStatus}`)
          
          // Resolve conflict: blockchain is source of truth
          try {
            await this.syncWithBackend(sessionId, {
              sessionId,
              status: blockchainStatus,
              expert: new PublicKey('11111111111111111111111111111112'), // would be parsed from blockchain
              shopper: new PublicKey('11111111111111111111111111111112'), // would be parsed from blockchain
              amount: 0, // would be parsed from blockchain
              lastUpdated: Date.now(),
              blockchainConfirmed: true,
              backendSynced: false
            })
            console.log(`[SessionSync] Resolved status conflict for ${sessionId}: using blockchain status ${blockchainStatus}`)
          } catch (error) {
            console.error(`[SessionSync] Failed to resolve conflict for ${sessionId}:`, error)
            syncSuccess = false
          }
        }
      }

      const result: SessionSyncResult = {
        sessionId,
        blockchainState,
        backendState,
        conflicts,
        syncSuccess
      }

      console.log(`[SessionSync] Sync complete for ${sessionId}:`, result)
      return result
    } catch (error) {
      console.error(`[SessionSync] Sync failed for session ${sessionId}:`, error)
      return {
        sessionId,
        blockchainState: null,
        backendState: null,
        conflicts: [`Sync error: ${error.message}`],
        syncSuccess: false
      }
    }
  },

  /**
   * Get session state from backend
   */
  async getBackendSessionState(sessionId: string): Promise<any> {
    try {
      const { sessionService } = await import('./sessionService')
      return await sessionService.getSessionById(sessionId)
    } catch (error) {
      console.error(`[SessionSync] Failed to get backend session state for ${sessionId}:`, error)
      return null
    }
  },

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): SessionState | null {
    return this.activeSessions.get(sessionId) || null
  },

  /**
   * Get all monitored sessions
   */
  getAllMonitoredSessions(): SessionState[] {
    return Array.from(this.activeSessions.values())
  },

  /**
   * Force sync all monitored sessions
   */
  async syncAllSessions(): Promise<SessionSyncResult[]> {
    console.log(`[SessionSync] Syncing all ${this.activeSessions.size} monitored sessions`)
    
    const syncPromises = Array.from(this.activeSessions.keys()).map(sessionId => 
      this.syncSession(sessionId)
    )

    const results = await Promise.all(syncPromises)
    
    const successCount = results.filter(r => r.syncSuccess).length
    console.log(`[SessionSync] Batch sync complete: ${successCount}/${results.length} successful`)
    
    return results
  },

  /**
   * Handle session status change from user action
   */
  async handleUserStatusChange(sessionId: string, newStatus: 'active' | 'completed' | 'cancelled', userPublicKey: PublicKey): Promise<void> {
    try {
      console.log(`[SessionSync] User status change for ${sessionId}: ${newStatus}`)

      // Update blockchain first
      let chainResult
      switch (newStatus) {
        case 'active':
          chainResult = await sessionProgramService.startSession(sessionId)
          break
        case 'completed':
          chainResult = await sessionProgramService.endSession(sessionId)
          break
        case 'cancelled':
          chainResult = await sessionProgramService.cancelSession(sessionId)
          break
      }

      console.log(`[SessionSync] Blockchain update successful:`, chainResult)

      // Update local state
      await this.updateSessionState(sessionId, {
        source: 'user'
      })

      // Start monitoring if not already
      if (!this.activeSessions.has(sessionId)) {
        this.startMonitoring(sessionId)
      }

    } catch (error) {
      console.error(`[SessionSync] Failed to handle user status change for ${sessionId}:`, error)
      throw error
    }
  }
}