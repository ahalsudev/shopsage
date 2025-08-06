import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from '../config/environment'
import { ExpertProfile, ShopperProfile, UserCompleteProfile, UserProfile } from '../types/auth'
import { dataProvider } from './dataProvider'

const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  SHOPPER_PROFILE: 'shopper_profile',
  EXPERT_PROFILE: 'expert_profile',
  ACTIVE_ROLE: 'active_role',
  LAST_SYNC: 'last_sync',
  WALLET_ADDRESS: 'wallet_address',
} as const

export interface CreateShopperProfileRequest {
  preferences: {
    categories: string[]
    priceRange: { min: number; max: number }
  }
  interests: string[]
}

export interface RegisterUserRequest {
  walletAddress: string
  name: string
  email: string
}

export interface CreateExpertProfileRequest {
  specialization: string
  bio: string
  sessionRate: number
  availability: {
    schedule: { [key: string]: { start: string; end: string; available: boolean } }
    timezone: string
  }
  profileImageUrl?: string
}

export const userService = {
  async saveWalletAddressLocally(walletAddress: string): Promise<any> {
    return await AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, walletAddress)
  },
  async loadWalletAddressLocally(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS)
  },
  async saveUserDataLocally(user: UserCompleteProfile): Promise<void> {
    try {
      if (!user) {
        throw new Error('User is null or undefined')
      }

      if (!user.user) {
        throw new Error('User profile is null or undefined')
      }

      // Validate profile fields
      if (!user.user.id) {
        throw new Error('User profile.id is null or undefined')
      }

      if (!user.user.walletAddress) {
        throw new Error('User profile.walletAddress is null or undefined')
      }

      if (!user.user.name) {
        throw new Error('User profile.name is null or undefined')
      }

      log.info('Saving user data:', {
        walletAddress: user.user.walletAddress,
        name: user.user.name,
        hasShopperProfile: !!user.shopperProfile,
        hasExpertProfile: !!user.expertProfile,
      })

      const operations = [
        AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user.user)),
        AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString()),
        AsyncStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, user.user.walletAddress),
      ]

      // Handle shopper profile
      if (user.shopperProfile) {
        operations.push(AsyncStorage.setItem(STORAGE_KEYS.SHOPPER_PROFILE, JSON.stringify(user.shopperProfile)))
      } else {
        operations.push(AsyncStorage.removeItem(STORAGE_KEYS.SHOPPER_PROFILE))
      }

      // Handle expert profile
      if (user.expertProfile) {
        operations.push(AsyncStorage.setItem(STORAGE_KEYS.EXPERT_PROFILE, JSON.stringify(user.expertProfile)))
      } else {
        operations.push(AsyncStorage.removeItem(STORAGE_KEYS.EXPERT_PROFILE))
      }

      await Promise.all(operations)
      log.info('User data saved successfully to AsyncStorage')
    } catch (error) {
      log.error('Failed to save user data locally:', error)
      throw error
    }
  },

  async loadUserDataLocally(): Promise<UserCompleteProfile | null> {
    try {
      const [profileData, shopperData, expertData, lastSync, walletAddress] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SHOPPER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.EXPERT_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS),
      ])

      if (!profileData) {
        log.info('No profile data found in AsyncStorage')
        return null
      }

      const profile: UserProfile = JSON.parse(profileData)
      const shopperProfile: ShopperProfile | undefined = shopperData ? JSON.parse(shopperData) : undefined
      const expertProfile: ExpertProfile | undefined = expertData ? JSON.parse(expertData) : undefined

      const user: UserCompleteProfile = {
        user: profile,
        shopperProfile,
        expertProfile,
      }

      return user
    } catch (error) {
      console.error('Failed to load user data locally:', error)
      return null
    }
  },

  async clearUserDataLocally(): Promise<void> {
    try {
      log.info('Clearing all user data from AsyncStorage')

      // Clear each item individually to ensure proper clearing
      const keysToRemove = [
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.SHOPPER_PROFILE,
        STORAGE_KEYS.EXPERT_PROFILE,
        STORAGE_KEYS.LAST_SYNC,
        STORAGE_KEYS.WALLET_ADDRESS,
        'token', // API token
        'user-profile', // Legacy user profile key
        'pending_transactions',
        'authorization-cache',
      ]

      // Clear items one by one to avoid potential race conditions
      for (const key of keysToRemove) {
        try {
          await AsyncStorage.removeItem(key)
          log.info(`Cleared storage key: ${key}`)
        } catch (keyError) {
          log.warn(`Failed to clear storage key ${key}:`, keyError)
        }
      }

      log.info('Successfully cleared all user data from AsyncStorage')

      // Verify that data was actually cleared (for debugging)
      await this.verifyDataCleared()
    } catch (error) {
      log.error('Failed to clear user data locally:', error)
      throw error
    }
  },

  async verifyDataCleared(): Promise<void> {
    try {
      const checks = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.SHOPPER_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.EXPERT_PROFILE),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC),
        AsyncStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('user-profile'),
        AsyncStorage.getItem('pending_transactions'),
        AsyncStorage.getItem('authorization-cache'),
      ])

      const remainingData = checks.filter((item) => item !== null)
      if (remainingData.length > 0) {
        log.warn('Some data still remains in AsyncStorage after clearing:', remainingData)
      } else {
        log.info('Verified: All user data successfully cleared from AsyncStorage')
      }
    } catch (error) {
      log.warn('Failed to verify data cleared:', error)
    }
  },

  // New Multi-Role API calls
  async getUserCompleteProfile(): Promise<UserCompleteProfile> {
    try {
      log.info('UserService: Getting complete user profile')
      return await dataProvider.getUserCompleteProfile()
    } catch (error) {
      log.error('Failed to get complete user profile:', error)
      throw error
    }
  },

  async registerUser(payload: RegisterUserRequest): Promise<any> {
    return await dataProvider.registerUser(payload.walletAddress, payload.name, payload.email)
  },

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      return await dataProvider.updateUserProfile(updates)
    } catch (error) {
      log.error('Failed to update user profile:', error)
      throw error
    }
  },

  async createShopperProfile(profileData: CreateShopperProfileRequest): Promise<ShopperProfile> {
    try {
      log.info('UserService: Creating shopper profile', profileData)
      return await dataProvider.createShopperProfile(profileData)
    } catch (error) {
      log.error('Failed to create shopper profile:', error)
      throw error
    }
  },

  async updateShopperProfile(updates: Partial<ShopperProfile>): Promise<ShopperProfile> {
    try {
      log.info('UserService: Updating shopper profile', updates)
      return await dataProvider.updateShopperProfile(updates)
    } catch (error) {
      log.error('Failed to update shopper profile:', error)
      throw error
    }
  },

  async createExpertProfile(profileData: CreateExpertProfileRequest): Promise<ExpertProfile> {
    try {
      log.info('UserService: Creating expert profile', profileData)
      return await dataProvider.createExpertProfile(profileData)
    } catch (error) {
      log.error('Failed to create expert profile:', error)
      throw error
    }
  },

  async updateExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile> {
    try {
      log.info('UserService: Updating expert profile', updates)
      return await dataProvider.updateExpertProfile(updates)
    } catch (error) {
      log.error('Failed to update expert profile:', error)
      throw error
    }
  },

  // Hybrid methods that sync with both local and backend
  async syncUserData(): Promise<UserCompleteProfile | null> {
    try {
      // Try to get fresh data from backend
      const backendUser = await this.getUserCompleteProfile()

      // Save to local storage
      await this.saveUserDataLocally(backendUser)

      return backendUser
    } catch (error) {
      console.warn('Failed to sync with backend, using local data:', error)

      // Fallback to local data
      return await this.loadUserDataLocally()
    }
  },

  async updateAndSyncShopperProfile(updates: Partial<ShopperProfile>): Promise<ShopperProfile | null> {
    try {
      // Update backend first
      const updatedProfile = await this.updateShopperProfile(updates)

      // Update local storage
      const localUser = await this.loadUserDataLocally()
      if (localUser) {
        localUser.shopperProfile = updatedProfile
        await this.saveUserDataLocally(localUser)
      }

      return updatedProfile
    } catch (error) {
      console.error('Failed to update shopper profile:', error)
      return null
    }
  },

  async updateAndSyncExpertProfile(updates: Partial<ExpertProfile>): Promise<ExpertProfile | null> {
    try {
      // Update backend first
      const updatedProfile = await this.updateExpertProfile(updates)

      // Update local storage
      const localUser = await this.loadUserDataLocally()
      if (localUser) {
        localUser.expertProfile = updatedProfile
        await this.saveUserDataLocally(localUser)
      }

      return updatedProfile
    } catch (error) {
      console.error('Failed to update expert profile:', error)
      return null
    }
  },

  // Utility methods
  async isDataStale(maxAgeMinutes: number = 30): Promise<boolean> {
    try {
      const lastSyncStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC)
      if (!lastSyncStr) return true

      const lastSync = parseInt(lastSyncStr)
      const now = Date.now()
      const ageMinutes = (now - lastSync) / (1000 * 60)

      return ageMinutes > maxAgeMinutes
    } catch (error) {
      return true // Assume stale if we can't check
    }
  },

  async addSavedExpert(expertId: string): Promise<void> {
    try {
      const localUser = await this.loadUserDataLocally()
      if (localUser?.shopperProfile) {
        const savedExperts = [...localUser.shopperProfile.savedExperts]
        if (!savedExperts.includes(expertId)) {
          savedExperts.push(expertId)
          await this.updateAndSyncShopperProfile({
            savedExperts,
          })
        }
      }
    } catch (error) {
      console.error('Failed to add saved expert:', error)
    }
  },

  async removeSavedExpert(expertId: string): Promise<void> {
    try {
      const localUser = await this.loadUserDataLocally()
      if (localUser?.shopperProfile) {
        const savedExperts = localUser.shopperProfile.savedExperts.filter((id) => id !== expertId)
        await this.updateAndSyncShopperProfile({
          savedExperts,
        })
      }
    } catch (error) {
      console.error('Failed to remove saved expert:', error)
    }
  },

  async updateExpertOnlineStatus(isOnline: boolean): Promise<void> {
    try {
      await this.updateAndSyncExpertProfile({ isOnline })
    } catch (error) {
      console.error('Failed to update online status:', error)
    }
  },
}
