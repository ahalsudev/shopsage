import { ExpertProfile } from '@/types/auth'
import { log } from '../config/environment'
import { dataProvider } from './dataProvider'

export interface CreateExpertProfileRequest {
  specialization: string
  bio?: string
  sessionRate: number
  profileImageUrl?: string
}

export interface UpdateExpertProfileRequest {
  specialization?: string
  bio?: string
  sessionRate?: number
  profileImageUrl?: string
  isOnline?: boolean
}

export const expertService = {
  async createProfile(profileData: CreateExpertProfileRequest): Promise<ExpertProfile> {
    try {
      // const response = await api.post('/profiles/expert', profileData)
      const response = await dataProvider.createExpertProfile(profileData);
      return response
    } catch (error) {
      throw error
    }
  },

  async getProfile(): Promise<ExpertProfile> {
    try {
      return await dataProvider.getExpertProfile()
    } catch (error) {
      log.error('Failed to get expert profile:', error)
      throw error
    }
  },

  async updateProfile(profileData: UpdateExpertProfileRequest): Promise<ExpertProfile> {
    try {
      return await dataProvider.updateExpertProfile(profileData)
    } catch (error) {
      log.error('Failed to update expert profile:', error)
      throw error
    }
  },

  async getExperts(): Promise<ExpertProfile[]> {
    try {
      log.info('ExpertService: Getting experts')
      return await dataProvider.getExperts()
    } catch (error) {
      log.error('Failed to get experts:', error)
      throw error
    }
  },

  async getExpertById(expertId: string): Promise<ExpertProfile> {
    try {
      log.info('ExpertService: Getting expert by ID', { expertId })
      return await dataProvider.getExpertById(expertId)
    } catch (error) {
      log.error('Failed to get expert by ID:', error)
      throw error
    }
  },

  async toggleOnlineStatus(isOnline: boolean): Promise<ExpertProfile> {
    try {
      return await dataProvider.updateExpertOnlineStatus(isOnline)
    } catch (error) {
      log.error('Failed to update online status:', error)
      throw error
    }
  },
}
