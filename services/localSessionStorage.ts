import AsyncStorage from '@react-native-async-storage/async-storage'
import { SessionWithDetails } from './sessionService'

const SESSION_STORAGE_KEY = 'local_sessions'

export interface LocalSession {
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
  createdAt: string
  updatedAt: string
}

export const localSessionStorage = {
  async getSessions(): Promise<LocalSession[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY)
      if (!sessionsJson) return []
      return JSON.parse(sessionsJson)
    } catch (error) {
      console.error('Failed to get local sessions:', error)
      return []
    }
  },

  async saveSession(session: LocalSession): Promise<void> {
    try {
      const existingSessions = await this.getSessions()
      const sessionIndex = existingSessions.findIndex((s) => s.id === session.id)

      if (sessionIndex >= 0) {
        // Update existing session
        existingSessions[sessionIndex] = { ...session, updatedAt: new Date().toISOString() }
      } else {
        // Add new session
        existingSessions.push({ ...session, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      }

      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(existingSessions))
    } catch (error) {
      console.error('Failed to save local session:', error)
    }
  },

  async updateSession(sessionId: string, updates: Partial<LocalSession>): Promise<void> {
    try {
      const sessions = await this.getSessions()
      const sessionIndex = sessions.findIndex((s) => s.id === sessionId)

      if (sessionIndex >= 0) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions))
      }
    } catch (error) {
      console.error('Failed to update local session:', error)
    }
  },

  async createSessionFromCall(sessionId: string, expertId: string, userId: string): Promise<void> {
    // Get expert info from the explore page data
    const expertData = {
      '1': { name: 'Dr. Sarah Johnson', specialization: 'Fashion & Style' },
      '2': { name: 'Mike Chen', specialization: 'Tech & Gadgets' },
      '3': { name: 'Emma Davis', specialization: 'Home & Garden' },
      '4': { name: 'Alex Rivera', specialization: 'Fitness & Wellness' },
      '5': { name: 'Jennifer Lee', specialization: 'Beauty & Skincare' },
    }

    const expert = expertData[expertId as keyof typeof expertData] || {
      name: 'Unknown Expert',
      specialization: 'Unknown',
    }

    // Generate unique session ID if not provided or if it already exists
    let uniqueSessionId = sessionId
    if (!sessionId || sessionId === 'unknown') {
      uniqueSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } else {
      // Check if session already exists, if so create a new unique ID
      const existingSessions = await this.getSessions()
      if (existingSessions.some((s) => s.id === sessionId)) {
        uniqueSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }

    const newSession: LocalSession = {
      id: uniqueSessionId,
      expertId,
      expertName: expert.name,
      expertSpecialization: expert.specialization,
      shopperId: userId,
      shopperName: 'You',
      startTime: new Date().toISOString(),
      status: 'active',
      amount: '0.01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    console.log('Creating new session:', newSession)
    await this.saveSession(newSession)
  },

  async completeSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'completed',
      endTime: new Date().toISOString(),
    })
  },

  async convertToSessionWithDetails(localSession: LocalSession): Promise<SessionWithDetails> {
    return {
      id: localSession.id,
      expertId: localSession.expertId,
      expertName: localSession.expertName,
      expertSpecialization: localSession.expertSpecialization,
      shopperId: localSession.shopperId,
      shopperName: localSession.shopperName,
      startTime: localSession.startTime,
      endTime: localSession.endTime,
      status: localSession.status,
      amount: localSession.amount,
      paymentStatus: 'completed',
      createdAt: localSession.createdAt,
      updatedAt: localSession.updatedAt,
    }
  },

  async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear sessions:', error)
    }
  },
}
