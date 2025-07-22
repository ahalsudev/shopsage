import { Account, useAuthorization } from '@/components/solana/use-authorization'
import { useMobileWallet } from '@/components/solana/use-mobile-wallet'
import { AppConfig } from '@/constants/app-config'
import { useMutation } from '@tanstack/react-query'
import { createContext, type PropsWithChildren, use, useMemo } from 'react'

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
}

const Context = createContext<AuthState>({} as AuthState)

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
    mutationFn: async () =>
      await signIn({
        uri: AppConfig.uri,
      }),
  })
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { disconnect } = useMobileWallet()
  const { accounts, isLoading } = useAuthorization()
  const signInMutation = useSignInMutation()

  const user: User | null = useMemo(() => {
    if (!accounts || accounts.length === 0) return null
    
    // Create user object from wallet account
    return {
      id: accounts[0].publicKey.toString(),
      name: 'User', // Default name, can be updated later
      walletAddress: accounts[0].publicKey.toString(),
      userType: 'shopper', // Default to shopper, can be changed
      isVerified: false,
      createdAt: new Date().toISOString(),
    }
  }, [accounts])

  const value: AuthState = useMemo(
    () => ({
      signIn: async () => await signInMutation.mutateAsync(),
      signOut: async () => await disconnect(),
      isAuthenticated: (accounts?.length ?? 0) > 0,
      isLoading: signInMutation.isPending || isLoading,
      user,
    }),
    [accounts, disconnect, signInMutation, isLoading, user],
  )

  return <Context value={value}>{children}</Context>
}
