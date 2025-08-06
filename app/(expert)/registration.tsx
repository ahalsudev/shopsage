import { AppDispatch, RootState } from '@/store'
import { createCurrentUserProfile } from '@/store/thunks/expertThunks'
import { GradientHeader } from '@/components/common/GradientHeader'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { RootStackParamList } from '../_layout'

type ExpertRegistrationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExpertRegistration'>

const ExpertRegistrationScreen: React.FC = () => {
  const navigation = useNavigation<ExpertRegistrationScreenNavigationProp>()
  const dispatch = useDispatch<AppDispatch>()
  const { profileLoading, profileError } = useSelector((state: RootState) => state.experts)

  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [sessionRate, setSessionRate] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')

  const handleCreateProfile = async () => {
    if (!specialization.trim() || !sessionRate.trim()) {
      Alert.alert('Error', 'Please fill in specialization and session rate')
      return
    }

    const rate = parseFloat(sessionRate)
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid session rate')
      return
    }

    const profileData = {
      specialization: specialization.trim(),
      bio: bio.trim() || undefined,
      sessionRate: rate,
      profileImageUrl: profileImageUrl.trim() || undefined,
    }

    try {
      const result = await dispatch(createCurrentUserProfile(profileData))

      if (createCurrentUserProfile.fulfilled.match(result)) {
        Alert.alert('Success', 'Your expert profile has been created successfully!', [
          {
            text: 'OK',
            onPress: () => router.push('/(expert)/profile-management'),
          },
        ])
      } else {
        Alert.alert('Error', (result.payload as string) || 'Failed to create expert profile')
      }
    } catch (error) {
      console.error('Error creating expert profile:', error)
      Alert.alert('Error', 'Failed to create expert profile. Please try again.')
    }
  }

  return (
    <View style={styles.container}>
      <GradientHeader title="Expert Registration" subtitle="Complete your profile to start helping shoppers" />
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {/* Specialization Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Specialization *</Text>
              <TextInput
                style={styles.input}
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g., Tech Support, Fashion Advice, Product Reviews"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Bio Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell shoppers about your expertise and experience"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Session Rate Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Session Rate (SOL) *</Text>
              <TextInput
                style={styles.input}
                value={sessionRate}
                onChangeText={setSessionRate}
                placeholder="0.05"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
              />
              <Text style={styles.helpText}>Rate per 5-minute consultation session</Text>
            </View>

            {/* Profile Image URL Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Profile Image URL</Text>
              <TextInput
                style={styles.input}
                value={profileImageUrl}
                onChangeText={setProfileImageUrl}
                placeholder="https://example.com/your-photo.jpg"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Create Profile Button */}
            <TouchableOpacity
              style={[styles.createButton, profileLoading && styles.createButtonDisabled]}
              onPress={handleCreateProfile}
              disabled={profileLoading}
            >
              <Text style={styles.createButtonText}>
                {profileLoading ? 'Creating Profile...' : 'Create Expert Profile'}
              </Text>
            </TouchableOpacity>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                💡 Your profile will be reviewed before going live. You&apos;ll be notified once it&apos;s approved.
              </Text>
            </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helpText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  createButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 16,
  },
  infoText: {
    color: '#1e40af',
    fontSize: 14,
    lineHeight: 20,
  },
})

export default ExpertRegistrationScreen
