import { useAuth } from '@/components/auth/auth-provider'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authStateManager } from '../../utils/authStateManager'

export default function ConnectWalletScreen() {
  const { signIn, isLoading, updateUser, refreshRegistrationState } = useAuth()
  const router = useRouter()

  // Check for interrupted registration flow on component mount
  useEffect(() => {
    const checkForInterruptedFlow = async () => {
      const recovery = await authStateManager.recoverRegistrationFlow()
      
      if (recovery.shouldRedirectToRegistration) {
        console.log('[ConnectWallet] Detected interrupted registration flow, recovering...', recovery)
        
        if (recovery.step === 'complete-profile') {
          // User was in the middle of completing profile
          router.push('/complete-profile')
        } else if (recovery.step === 'connect-wallet') {
          // User was connecting wallet, they can continue here
          console.log('[ConnectWallet] User can continue with wallet connection')
        }
      }
    }

    checkForInterruptedFlow()
  }, [router])

  const handleConnect = async () => {
    try {
      console.log('[ConnectWallet] Starting wallet connection...')
      
      // First check if user data exists locally (they haven't logged out)
      const existingUserData = await userService.loadUserDataLocally()
      console.log('[ConnectWallet] Existing user data:', existingUserData ? 'Found' : 'None')

      // Connect wallet to get account
      console.log('[ConnectWallet] Calling signIn...')
      const account = await signIn()
      console.log('[ConnectWallet] SignIn result:', account ? 'Success' : 'Failed', account?.publicKey?.toString())
      
      if (!account || !account.publicKey) {
        throw new Error('Failed to get account from wallet connection')
      }
      
      const walletAddress = account.publicKey.toString()
      console.log('[ConnectWallet] Wallet connected:', walletAddress)

      // Refresh auth provider registration state (initial check)
      await refreshRegistrationState()

      if (existingUserData && existingUserData.user.walletAddress === walletAddress) {
        // User has local data for this wallet - just login with backend and redirect
        console.log('Found existing user data locally, logging in...')
        try {
          const loginResponse = await authService.loginUser(walletAddress)
          if (loginResponse !== 404) {            
            // Update local data with any backend changes
            await updateUser(loginResponse.user)
            await authStateManager.completeRegistrationFlow()
            router.push('/(tabs)/explore')
            return
          }
        } catch (error) {
          console.log('Backend login failed, using local data:', error)
          // Fallback to local data if backend fails
          await authStateManager.completeRegistrationFlow()
          router.push('/(tabs)/explore')
          return
        }
      }

      // No local data or different wallet - try to login with backend
      console.log('No local data found, checking if user exists in backend...')
      let loginResponse
      try {
        loginResponse = await authService.loginUser(walletAddress)
        console.log('[ConnectWallet] Login response:', loginResponse, 'Type:', typeof loginResponse)
      } catch (error) {
        console.error('[ConnectWallet] Login call threw error:', error)
        // Treat any error as user not found for now
        loginResponse = 404
      }

      if (loginResponse === 404) {
        // User doesn't exist - redirect to registration
        console.log('[ConnectWallet] User not found, starting registration flow...')
        
        try {
          await authStateManager.startRegistrationFlow(walletAddress)
          console.log('[ConnectWallet] Registration flow started')
          
          await authStateManager.updateRegistrationStep('complete-profile')
          console.log('[ConnectWallet] Registration step updated to complete-profile')
          
          // Update auth provider registration state so isAuthenticated becomes true
          await refreshRegistrationState()
          console.log('[ConnectWallet] Auth provider registration state refreshed')
          
          // Add a small delay to ensure state updates have propagated
          await new Promise(resolve => setTimeout(resolve, 100))
          
          console.log('[ConnectWallet] Navigating to complete-profile...')
          router.push('/complete-profile')
        } catch (error) {
          console.error('[ConnectWallet] Error setting up registration:', error)
          throw error
        }
      } else {
        // User exists in backend - save their data and redirect
        console.log('User found in backend, logging in...')
        await updateUser(loginResponse.user)
        
        // Check if user has profiles to decide where to redirect
        const hasShopperProfile = loginResponse.user.shopperProfile
        const hasExpertProfile = loginResponse.user.expertProfile
        
        if (!hasShopperProfile && !hasExpertProfile) {
          // User exists but has no profiles - redirect to complete profile
          await authStateManager.updateRegistrationStep('complete-profile')
          router.push('/complete-profile')
        } else {
          // User has at least one profile - redirect to main app
          await authStateManager.completeRegistrationFlow()
          router.push('/(tabs)/explore')
        }
      }
    } catch (error) {
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Failed to connect wallet')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>Connect your Solana wallet to get started with ShopSage</Text>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={isLoading}
        >
          <Text style={styles.connectButtonText}>{isLoading ? 'Connecting...' : 'Connect Wallet'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  userTypeContainer: {
    gap: 12,
  },
  userTypeButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  userTypeButtonActive: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  userTypeText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  userTypeTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
  },
  demoButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  demoButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  connectButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
