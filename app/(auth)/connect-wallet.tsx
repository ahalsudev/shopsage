import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConnectWalletScreen() {
  const { signIn, isLoading } = useAuth();
  const [userType, setUserType] = useState<'shopper' | 'expert'>('shopper');
  const [name, setName] = useState('');
  const router = useRouter();

  const handleConnect = async () => {

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    try {
      await signIn().then((accounts) => {
        console.log(accounts)
      });

      // Navigate based on user type
      if (userType === 'expert') {
        router.push('/(expert)/registration');
      } else {
        router.push('/(profile)/home');
      }
    } catch (error) {
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Failed to connect wallet');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect Your Wallet</Text>
          <Text style={styles.subtitle}>
            Connect your Solana wallet to get started with ShopSage
          </Text>
        </View>

        {/* User Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>I want to:</Text>
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'shopper' && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType('shopper')}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === 'shopper' && styles.userTypeTextActive,
                ]}
              >
                🛍️ Get Shopping Advice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'expert' && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType('expert')}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === 'expert' && styles.userTypeTextActive,
                ]}
              >
                🎯 Provide Expert Advice
              </Text>
            </TouchableOpacity>
          </View>
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
        {/* Connect Button */}
        <TouchableOpacity
          style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
          onPress={handleConnect}
          disabled={isLoading}
        >
          <Text style={styles.connectButtonText}>
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
});