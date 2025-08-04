import { useAuth } from '@/components/auth/auth-provider'
import { userService } from '@/services/userService'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function CompleteProfile() {
  const { isLoading, updateUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const router = useRouter()

  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name')
      return
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email')
      return
    }

    try {
      let walletAddress = await userService.loadWalletAddressLocally()
      console.log('Starting registration with wallet:', walletAddress)

      // Add timeout for registration
      if (walletAddress !== null) {
        const registrationPromise = userService.registerUser({ walletAddress, name, email })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Registration timeout - backend may be unavailable')), 10000),
        )
  
        let response = await Promise.race([registrationPromise, timeoutPromise])
        let user = response.user
        console.log('Registration successful:', user, response.token)

        await updateUser({
          user: user.user,
          shopperProfile: user.shopper,
          expertProfile: user.expert,
        })
        router.push('/(tabs)/explore')
      }
    } catch (error) {
      console.error('Registration failed:', error)
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'Failed to register user', [
        { text: 'Retry', onPress: () => handleRegister() },
      ])
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Registration</Text>
          <Text style={styles.subtitle}>Add a name and email to complete registration</Text>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            autoCapitalize="words"
          />
        </View>

        {/* Email Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Your Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            autoCapitalize="words"
          />
        </View>
        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.connectButtonText}>{isLoading ? 'Registering...' : 'Register'}</Text>
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
