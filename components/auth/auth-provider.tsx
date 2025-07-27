import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { AppConfig } from '@/constants/app-config'
import { useMutation } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react'
import { log } from '../../config/environment'
import { userService } from '../../services/userService'
import { CompleteUserProfile, User } from '../../types/auth'

export interface AuthState {
  isAuthenticated: boolean
  isRegistered: boolean
  isLoading: boolean
  user: User | null
  completeProfile: CompleteUserProfile | null
  signIn: () => Promise<Account>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
  enableRole: (role: 'shopper' | 'expert', profileData: any) => Promise<void>
  syncUserData: () => Promise<void>
  refreshCompleteProfile: () => Promise<void>
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
  const [regularUser, setRegularUser] = useState<User | null>(null)
  const [completeProfile, setCompleteProfile] = useState<CompleteUserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(false)

  // Initialize user on first sign in
  const onSignInSuccess = useCallback(async (walletAddress: string) => {
    setAuthLoading(true)
    await userService.saveWalletAddressLocally(walletAddress)
  }, [])

  const signInMutation = useSignInMutation(onSignInSuccess)

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await userService.loadUserDataLocally()
        if (userData) {
          setRegularUser(userData)
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    loadUserData()
  }, [])

  const user: User | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null

    const walletAddress = accounts[0].publicKey.toString()

    if (regularUser && regularUser.profile?.walletAddress === walletAddress) {
      return regularUser
    }
    return null
  }, [accounts, regularUser])

  const updateUser = async (updates: Partial<User>) => {
    try {
      // If we have a complete profile (like from registration), use it directly
      if (updates.profile && updates.profile.id) {
        const updatedUser: User = {
          profile: updates.profile,
          shopperProfile: updates.shopperProfile || regularUser?.shopperProfile,
          expertProfile: updates.expertProfile || regularUser?.expertProfile,
        }

        setRegularUser(updatedUser)
        await userService.saveUserDataLocally(updatedUser)
      }
      // Otherwise, update via backend
      else if (updates.profile?.name || updates.profile?.email) {
        const updatedProfile = await userService.updateUserProfile({
          name: updates.profile?.name,
          email: updates.profile?.email,
        })
        const updatedUser = { ...regularUser, profile: updatedProfile }

        setRegularUser(updatedUser)
        await userService.saveUserDataLocally(updatedUser)
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
          setRegularUser(updatedUser)
          await userService.saveUserDataLocally(updatedUser)
        }
      } else {
        const expertProfile = await userService.createExpertProfile(profileData)
        if (user) {
          const updatedUser = {
            ...user,
            expertProfile,
          }
          setRegularUser(updatedUser)
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
        setRegularUser(syncedUser)
      }
    } catch (error) {
      log.error('Failed to sync user data:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  const refreshCompleteProfile = async () => {
    try {
      setAuthLoading(true)
      log.info('Refreshing complete profile')

      const profile = await userService.getCompleteUserProfile()
      if (profile) {
        setCompleteProfile(profile)
        
        // Also update legacy user format for backward compatibility
        const legacyUser: User = {
          profile: profile.user,
          roles: profile.roles,
          shopperProfile: profile.shopperProfile,
          expertProfile: profile.expertProfile,
        }
        setRegularUser(legacyUser)
      }
    } catch (error) {
      log.error('Failed to refresh complete profile:', error)
    } finally {
      setAuthLoading(false)
    }
  }

  const signOut = async () => {
    try {
      log.info('Starting sign out process')

      // Clear local state immediately
      setRegularUser(null)
      setCompleteProfile(null)

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
      setRegularUser(null)
      setCompleteProfile(null)
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
      refreshCompleteProfile,
      isAuthenticated: (accounts?.length ?? 0) > 0,
      isRegistered: regularUser !== null,
      isLoading: signInMutation.isPending || isLoading || authLoading,
      user,
      completeProfile,
    }),
    [accounts, signInMutation, isLoading, user, completeProfile, authLoading, signOut, updateUser, enableRole, syncUserData, refreshCompleteProfile],
  )

  return <Context value={value}>{children}</Context>
}
