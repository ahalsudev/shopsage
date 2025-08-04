import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { AppConfig } from '@/constants/app-config'
import { useMutation } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react'
import { log } from '../../config/environment'
import { userService } from '../../services/userService'
import { UserCompleteProfile } from '../../types/auth'

export interface AuthState {
  isAuthenticated: boolean
  isRegistered: boolean
  isLoading: boolean
  user: UserCompleteProfile | null
  signIn: () => Promise<Account>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<UserCompleteProfile>) => Promise<void>
  enableRole: (role: 'shopper' | 'expert', profileData: any) => Promise<void>
  syncUserData: () => Promise<void>
}

const Context = createContext<AuthState>({} as AuthState)

export function useAuth() {
  const value = use(Context)
  if (!value) {
    throw new Error('useAuth must be wrapped in a <AuthProvider />')
  }

  return value
}

function useSignInMutation(onSignInSuccess?: (walletAddress: string) => void) {
  const { signIn } = useMobileWallet()

  return useMutation({
    mutationFn: async () => {
      console.log('Starting signIn with payload:', {
        uri: AppConfig.uri,
        domain: 'shopsage.site',
      })

      const result = await signIn({
        domain: 'shopsage.site',
        uri: AppConfig.uri,
        statement: 'Sign in to ShopSage',
        issuedAt: new Date().toISOString(),
        nonce: Math.random().toString(36).substring(2, 15),
      })

      // Call success callback if provided
      if (onSignInSuccess && result) {
        let address = result.publicKey.toString()
        onSignInSuccess(address)
      }

      return result
    },
  })
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { disconnect } = useMobileWallet()
  const { accounts, isLoading } = useAuthorization()
  const [profile, setProfile] = useState<UserCompleteProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [hasValidToken, setHasValidToken] = useState(false)

  // Initialize user on first sign in
  const onSignInSuccess = useCallback(async (walletAddress: string) => {
    setAuthLoading(true)
    await userService.saveWalletAddressLocally(walletAddress)
    setAuthLoading(false)
  }, [])

  const signInMutation = useSignInMutation(onSignInSuccess)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if we have a valid auth token
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)
        const token = await AsyncStorage.getItem('token')
        
        if (!token) {
          console.log('No auth token found, user needs to log in')
          setProfile(null)
          setHasValidToken(false)
          return
        }
        
        const userData = await userService.loadUserDataLocally()
        if (userData) {
          console.log('Loaded user data with valid token')
          setProfile(userData)
          setHasValidToken(true)
        } else {
          console.log('No user data found despite having token')
          // Token exists but no user data - clear token
          await AsyncStorage.removeItem('token')
          setProfile(null)
          setHasValidToken(false)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
        // Clear potentially corrupted data
        const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)
        await AsyncStorage.removeItem('token')
        setProfile(null)
        setHasValidToken(false)
      }
    }

    loadUserData()
  }, [])

  const user: UserCompleteProfile | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null

    const walletAddress = accounts[0].publicKey.toString()

    if (profile && profile.user.walletAddress === walletAddress) {
      return profile
    }
    return null
  }, [accounts, profile])

  const updateUser = async (updates: Partial<UserCompleteProfile>) => {
    try {
      if (updates.user) {
        const updatedUser: UserCompleteProfile = {
          user: updates.user,
          shopperProfile: updates.shopperProfile,
          expertProfile: updates.expertProfile
        };
        setProfile(updatedUser)
        await userService.saveUserDataLocally(updatedUser)
      } else {
        console.log("User data not saved locally");
      }
    } catch (error) {
      console.log('Error updating user data:', error)
      throw error
    }
  }

  const enableRole = async (role: 'shopper' | 'expert', profileData: any) => {
    try {
      setAuthLoading(true)
      log.info('Enabling role:', role)

      if (role === 'shopper') {
        const shopperProfile = await userService.createShopperProfile(profileData)
        if (user) {
          const updatedUser = {
            ...user,
            shopperProfile,
          }
          setProfile(updatedUser)
          await userService.saveUserDataLocally(updatedUser)
        }
      } else {
        const expertProfile = await userService.createExpertProfile(profileData)
        if (user) {
          const updatedUser = {
            ...user,
            expertProfile,
          }
          setProfile(updatedUser)
          await userService.saveUserDataLocally(updatedUser)
        }
      }
    } catch (error) {
      log.error('Failed to enable role:', error)
      throw error
    } finally {
      setAuthLoading(false)
    }
  }

  const syncUserData = async () => {
    try {
      setAuthLoading(true)
      log.info('Syncing user data')

      const syncedUser = await userService.syncUserData()
      if (syncedUser) {
        setProfile(syncedUser)
      }
    } catch (error) {
      log.error('Failed to sync user data:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    try {
      log.info('Starting sign out process')

      // Clear local state immediately
      setProfile(null)

      // Clear local storage
      try {
        await userService.clearUserDataLocally()
      } catch (storageError) {
        log.warn('Failed to clear local storage during signout:', storageError)
        // Continue with signout even if storage clearing fails
      }

      // Disconnect wallet last (this affects isAuthenticated)
      try {
        await disconnect()
      } catch (walletError) {
        log.warn('Failed to disconnect wallet:', walletError)
        // Continue - the important thing is that local state is cleared
      }

      log.info('User signed out successfully')

      // Verify data was actually cleared (for debugging)
      setTimeout(async () => {
        const userData = await userService.loadUserDataLocally()
        if (userData) {
          log.error('CRITICAL: User data still exists after signOut!', userData)
        } else {
          log.info('Verified: User data successfully cleared after signOut')
        }
      }, 100)
    } catch (error) {
      log.error('Failed to sign out:', error)
      // Clear local state even if there are errors
      setProfile(null)
      throw error
    }
  }

  const value: AuthState = useMemo(
    () => ({
      signIn: async () => {
        return await signInMutation.mutateAsync()
      },
      signOut,
      updateUser,
      enableRole,
      syncUserData,
      isAuthenticated: (accounts?.length ?? 0) > 0 && hasValidToken,
      isRegistered: profile !== null,
      isLoading: signInMutation.isPending || isLoading || authLoading,
      user,
    }),
    [
      accounts,
      signInMutation,
      isLoading,
      user,
      authLoading,
      signOut,
      updateUser,
      enableRole,
      syncUserData,
      hasValidToken
    ],
  )

  return <Context value={value}>{children}</Context>
}
