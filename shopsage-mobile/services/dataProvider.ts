import {
  CreateSessionRequest,
  SessionResponse,
  SessionWithDetails,
  UpdateSessionRequest,
} from '../services/sessionService';
import { ExpertProfile, ShopperProfile, UserCompleteProfile, UserProfile } from '../types/auth';

export interface IDataProvider {
  registerUser(
    walletAddress: string,
    name: string,
    email: string,
  ): Promise<{ user: UserCompleteProfile; token: string }>
  loginUser(walletAddress: string): Promise<{ user: UserCompleteProfile; token: string }>

  // New Multi-Role Profile Management
  getUserCompleteProfile(): Promise<UserCompleteProfile>
  createShopperProfile(profileData: Partial<ShopperProfile>): Promise<ShopperProfile>
  getShopperProfile(): Promise<ShopperProfile>
  createExpertProfile(profileData: Partial<ExpertProfile>): Promise<ExpertProfile>
  getExpertProfile(walletAddress: string): Promise<ExpertProfile>

  // Legacy Profile Management (for backward compatibility)
  updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile>
  updateShopperProfile(updates: Partial<ShopperProfile>): Promise<ShopperProfile>
  updateExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile>

  // Expert Status Management
  updateExpertOnlineStatus(isOnline: boolean): Promise<ExpertProfile>

  // Sessions
  createSession(sessionData: CreateSessionRequest): Promise<SessionResponse>
  getSession(sessionId: string): Promise<SessionResponse>
  getUserSessions(): Promise<SessionWithDetails[]>
  updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<SessionResponse>

  // Payments
  processPayment(paymentData: { sessionId: string; transactionHash: string }): Promise<any>
  getPaymentHistory(): Promise<any[]>

  // Experts
  getExperts(): Promise<any[]>
  getExpertById(expertId: string): Promise<any>
  searchExperts(query: string, filters?: any): Promise<any[]>
}

// Remote API Data Provider Implementation
class RemoteDataProvider implements IDataProvider {
  async loginUser(walletAddress: string): Promise<{ user: UserCompleteProfile; token: string }> {
    const jsonPayload = JSON.stringify({
      walletAddress: walletAddress.toString(),
    })

    const response = await this.makeApiCall('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonPayload,
    })

    const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)

    if (response.token) {
      await AsyncStorage.setItem('token', response.token)
    }

    return response
  }

  private async makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const { AppConfig } = await import('../config/environment')
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)

    // Get authentication token
    const token = await AsyncStorage.getItem('token')
    console.log(`Making API call to ${endpoint}, token available:`, !!token)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log('Authorization header added')
    } else {
      console.warn('No auth token available for API call to', endpoint)
    }

    const url = `${AppConfig.api.baseUrl}${endpoint}`
    console.log(`Calling: ${options.method || 'GET'} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers,
    })

    // Check if response is ok before parsing JSON
    if (!response.ok) {
      const text = await response.text()
      console.error(`API call failed with status ${response.status}:`, text)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      console.error(`Expected JSON response but got ${contentType}:`, text)
      throw new Error(`Invalid response type: expected JSON but got ${contentType}`)
    }

    return await response.json()
  }

  async registerUser(
    walletAddress: string,
    name: string,
    email: string,
  ): Promise<{ user: UserCompleteProfile; token: string }> {
    const jsonPayload = JSON.stringify({
      walletAddress,
      name,
      email,
    })

    const response = await this.makeApiCall('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonPayload,
    })

    const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)
    if (response.token) {
      await AsyncStorage.setItem('token', response.token)
    }

    return response
  }

  async getUser(): Promise<UserCompleteProfile> {
    return this.makeApiCall('/auth/login')
  }

  async getUserCompleteProfile(): Promise<UserCompleteProfile> {
    return this.makeApiCall('/profiles/complete')
  }

  // New Multi-Role Profile Management
  async createShopperProfile(profileData: Partial<ShopperProfile>): Promise<ShopperProfile> {
    return this.makeApiCall('/profiles/shopper', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  }

  async getShopperProfile(): Promise<ShopperProfile> {
    return this.makeApiCall('/profiles/shopper')
  }

  async createExpertProfile(profileData: Partial<ExpertProfile>): Promise<ExpertProfile> {
    // Handle backward compatibility: send both sessionRate and hourlyRate
    const payload = {
      ...profileData,
      // If sessionRate exists, also send it as hourlyRate for backend compatibility
      ...(profileData.sessionRate && { hourlyRate: profileData.sessionRate }),
    }

    console.log('Creating expert profile with payload:', payload)

    return this.makeApiCall('/profiles/expert', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async getExpertProfile(walletAddress: string): Promise<ExpertProfile> {
    return this.makeApiCall(`/profiles/expert/${walletAddress}`)
  }

  // Legacy Profile Management (for backward compatibility)
  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.makeApiCall('/profiles/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response
  }

  async updateShopperProfile(updates: Partial<ShopperProfile>): Promise<ShopperProfile> {
    return this.makeApiCall('/profiles/shopper', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async updateExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile> {
    return this.makeApiCall('/profiles/expert', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async updateExpertOnlineStatus(isOnline: boolean): Promise<ExpertProfile> {
    return this.makeApiCall('/profiles/expert', {
      method: 'PUT',
      body: JSON.stringify({ isOnline }),
    })
  }

  async createSession(sessionData: CreateSessionRequest): Promise<SessionResponse> {
    return this.makeApiCall('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        expertId: sessionData.expertId,
        shopperId: sessionData.shopperId,
        startTime: sessionData.startTime,
        amount: sessionData.amount,
      }),
    })
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    return this.makeApiCall(`/sessions/${sessionId}`)
  }

  async getUserSessions(): Promise<SessionWithDetails[]> {
    const response = await this.makeApiCall('/sessions/list')
    return response.sessions || response
  }

  async updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<SessionResponse> {
    const payload: any = {}
    if (updates.status) payload.status = updates.status
    if (updates.endTime) payload.end_time = updates.endTime
    if (updates.paymentStatus) payload.payment_status = updates.paymentStatus
    if (updates.transactionHash) payload.transaction_hash = updates.transactionHash

    return this.makeApiCall(`/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async processPayment(paymentData: { sessionId: string; transactionHash: string }): Promise<any> {
    return this.makeApiCall('/payments/process', {
      method: 'POST',
      body: JSON.stringify({
        session_id: paymentData.sessionId,
        transaction_hash: paymentData.transactionHash,
      }),
    })
  }

  async getPaymentHistory(): Promise<any[]> {
    const response = await this.makeApiCall('/payments/history')
    return response.payments || response
  }

  async getExperts(): Promise<any[]> {
    return this.makeApiCall('/experts/list')
  }

  async getExpertById(expertId: string): Promise<any> {
    return this.makeApiCall(`/experts/${expertId}`)
  }

  async searchExperts(query: string, filters?: any): Promise<any[]> {
    const params = new URLSearchParams({ q: query })
    if (filters?.specialization) params.append('specialization', filters.specialization)
    if (filters?.isOnline !== undefined) params.append('isOnline', filters.isOnline.toString())
    if (filters?.minRating) params.append('minRating', filters.minRating.toString())
    if (filters?.maxSessionRate) params.append('maxSessionRate', filters.maxSessionRate.toString())

    return this.makeApiCall(`/experts/search?${params.toString()}`)
  }
}

// Factory function to get the appropriate data provider
export const createDataProvider = (): IDataProvider => {
  return new RemoteDataProvider()
}

// Singleton instance
export const dataProvider = createDataProvider()
