import { AccountFeature } from '@/components/account/account-feature'
import { useAuth } from '@/components/auth/auth-provider'
import { GradientHeader } from '@/components/common/GradientHeader'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { userService } from '@/services/userService'
import { ExpertProfile, ShopperProfile } from '@/types/auth'

export default function SettingsScreen() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [originalEmail, setOriginalEmail] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [isExpert, setIsExpert] = useState(false)
  const [shopperProfile, setShopperProfile] = useState<ShopperProfile | undefined>(undefined)
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | undefined>(undefined)

  const updateProfiles = useCallback(async () => {
    const userProfile = await userService.loadUserDataLocally()

    const shopperProfile = userProfile?.shopperProfile
    const expertProfile = userProfile?.expertProfile

    if (userProfile?.user.name && userProfile?.user.email) {
      setProfileName(userProfile.user?.name)
      setProfileEmail(userProfile.user?.email)
      setOriginalName(userProfile.user?.name)
      setOriginalEmail(userProfile.user?.email)
      setShopperProfile(shopperProfile)
    }

    if (expertProfile !== undefined) {
      setIsExpert(true)
      setExpertProfile(expertProfile)
    } else {
      setIsExpert(false)
      setExpertProfile(undefined)
    }
  }, [])

  useEffect(() => {
    updateProfiles()
  }, [updateProfiles])

  useFocusEffect(
    useCallback(() => {
      updateProfiles()
    }, [updateProfiles]),
  )

  const handleBecomeExpert = () => {
    Alert.alert('Become an Expert', 'Would you like to register as an expert to help others with shopping advice?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Register', onPress: () => router.push('/(expert)/registration') },
    ])
  }

  const handleManageExpertProfile = () => {
    router.push('/(expert)/profile-management')
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim() || !profileEmail.trim()) {
      Alert.alert('Error', 'Please fill in both name and email')
      return
    }

    if (profileName === originalName && profileEmail === originalEmail) {
      Alert.alert('Info', 'No changes to save')
      return
    }

    try {
      setIsUpdatingProfile(true)

      // Update user profile via userService
      const updatedProfile = await userService.updateUserProfile({
        name: profileName.trim(),
        email: profileEmail.trim(),
      })

      // Update local storage with the new data
      const currentUserData = await userService.loadUserDataLocally()
      if (currentUserData) {
        currentUserData.user = { ...currentUserData.user, ...updatedProfile }
        await userService.saveUserDataLocally(currentUserData)
      }

      // Update local state
      setOriginalName(profileName.trim())
      setOriginalEmail(profileEmail.trim())

      Alert.alert('Success', 'Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      Alert.alert('Error', 'Failed to update profile. Please try again.')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleCancelProfileChanges = () => {
    setProfileName(originalName)
    setProfileEmail(originalEmail)
  }

  const hasProfileChanges = profileName !== originalName || profileEmail !== originalEmail

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut()
            router.replace('/welcome')
          } catch (error) {
            Alert.alert('Error', 'Failed to sign out. Please try again.')
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="Settings" subtitle="Manage your profile and preferences" />
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Enter your name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={profileEmail}
                onChangeText={setProfileEmail}
                placeholder="Enter your email"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Profile Action Buttons */}
            {hasProfileChanges && (
              <View style={styles.profileActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelProfileChanges}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, isUpdatingProfile && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={isUpdatingProfile}
                >
                  <Text style={styles.saveButtonText}>{isUpdatingProfile ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Expert Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expert Services</Text>

            {!isExpert ? (
              <TouchableOpacity style={styles.expertButton} onPress={handleBecomeExpert}>
                <Text style={styles.expertButtonText}>Become an Expert</Text>
                <Text style={styles.expertButtonSubtext}>Help others with shopping advice and earn SOL</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.expertStatus}>
                  <Text style={styles.expertStatusText}>✅ You&apos;re registered as an expert</Text>
                </View>
                <TouchableOpacity style={styles.manageButton} onPress={handleManageExpertProfile}>
                  <Text style={styles.manageButtonText}>Manage Expert Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Wallet Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet & Payments</Text>
            <View style={styles.walletContainer}>
              <AccountFeature />
            </View>
          </View>

          {/* App Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Get notified about expert responses</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
                thumbColor={notificationsEnabled ? '#3b82f6' : '#9ca3af'}
              />
            </View>
          </View>

          {/* Session History */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Sessions</Text>

            <TouchableOpacity style={styles.infoRow} onPress={() => router.push('/(shopper)/sessions')}>
              <Text style={styles.infoText}>Session History</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>

            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoText}>Privacy Policy</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoText}>Terms of Service</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoText}>Help & Support</Text>
              <Text style={styles.infoArrow}>›</Text>
            </TouchableOpacity>

            <View style={styles.versionRow}>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </View>

          {/* Sign Out */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  expertButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  expertButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  expertButtonSubtext: {
    fontSize: 14,
    color: '#dbeafe',
    textAlign: 'center',
  },
  expertStatus: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  expertStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
  },
  manageButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  walletContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
  },
  infoArrow: {
    fontSize: 18,
    color: '#9ca3af',
  },
  versionRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
