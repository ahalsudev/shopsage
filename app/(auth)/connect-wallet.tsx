import { useAuth } from '@/components/auth/auth-provider'
import { authService } from '@/services/authService'
import { userService } from '@/services/userService'
import { useRouter } from 'expo-router'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ConnectWalletScreen() {
  const { signIn, isLoading, updateUser } = useAuth()
  const router = useRouter()

  const handleConnect = async () => {
    try {
      // First check if user data exists locally (they haven't logged out)
      const existingUserData = await userService.loadUserDataLocally()

      // Connect wallet to get account
      let account = await signIn()
      const walletAddress = account.publicKey.toString()

      if (existingUserData && existingUserData.profile.walletAddress === walletAddress) {
        // User has local data for this wallet - just login with backend and redirect
        console.log('Found existing user data locally, logging in...')
        try {
          const loginResponse = await authService.loginUser(walletAddress)
          if (loginResponse !== 404) {
            // Update local data with any backend changes
            await updateUser({ profile: loginResponse.user.profile })
            router.push('/(profile)/home')
            return
          }
        } catch (error) {
          console.log('Backend login failed, using local data:', error)
          // Fallback to local data if backend fails
          router.push('/(profile)/home')
          return
        }
      }

      // No local data or different wallet - try to login with backend
      console.log('No local data found, checking if user exists in backend...')
      const loginResponse = await authService.loginUser(walletAddress)

      if (loginResponse === 404) {
        // User doesn't exist - redirect to registration
        console.log('User not found, redirecting to registration...')
        router.push('/complete-profile')
      } else {
        // User exists in backend - save their data and redirect to profile
        console.log('User found in backend, logging in...')
        await updateUser({ profile: loginResponse.user.profile })
        router.push('/(profile)/home')
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
