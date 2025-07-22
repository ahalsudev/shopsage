import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { AppConfig } from '@/constants/app-config'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react'

export interface User {
  id: string
  name?: string
  email?: string
  walletAddress: string
  userType?: 'shopper' | 'expert'
  isVerified?: boolean
  createdAt: string
}

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  signIn: () => Promise<Account>
  signOut: () => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
}

const Context = createContext<AuthState>({} as AuthState)
const USER_STORAGE_KEY = 'user-profile'

export function useAuth() {
  const value = use(Context)
  if (!value) {
    throw new Error('useAuth must be wrapped in a <AuthProvider />')
  }

  return value
}

function useSignInMutation() {
  const { signIn } = useMobileWallet()

  return useMutation({
    mutationFn: async () => {
      console.log('Starting signIn with payload:', {
        uri: AppConfig.uri,
        domain: 'shopsage.tech'
      })

      return await signIn({
        domain: 'shopsage.tech',
        uri: AppConfig.uri,
        statement: 'Sign in to ShopSage',
        issued_at: new Date().toISOString(),
        nonce: Math.random().toString(36).substring(2, 15),
      })
    },
  })
}


export function AuthProvider({ children }: PropsWithChildren) {
  const { disconnect } = useMobileWallet()
  const { accounts, isLoading } = useAuthorization()
  const signInMutation = useSignInMutation()
  const [storedUserData, setStoredUserData] = useState<Partial<User> | null>(null)

  useEffect(() => {
    const loadStoredUserData = async () => {
      try {
        const stored = await AsyncStorage.getItem(USER_STORAGE_KEY)
        if (stored) {
          setStoredUserData(JSON.parse(stored))
        }
      } catch (error) {
        console.error('Error loading stored user data:', error)
      }
    }

    loadStoredUserData()
  }, [])

  const user: User | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null

    const walletAddress = accounts[0].publicKey.toString()

    return {
      id: walletAddress,
      name: storedUserData?.name, // Default name, can be updated later
      walletAddress,
      userType: storedUserData?.userType, // Default to shopper, can be changed
      isVerified: false,
      createdAt: new Date().toISOString(),
    }
  }, [accounts, storedUserData])

  const updateUser = async (updates: Partial<User>) => {
    try {
      const newUserData = { ...storedUserData, ...updates }
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUserData))
      setStoredUserData(newUserData)
    } catch (error) {
      console.log('Error updating user data:', error)
      throw error;
    }
  }

  const value: AuthState = useMemo(
    () => ({
      signIn: async () => await signInMutation.mutateAsync(),
      signOut: async () => await disconnect(),
      updateUser,
      isAuthenticated: (accounts?.length ?? 0) > 0,
      isLoading: signInMutation.isPending || isLoading,
      user,
    }),
    [accounts, disconnect, signInMutation, isLoading, user, updateUser],
  )

  return <Context value={value}>{children}</Context>
}
