import { router } from 'expo-router'
import { sessionService } from '@/services/sessionService'
import { log } from '@/config/environment'
import { requestPermissionsWithExplanation, handlePermissionDenied } from './permissions'

export interface StartVideoCallParams {
  sessionId: string
  userId: string
  participantIds: string[]
}

export interface JoinVideoCallParams {
  sessionId: string
  userId: string
}

export const videoCallNavigation = {
  /**
   * Start a new video call for a session and navigate to the call screen
   */
  async startVideoCall(params: StartVideoCallParams): Promise<void> {
    try {
      const { sessionId, userId, participantIds } = params

      log.info('Starting video call and navigating to call screen', { sessionId, userId, participantIds })

      // Validate input parameters
      if (!sessionId || !userId || !participantIds || participantIds.length === 0) {
        throw new Error('Invalid video call parameters: sessionId, userId, and participantIds are required')
      }

      // Check if video calling is available first
      const isAvailable = await this.isVideoCallAvailable()
      if (!isAvailable) {
        throw new Error('Video calling service is not available')
      }

      // Request permissions first
      log.info('Requesting camera and microphone permissions...')
      const permissionStatus = await requestPermissionsWithExplanation()

      // Check if we have at least microphone permission (minimum requirement)
      if (!permissionStatus.microphone) {
        handlePermissionDenied(permissionStatus)
        throw new Error('Microphone permission is required for video calls')
      }

      // Warn if camera permission is denied but continue
      if (!permissionStatus.camera) {
        log.warn('Camera permission denied - continuing with audio-only mode')
      }

      // Start the video call and get credentials
      log.info('Starting video call service and getting credentials...')
      const credentials = await sessionService.startVideoCall(sessionId, participantIds)

      if (!credentials || !credentials.callId || !credentials.userId || !credentials.userToken) {
        throw new Error('Invalid video call credentials received')
      }

      log.info('Video call credentials obtained, navigating to call screen...', {
        sessionId,
        callId: credentials.callId,
        userId: credentials.userId,
        hasToken: !!credentials.userToken
      })

      // Navigate to video call screen with credentials
      // Use replace instead of push to prevent back navigation to payment screen
      router.replace({
        pathname: '/(call)/video-call',
        params: {
          sessionId,
          callId: credentials.callId,
          userId: credentials.userId,
          userToken: credentials.userToken,
        },
      })

      log.info('Navigation to video call screen completed')
    } catch (error) {
      log.error('Failed to start video call:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Camera or microphone permission required for video calls')
        } else if (error.message.includes('service') || error.message.includes('available')) {
          throw new Error('Video calling service is currently unavailable')
        } else if (error.message.includes('credentials')) {
          throw new Error('Failed to authenticate video call session')
        } else if (error.message.includes('parameters')) {
          throw error // Re-throw parameter validation errors as-is
        } else {
          throw new Error(`Video call failed: ${error.message}`)
        }
      }
      
      throw new Error('An unexpected error occurred while starting the video call')
    }
  },

  /**
   * Join an existing video call for a session and navigate to the call screen
   */
  async joinVideoCall(params: JoinVideoCallParams): Promise<void> {
    try {
      const { sessionId, userId } = params

      log.info('Joining video call and navigating to call screen', { sessionId, userId })

      // Validate input parameters
      if (!sessionId || !userId) {
        throw new Error('Invalid join video call parameters: sessionId and userId are required')
      }

      // Check if video calling is available first
      const isAvailable = await this.isVideoCallAvailable()
      if (!isAvailable) {
        throw new Error('Video calling service is not available')
      }

      // Request permissions first
      log.info('Requesting camera and microphone permissions...')
      const permissionStatus = await requestPermissionsWithExplanation()

      // Check if we have at least microphone permission (minimum requirement)
      if (!permissionStatus.microphone) {
        handlePermissionDenied(permissionStatus)
        throw new Error('Microphone permission is required for video calls')
      }

      // Warn if camera permission is denied but continue
      if (!permissionStatus.camera) {
        log.warn('Camera permission denied - continuing with audio-only mode')
      }

      // Join the video call and get credentials
      log.info('Joining video call service and getting credentials...')
      const credentials = await sessionService.joinVideoCall(sessionId, userId)

      if (!credentials || !credentials.callId || !credentials.userId || !credentials.userToken) {
        throw new Error('Invalid video call credentials received')
      }

      log.info('Video call credentials obtained, navigating to call screen...', {
        sessionId,
        callId: credentials.callId,
        userId: credentials.userId,
        hasToken: !!credentials.userToken
      })

      // Navigate to video call screen with credentials
      // Use replace instead of push to prevent back navigation issues
      router.replace({
        pathname: '/(call)/video-call',
        params: {
          sessionId,
          callId: credentials.callId,
          userId: credentials.userId,
          userToken: credentials.userToken,
        },
      })

      log.info('Navigation to join video call screen completed')
    } catch (error) {
      log.error('Failed to join video call:', error)
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          throw new Error('Camera or microphone permission required for video calls')
        } else if (error.message.includes('service') || error.message.includes('available')) {
          throw new Error('Video calling service is currently unavailable')
        } else if (error.message.includes('credentials')) {
          throw new Error('Failed to authenticate video call session')
        } else if (error.message.includes('parameters')) {
          throw error // Re-throw parameter validation errors as-is
        } else {
          throw new Error(`Failed to join video call: ${error.message}`)
        }
      }
      
      throw new Error('An unexpected error occurred while joining the video call')
    }
  },

  /**
   * Get video call credentials for a session (useful for checking if call is available)
   */
  async getCallCredentials(sessionId: string, userId: string) {
    try {
      return await sessionService.getVideoCallCredentials(sessionId, userId)
    } catch (error) {
      log.error('Failed to get video call credentials:', error)
      return null
    }
  },

  /**
   * Check if video calling is available for the current environment
   */
  async isVideoCallAvailable(): Promise<boolean> {
    return await sessionService.isVideoCallAvailable()
  },

  /**
   * Navigate directly to video call screen with existing credentials
   */
  navigateToVideoCall(params: { sessionId: string; callId: string; userId: string; userToken: string }): void {
    router.push({
      pathname: '/(call)/video-call',
      params,
    })
  },
}
