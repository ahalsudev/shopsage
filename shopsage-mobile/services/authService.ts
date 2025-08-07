import { UserCompleteProfile } from '@/types/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from '../config/environment'
import { dataProvider } from './dataProvider'
import { userService } from './userService'

export interface ConnectWalletResponse {
  token: string
  user: UserCompleteProfile
}

export const authService = {
  async logout(): Promise<void> {
    try {
      // Clear JWT token
      await AsyncStorage.removeItem('token')
      // Clear user data
      await userService.clearUserDataLocally()

      log.info('User logged out successfully')
    } catch (error) {
      log.error('Error during logout:', error)
      throw error
    }
  },

  async isTokenValid(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) return false

      // Simple JWT expiration check (decode payload)
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Math.floor(Date.now() / 1000)

      return payload.exp > currentTime
    } catch (error) {
      log.error('Error checking token validity:', error)
      return false
    }
  },

  async refreshTokenIfNeeded(): Promise<void> {
    try {
      const isValid = await this.isTokenValid()
      if (!isValid) {
        log.info('Token expired or invalid, clearing session')
        await this.logout()
      }
    } catch (error) {
      log.error('Error refreshing token:', error)
      await this.logout()
    }
  },

  async loginUser(walletAddress: string): Promise<any> {
      const response = await dataProvider.loginUser(walletAddress)
      if (response && response.user) {
        if (response.token) {
          await userService.saveUserDataLocally(response.user)
        }
      }
      return response
  },
}
