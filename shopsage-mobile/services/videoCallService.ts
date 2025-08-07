import { log } from '@/config/environment'
import { checkNativeModuleAvailability } from '@/utils/nativeModuleFallbacks'
import CryptoJS from 'crypto-js'

export interface VideoCallCredentials {
  userId: string
  userToken: string
  callId: string
}

export interface StartVideoCallRequest {
  sessionId: string
  participantIds: string[]
  callType?: 'video' | 'audio'
}

export class VideoCallService {
  private static instance: VideoCallService
  private apiKey: string

  private constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GETSTREAM_API_KEY || ''
    if (!this.apiKey) {
      log.warn('GetStream.io API key not configured')
    }

    // Check native module availability on initialization
    const moduleStatus = checkNativeModuleAvailability()
    if (!moduleStatus.netinfo) {
      log.warn('NetInfo not available - network status detection may be limited')
    }
    if (!moduleStatus.notifee) {
      log.info(
        'Note: Notifee is not installed. Background call notifications are disabled, but video calling will work normally.',
      )
    }
  }

  public static getInstance(): VideoCallService {
    if (!VideoCallService.instance) {
      VideoCallService.instance = new VideoCallService()
    }
    return VideoCallService.instance
  }

  /**
   * Generate user token for GetStream.io
   * In production, this should be done on the backend for security
   */
  async generateUserToken(userId: string): Promise<string> {
    try {
      // For development/demo purposes, we'll use a hardcoded secret
      // In production, this should be done on your backend server
      const secret = '5sw29fabkpsv552mktjpmuay6ent2wvvyv89jp23tnbmaqxcazctpx8h6dqedfu5'

      log.warn('Using hardcoded secret for development. In production, generate tokens on your backend server.')

      // Generate proper JWT token for GetStream.io using React Native compatible crypto
      const header = {
        alg: 'HS256',
        typ: 'JWT',
      }

      const payload = {
        user_id: userId,
        iss: 'stream', // GetStream issuer
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        iat: Math.floor(Date.now() / 1000),
      }

      // Create JWT token manually for React Native compatibility
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
      const signature = this.createSignature(`${encodedHeader}.${encodedPayload}`, secret)

      const token = `${encodedHeader}.${encodedPayload}.${signature}`
      log.info('Generated JWT token for user:', userId)
      return token
    } catch (error) {
      log.error('Failed to generate user token:', error)
      throw new Error('Failed to generate video call token')
    }
  }

  /**
   * Base64 URL encode (without padding)
   */
  private base64UrlEncode(str: string): string {
    const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Create HMAC SHA256 signature for JWT
   */
  private createSignature(data: string, secret: string): string {
    const hmac = CryptoJS.HmacSHA256(data, secret)
    const base64 = CryptoJS.enc.Base64.stringify(hmac)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  /**
   * Create video call credentials for a session
   */
  async createCallCredentials(sessionId: string, userId: string): Promise<VideoCallCredentials> {
    try {
      const userToken = await this.generateUserToken(userId)
      // Create a short, unique call ID (max 64 chars)
      // For demo purposes, use a consistent ID if it's a test session
      const isTestSession = sessionId.includes('test_session')
      const callId = 'call_demo_123'
      // const callId = isTestSession
      //   ? 'call_demo_123'
      //   : `call_${this.hashString(sessionId).slice(0, 8)}_${Date.now().toString().slice(-8)}`;

      const credentials: VideoCallCredentials = {
        userId,
        userToken,
        callId,
      }

      log.info('Created video call credentials:', { sessionId, userId, callId, callIdLength: callId.length })
      return credentials
    } catch (error) {
      log.error('Failed to create call credentials:', error)
      throw new Error('Failed to create video call credentials')
    }
  }

  /**
   * Create a short hash from a string
   */
  private hashString(str: string): string {
    return CryptoJS.MD5(str).toString()
  }

  /**
   * Start a video call for a session
   */
  async startVideoCall(request: StartVideoCallRequest): Promise<VideoCallCredentials> {
    try {
      const { sessionId, participantIds, callType = 'video' } = request

      if (participantIds.length === 0) {
        throw new Error('At least one participant is required')
      }

      // For now, use the first participant as the call initiator
      const initiatorId = participantIds[0]

      const credentials = await this.createCallCredentials(sessionId, initiatorId)

      log.info('Started video call:', {
        sessionId,
        callType,
        participantCount: participantIds.length,
        callId: credentials.callId,
      })

      return credentials
    } catch (error) {
      log.error('Failed to start video call:', error)
      throw error
    }
  }

  /**
   * Join an existing video call
   */
  async joinVideoCall(callId: string, userId: string): Promise<VideoCallCredentials> {
    try {
      const userToken = await this.generateUserToken(userId)

      const credentials: VideoCallCredentials = {
        userId,
        userToken,
        callId,
      }

      log.info('Joined video call:', { callId, userId })
      return credentials
    } catch (error) {
      log.error('Failed to join video call:', error)
      throw new Error('Failed to join video call')
    }
  }

  /**
   * End a video call and clean up resources
   */
  async endVideoCall(callId: string): Promise<void> {
    try {
      // In a real implementation, you might want to:
      // - Notify all participants that the call is ending
      // - Clean up call resources on GetStream.io
      // - Update session status in your backend

      log.info('Ended video call:', callId)
    } catch (error) {
      log.error('Failed to end video call:', error)
      throw new Error('Failed to end video call')
    }
  }

  /**
   * Check if video calling is available
   */
  isVideoCallAvailable(): boolean {
    return !!this.apiKey
  }

  /**
   * Get the API key (for client initialization)
   */
  getApiKey(): string {
    return this.apiKey
  }
}

export const videoCallService = VideoCallService.getInstance()
