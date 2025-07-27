import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { dataProvider } from './dataProvider'
import { AppConfig, log } from '../config/environment'

const API_BASE_URL = AppConfig.api.baseUrl

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface ExpertProfile {
  id: string
  userId: string
  specialization: string
  bio: string | null
  hourlyRate: number
  rating: number
  totalConsultations: number
  isVerified: boolean
  isOnline: boolean
  profileImageUrl: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateExpertProfileRequest {
  specialization: string
  bio?: string
  hourlyRate: number
  profileImageUrl?: string
}

export interface UpdateExpertProfileRequest {
  specialization?: string
  bio?: string
  hourlyRate?: number
  profileImageUrl?: string
  isOnline?: boolean
}

export const expertService = {
  async createProfile(profileData: CreateExpertProfileRequest): Promise<ExpertProfile> {
    try {
      const response = await api.post('/experts/profile', profileData)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to create expert profile')
      }
      throw error
    }
  },

  async getProfile(): Promise<ExpertProfile> {
    try {
      const response = await api.get('/experts/profile')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get expert profile')
      }
      throw error
    }
  },

  async updateProfile(profileData: UpdateExpertProfileRequest): Promise<ExpertProfile> {
    try {
      const response = await api.put('/experts/profile', profileData)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to update expert profile')
      }
      throw error
    }
  },

  async getExperts(): Promise<ExpertProfile[]> {
    try {
      log.info('ExpertService: Getting experts')
      return await dataProvider.getExperts()
    } catch (error) {
      log.error('Failed to get experts:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get experts')
      }
      throw error
    }
  },

  async getExpertById(expertId: string): Promise<ExpertProfile> {
    try {
      log.info('ExpertService: Getting expert by ID', { expertId })
      return await dataProvider.getExpertById(expertId)
    } catch (error) {
      log.error('Failed to get expert by ID:', error)
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get expert')
      }
      throw error
    }
  },

  async toggleOnlineStatus(isOnline: boolean): Promise<ExpertProfile> {
    try {
      const response = await api.patch('/experts/profile/status', { isOnline })
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to update online status')
      }
      throw error
    }
  },
}
