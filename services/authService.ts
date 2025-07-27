import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { AppConfig, log } from '../config/environment'
import { User } from '../types/auth'
import { dataProvider } from './dataProvider'
import { userService } from './userService'

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

export interface ConnectWalletResponse {
  token: string
  user: User
}

export const authService = {
  async connectWallet(
    walletAddress: string,
    name: string,
    userType?: 'shopper' | 'expert',
  ): Promise<ConnectWalletResponse> {
    try {
      log.info('AuthService: Registering user', {
        walletAddress,
        name,
        userType,
        useRemoteApi: AppConfig.api.useRemoteApi,
      })

      // Use data provider abstraction
      const result = await dataProvider.registerUser(walletAddress, name, userType)

      // Store token locally
      await AsyncStorage.setItem('token', result.token)

      // Save complete user data locally for persistence
      await userService.saveUserDataLocally(result.user)

      log.info('Connected user successfully:', result.user.profile.name)

      return result
    } catch (error) {
      log.error('Failed to connect wallet:', error)

      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to connect wallet')
      }
      throw error
    }
  },

  async logout(): Promise<void> {
    await userService.clearUserDataLocally()
  },

  async loginUser(walletAddress: string): Promise<any> {
    try {
      // Use data provider abstraction
      const response = await dataProvider.loginUser(walletAddress)

      if (response && response.user) {
        // User is already transformed by dataProvider
        if (response.token) {
          // Update local storage with fresh data
          await userService.saveUserDataLocally(response.user)
        }

        return response
      }
      return response
    } catch (error) {
      // If it's a 404 or user not found, return the status code
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return 404
      }
      throw error
    }
  },
}
