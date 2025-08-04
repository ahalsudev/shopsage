import { UserCompleteProfile } from '@/types/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { log } from '../config/environment'
import { dataProvider } from './dataProvider'
import { userService } from './userService'

export interface ConnectWalletResponse {
  token: string
  user: UserCompleteProfile
}

export const authService = {
  async connectWallet(
    walletAddress: string,
    name: string,
    email: string,
  ): Promise<ConnectWalletResponse> {
    try {
      log.info('AuthService: Registering user', {
        walletAddress,
        name,
        email,
      })

      // Use data provider abstraction
      const result = await dataProvider.registerUser(walletAddress, name, email)

      // Store token locally
      await AsyncStorage.setItem('token', result.token)

      console.log("<>>>>>>", result);
      

      // Save complete user data locally for persistence
      await userService.saveUserDataLocally(result.user)

      log.info('Connected user successfully:', result.user.user.name)

      return result
    } catch (error) {
      log.error('Failed to connect wallet:', error)
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
