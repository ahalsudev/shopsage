import { useState, useEffect, useCallback, useRef } from 'react'
import { integratedSessionService, SessionCreationRequest, SessionCreationResult } from '../services/integratedSessionService'
import { sessionStateSyncService, SessionState } from '../services/sessionStateSyncService'
import { log } from '../config/environment'

export interface UseIntegratedSessionState {
  // Session creation
  isCreating: boolean
  createError: string | null
  
  // Session management
  isStarting: boolean
  isEnding: boolean
  isCancelling: boolean
  actionError: string | null
  
  // Session state
  currentSession: SessionCreationResult | null
  sessionState: SessionState | null
  
  // Video call
  videoCallReady: boolean
  videoCallId: string | null
}

export interface UseIntegratedSessionActions {
  createSession: (request: SessionCreationRequest) => Promise<SessionCreationResult | null>
  startSession: (sessionId: string) => Promise<boolean>
  endSession: (sessionId: string) => Promise<boolean>
  cancelSession: (sessionId: string) => Promise<boolean>
  getSessionDetails: (sessionId: string) => Promise<any>
  clearError: () => void
  reset: () => void
}

/**
 * React hook for integrated session management with Mobile Wallet Adapter
 */
export function useIntegratedSession(): UseIntegratedSessionState & UseIntegratedSessionActions {
  // State management
  const [state, setState] = useState<UseIntegratedSessionState>({
    isCreating: false,
    createError: null,
    isStarting: false,
    isEnding: false,
    isCancelling: false,
    actionError: null,
    currentSession: null,
    sessionState: null,
    videoCallReady: false,
    videoCallId: null
  })

  // Refs for cleanup
  const stateMonitorCleanup = useRef<(() => void) | null>(null)

  // Session state listener
  const handleSessionStateChange = useCallback((newState: SessionState) => {
    log.info('[useIntegratedSession] Session state updated:', newState)
    
    setState(prev => ({
      ...prev,
      sessionState: newState,
      videoCallReady: newState.status === 'active' && !!prev.videoCallId,
    }))
  }, [])

  // Create session
  const createSession = useCallback(async (request: SessionCreationRequest): Promise<SessionCreationResult | null> => {
    log.info('[useIntegratedSession] Creating session...', request)
    
    setState(prev => ({
      ...prev,
      isCreating: true,
      createError: null,
      actionError: null
    }))

    try {
      const result = await integratedSessionService.createSession(request)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          currentSession: result,
          videoCallId: result.videoCallId || null,
          videoCallReady: !!result.videoCallId,
          isCreating: false
        }))

        // Start monitoring the session
        if (stateMonitorCleanup.current) {
          stateMonitorCleanup.current()
        }
        
        stateMonitorCleanup.current = await integratedSessionService.monitorSession(
          result.sessionId,
          handleSessionStateChange
        )

        log.info('[useIntegratedSession] Session created successfully:', result.sessionId)
        return result
      } else {
        const errorMsg = result.errors.join(', ')
        setState(prev => ({
          ...prev,
          createError: errorMsg,
          isCreating: false
        }))
        log.error('[useIntegratedSession] Session creation failed:', errorMsg)
        return null
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to create session'
      setState(prev => ({
        ...prev,
        createError: errorMsg,
        isCreating: false
      }))
      log.error('[useIntegratedSession] Session creation error:', error)
      return null
    }
  }, [handleSessionStateChange])

  // Start session
  const startSession = useCallback(async (sessionId: string): Promise<boolean> => {
    log.info('[useIntegratedSession] Starting session...', { sessionId })
    
    setState(prev => ({
      ...prev,
      isStarting: true,
      actionError: null
    }))

    try {
      const result = await integratedSessionService.startSession(sessionId)
      
      setState(prev => ({
        ...prev,
        isStarting: false,
        videoCallReady: result.videoCallReady,
        videoCallId: result.videoCallId || prev.videoCallId
      }))

      log.info('[useIntegratedSession] Session started successfully:', result)
      return true
    } catch (error) {
      const errorMsg = error.message || 'Failed to start session'
      setState(prev => ({
        ...prev,
        actionError: errorMsg,
        isStarting: false
      }))
      log.error('[useIntegratedSession] Start session error:', error)
      return false
    }
  }, [])

  // End session
  const endSession = useCallback(async (sessionId: string): Promise<boolean> => {
    log.info('[useIntegratedSession] Ending session...', { sessionId })
    
    setState(prev => ({
      ...prev,
      isEnding: true,
      actionError: null
    }))

    try {
      const result = await integratedSessionService.endSession(sessionId)
      
      setState(prev => ({
        ...prev,
        isEnding: false,
        videoCallReady: false
      }))

      // Clean up monitoring
      if (stateMonitorCleanup.current) {
        stateMonitorCleanup.current()
        stateMonitorCleanup.current = null
      }

      log.info('[useIntegratedSession] Session ended successfully:', result)
      return true
    } catch (error) {
      const errorMsg = error.message || 'Failed to end session'
      setState(prev => ({
        ...prev,
        actionError: errorMsg,
        isEnding: false
      }))
      log.error('[useIntegratedSession] End session error:', error)
      return false
    }
  }, [])

  // Cancel session
  const cancelSession = useCallback(async (sessionId: string): Promise<boolean> => {
    log.info('[useIntegratedSession] Cancelling session...', { sessionId })
    
    setState(prev => ({
      ...prev,
      isCancelling: true,
      actionError: null
    }))

    try {
      const result = await integratedSessionService.cancelSession(sessionId)
      
      setState(prev => ({
        ...prev,
        isCancelling: false,
        videoCallReady: false
      }))

      // Clean up monitoring
      if (stateMonitorCleanup.current) {
        stateMonitorCleanup.current()
        stateMonitorCleanup.current = null
      }

      log.info('[useIntegratedSession] Session cancelled successfully:', result)
      return true
    } catch (error) {
      const errorMsg = error.message || 'Failed to cancel session'
      setState(prev => ({
        ...prev,
        actionError: errorMsg,
        isCancelling: false
      }))
      log.error('[useIntegratedSession] Cancel session error:', error)
      return false
    }
  }, [])

  // Get session details
  const getSessionDetails = useCallback(async (sessionId: string) => {
    log.info('[useIntegratedSession] Getting session details...', { sessionId })
    
    try {
      const details = await integratedSessionService.getSessionDetails(sessionId)
      log.info('[useIntegratedSession] Session details retrieved:', details)
      return details
    } catch (error) {
      log.error('[useIntegratedSession] Get session details error:', error)
      throw error
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      createError: null,
      actionError: null
    }))
  }, [])

  // Reset state
  const reset = useCallback(() => {
    // Clean up monitoring
    if (stateMonitorCleanup.current) {
      stateMonitorCleanup.current()
      stateMonitorCleanup.current = null
    }

    setState({
      isCreating: false,
      createError: null,
      isStarting: false,
      isEnding: false,
      isCancelling: false,
      actionError: null,
      currentSession: null,
      sessionState: null,
      videoCallReady: false,
      videoCallId: null
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stateMonitorCleanup.current) {
        stateMonitorCleanup.current()
      }
    }
  }, [])

  return {
    // State
    ...state,
    
    // Actions
    createSession,
    startSession,
    endSession,
    cancelSession,
    getSessionDetails,
    clearError,
    reset
  }
}

/**
 * Hook for monitoring a specific session
 */
export function useSessionMonitor(sessionId: string | null) {
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setSessionState(null)
      setIsMonitoring(false)
      return
    }

    let cleanup: (() => void) | null = null

    const startMonitoring = async () => {
      try {
        setIsMonitoring(true)
        cleanup = await integratedSessionService.monitorSession(sessionId, setSessionState)
        log.info('[useSessionMonitor] Started monitoring session:', sessionId)
      } catch (error) {
        log.error('[useSessionMonitor] Failed to start monitoring:', error)
        setIsMonitoring(false)
      }
    }

    startMonitoring()

    return () => {
      if (cleanup) {
        cleanup()
      }
      setIsMonitoring(false)
    }
  }, [sessionId])

  return {
    sessionState,
    isMonitoring
  }
}