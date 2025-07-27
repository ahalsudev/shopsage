import {
  CreateSessionRequest,
  SessionResponse,
  SessionWithDetails,
  UpdateSessionRequest,
} from '../services/sessionService';
import { CompleteUserProfile, ExpertProfile, ShopperProfile, User, UserProfile } from '../types/auth';
import { transformBackendUser } from '../utils/dataTransforms';

export interface IDataProvider {
  registerUser(walletAddress: string, name: string, email: string): Promise<{ user: User; token: string }>
  loginUser(walletAddress: string): Promise<{ user: User; token: string }>

  // New Multi-Role Profile Management
  getCompleteUserProfile(): Promise<CompleteUserProfile>
  createShopperProfile(profileData: Partial<ShopperProfile>): Promise<ShopperProfile>
  getShopperProfile(): Promise<ShopperProfile>
  createExpertProfile(profileData: Partial<ExpertProfile>): Promise<ExpertProfile>
  getExpertProfile(): Promise<ExpertProfile>
  
  // Legacy Profile Management (for backward compatibility)
  updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile>
  updateShopperProfile(updates: Partial<ShopperProfile>): Promise<ShopperProfile>
  updateExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile>

  // Sessions
  createSession(sessionData: CreateSessionRequest): Promise<SessionResponse>
  getSession(sessionId: string): Promise<SessionResponse>
  getUserSessions(): Promise<SessionWithDetails[]>
  updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<SessionResponse>

  // Experts
  getExperts(): Promise<any[]>
  getExpertById(expertId: string): Promise<any>
  searchExperts(query: string, filters?: any): Promise<any[]>
}

// Remote API Data Provider Implementation
class RemoteDataProvider implements IDataProvider {
  async loginUser(walletAddress: string): Promise<{ user: User; token: string }> {
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
    if (response.ok && response.token) {
      await AsyncStorage.setItem('token', response.token)
    }

    // Returns {"token": "eyJ0eX0...HTgh1U", "user": {"email": null, "id": "1d6c1c65-51fa-4658-b0a4-8bfccebabb51", "name": "Shopae", "userType": "shopper", "walletAddress": "9MKQ8y7W...aixxCCn"}}
    return response
  }

  private async makeApiCall(endpoint: string, options: RequestInit = {}): Promise<any> {
    const { AppConfig } = await import('../config/environment')
    const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)

    // Get authentication token
    const token = await AsyncStorage.getItem('token')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(`${AppConfig.api.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      return response.status
    }

    return response.json()
  }

  async registerUser(walletAddress: string, name: string, email: string): Promise<{ user: User; token: string }> {
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

    // Transform flat user object to our User structure
    if (response.user) {
      const user = transformBackendUser(response.user)
      return { ...response, user }
    }

    return response
  }

  async getUser(): Promise<User> {
    return this.makeApiCall('/auth/login')
  }

  async getCompleteUserProfile(): Promise<CompleteUserProfile> {
    return this.makeApiCall('/api/profiles/complete')
  }

  // New Multi-Role Profile Management
  async createShopperProfile(profileData: Partial<ShopperProfile>): Promise<ShopperProfile> {
    return this.makeApiCall('/api/profiles/shopper', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  }

  async getShopperProfile(): Promise<ShopperProfile> {
    return this.makeApiCall('/api/profiles/shopper')
  }

  async createExpertProfile(profileData: Partial<ExpertProfile>): Promise<ExpertProfile> {
    return this.makeApiCall('/api/profiles/expert', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  }

  async getExpertProfile(): Promise<ExpertProfile> {
    return this.makeApiCall('/api/profiles/expert')
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
    return this.makeApiCall('/api/profiles/shopper', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async updateExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile> {
    return this.makeApiCall('/api/profiles/expert', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async createSession(sessionData: CreateSessionRequest): Promise<SessionResponse> {
    return this.makeApiCall('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        expert_id: sessionData.expertId,
        start_time: sessionData.startTime,
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

  async getExperts(): Promise<any[]> {
    return this.makeApiCall('/experts')
  }

  async getExpertById(expertId: string): Promise<any> {
    return this.makeApiCall(`/experts/${expertId}`)
  }

  async searchExperts(query: string, filters?: any): Promise<any[]> {
    const params = new URLSearchParams({ q: query })
    if (filters?.specialization) params.append('specialization', filters.specialization)
    if (filters?.isOnline !== undefined) params.append('isOnline', filters.isOnline.toString())
    if (filters?.minRating) params.append('minRating', filters.minRating.toString())
    if (filters?.maxHourlyRate) params.append('maxHourlyRate', filters.maxHourlyRate.toString())

    return this.makeApiCall(`/experts/search?${params.toString()}`)
  }
}

// Factory function to get the appropriate data provider
export const createDataProvider = (): IDataProvider => {
  return new RemoteDataProvider()
}

// Singleton instance
export const dataProvider = createDataProvider()
