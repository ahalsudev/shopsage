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

      log.info('Starting video call and navigating to call screen', { sessionId, userId })

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
      const credentials = await sessionService.startVideoCall(sessionId, participantIds)

      // Navigate to video call screen with credentials
      router.push({
        pathname: '/(call)/video-call',
        params: {
          sessionId,
          callId: credentials.callId,
          userId: credentials.userId,
          userToken: credentials.userToken,
        },
      })
    } catch (error) {
      log.error('Failed to start video call:', error)
      throw new Error('Failed to start video call')
    }
  },

  /**
   * Join an existing video call for a session and navigate to the call screen
   */
  async joinVideoCall(params: JoinVideoCallParams): Promise<void> {
    try {
      const { sessionId, userId } = params

      log.info('Joining video call and navigating to call screen', { sessionId, userId })

      // Join the video call and get credentials
      const credentials = await sessionService.joinVideoCall(sessionId, userId)

      // Navigate to video call screen with credentials
      router.push({
        pathname: '/(call)/video-call',
        params: {
          sessionId,
          callId: credentials.callId,
          userId: credentials.userId,
          userToken: credentials.userToken,
        },
      })
    } catch (error) {
      log.error('Failed to join video call:', error)
      throw new Error('Failed to join video call')
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
