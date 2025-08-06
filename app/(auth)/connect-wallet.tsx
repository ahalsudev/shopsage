import { useAuth } from '@/components/auth/auth-provider'
import { authService } from '@/services/authService'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ConnectWalletScreen() {
  const { isLoading, signIn } = useAuth()
  const router = useRouter()
  const [signingMessage] = useState(false)

  const handleConnect = async () => {
    let account = await signIn()
    const walletAddress = account.publicKey.toString()

    if (walletAddress) {
      const loginResponse = await authService.loginUser(walletAddress)
      
      if (loginResponse.status !== 404) {
        router.push('/(tabs)/explore')
      } else {
        console.log("Redirecting to complete profile page...");
        router.replace('/complete-profile')
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>Connect and sign in with your Solana wallet to access ShopSage securely</Text>
        </View>

        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, (isLoading || signingMessage) && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={isLoading || signingMessage}
        >
          <Text style={styles.connectButtonText}>
            {signingMessage ? 'Authenticating...' : isLoading ? 'Connecting...' : 'Connect & Sign In'}
          </Text>
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
