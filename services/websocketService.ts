import AsyncStorage from '@react-native-async-storage/async-storage'

export interface WebSocketMessage {
  type: string
  payload: any
  timestamp: string
}

export interface SessionUpdate {
  sessionId: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  message?: string
}

export interface ExpertStatusUpdate {
  expertId: string
  isOnline: boolean
  lastSeen?: string
}

export interface PaymentUpdate {
  sessionId: string
  paymentStatus: 'pending' | 'completed' | 'failed'
  transactionHash?: string
}

export type WebSocketEventType =
  | 'session_update'
  | 'expert_status'
  | 'payment_update'
  | 'call_request'
  | 'call_answer'
  | 'call_end'
  | 'message'

export type WebSocketEventHandler = (data: any) => void

class WebSocketService {
  private ws: WebSocket | null = null
  private wsUrl: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private eventHandlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private connectionPromise: Promise<void> | null = null

  constructor() {
    this.wsUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://192.168.8.153:3001/ws'

    // Initialize event handler maps
    const eventTypes: WebSocketEventType[] = [
      'session_update',
      'expert_status',
      'payment_update',
      'call_request',
      'call_answer',
      'call_end',
      'message',
    ]

    eventTypes.forEach((type) => {
      this.eventHandlers.set(type, new Set())
    })
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    if (this.connectionPromise) {
      return this.connectionPromise
    }

    this.connectionPromise = this._connect()
    return this.connectionPromise
  }

  private async _connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true

    return new Promise(async (resolve, reject) => {
      try {
        const token = await AsyncStorage.getItem('token')
        const wsUrl = token ? `${this.wsUrl}?token=${encodeURIComponent(token)}` : this.wsUrl

        this.ws = new WebSocket(wsUrl)

        const connectTimeout = setTimeout(() => {
          this.ws?.close()
          reject(new Error('WebSocket connection timeout'))
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(connectTimeout)
          console.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startHeartbeat()
          this.connectionPromise = null
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectTimeout)
          this.isConnecting = false
          this.connectionPromise = null
          this.stopHeartbeat()
          console.log('WebSocket closed:', event.code, event.reason)

          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectTimeout)
          console.error('WebSocket error:', error)
          this.isConnecting = false
          this.connectionPromise = null

          if (this.reconnectAttempts === 0) {
            reject(error)
          }
        }
      } catch (error) {
        this.isConnecting = false
        this.connectionPromise = null
        reject(error)
      }
    })
  }

  private scheduleReconnect(): void {
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      this.reconnectAttempts++
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error)
      })
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {})
      }
    }, 30000) // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)

      if (message.type === 'pong') {
        return // Handle heartbeat response
      }

      const handlers = this.eventHandlers.get(message.type as WebSocketEventType)
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(message.payload)
          } catch (error) {
            console.error('Error in WebSocket event handler:', error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error)
    }
  }

  send(type: string, payload: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        await this.connect()

        if (this.ws?.readyState === WebSocket.OPEN) {
          const message: WebSocketMessage = {
            type,
            payload,
            timestamp: new Date().toISOString(),
          }

          this.ws.send(JSON.stringify(message))
          resolve()
        } else {
          reject(new Error('WebSocket is not connected'))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  on(eventType: WebSocketEventType, handler: WebSocketEventHandler): () => void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.add(handler)
    }

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType)
      if (handlers) {
        handlers.delete(handler)
      }
    }
  }

  off(eventType: WebSocketEventType, handler: WebSocketEventHandler): void {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  disconnect(): void {
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }

    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
    this.connectionPromise = null
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return 'CLOSED'

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING'
      case WebSocket.OPEN:
        return 'OPEN'
      case WebSocket.CLOSING:
        return 'CLOSING'
      case WebSocket.CLOSED:
        return 'CLOSED'
      default:
        return 'UNKNOWN'
    }
  }

  // Convenience methods for specific events
  onSessionUpdate(handler: (update: SessionUpdate) => void): () => void {
    return this.on('session_update', handler)
  }

  onExpertStatusChange(handler: (update: ExpertStatusUpdate) => void): () => void {
    return this.on('expert_status', handler)
  }

  onPaymentUpdate(handler: (update: PaymentUpdate) => void): () => void {
    return this.on('payment_update', handler)
  }

  onCallRequest(handler: (data: any) => void): () => void {
    return this.on('call_request', handler)
  }

  onCallAnswer(handler: (data: any) => void): () => void {
    return this.on('call_answer', handler)
  }

  onCallEnd(handler: (data: any) => void): () => void {
    return this.on('call_end', handler)
  }

  // Send specific message types
  async updateExpertStatus(isOnline: boolean): Promise<void> {
    await this.send('expert_status_update', { isOnline })
  }

  async joinSessionRoom(sessionId: string): Promise<void> {
    await this.send('join_session', { sessionId })
  }

  async leaveSessionRoom(sessionId: string): Promise<void> {
    await this.send('leave_session', { sessionId })
  }

  async sendCallRequest(sessionId: string, targetUserId: string): Promise<void> {
    await this.send('call_request', { sessionId, targetUserId })
  }

  async sendCallAnswer(sessionId: string, accepted: boolean): Promise<void> {
    await this.send('call_answer', { sessionId, accepted })
  }

  async sendCallEnd(sessionId: string): Promise<void> {
    await this.send('call_end', { sessionId })
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
export default websocketService
