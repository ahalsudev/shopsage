import { GradientHeader } from '@/components/common/GradientHeader'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { router } from 'expo-router'
import React, { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { RootStackParamList } from '../_layout'

import { expertProgramService } from '@/services/expertProgramService'

type ExpertRegistrationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExpertRegistration'>

const ExpertRegistrationScreen: React.FC = () => {
  const navigation = useNavigation<ExpertRegistrationScreenNavigationProp>()
  const [isLoading, setIsLoading] = useState(false)

  const [specialization, setSpecialization] = useState('')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [sessionRate, setSessionRate] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')

  const handleCreateProfile = async () => {
    console.log('[Registration] ===== EXPERT REGISTRATION FORM SUBMITTED =====')
    console.log('[Registration] Form data:', { name, specialization, sessionRate, bio, profileImageUrl })
    
    if (!specialization.trim() || !sessionRate.trim() || !name.trim()) {
      Alert.alert('Error', 'Please fill in specialization, session rate and name')
      return
    }

    const rate = parseFloat(sessionRate)
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid session rate')
      return
    }

    const profileData = {
      name: name.trim(),
      specialization: specialization.trim(),
      bio: bio.trim() || undefined,
      sessionRate: rate,
      profileImageUrl: profileImageUrl.trim() || undefined,
    }

    try {
      setIsLoading(true)
      console.log('[Registration] Calling expertProgramService.registerExpertHybrid with:', profileData)
      const result = await expertProgramService.registerExpertHybrid(profileData)

      if (result.chainResult.signature) {
        Alert.alert('Success', 'Your expert profile has been created successfully!', [
          {
            text: 'OK',
            onPress: () => router.push('/(expert)/profile-management'),
          },
        ])
      } else {
        Alert.alert('Error', 'Failed to create expert profile')
      }
    } catch (error) {
      console.error('Error creating expert profile:', error)
      Alert.alert('Error', 'Failed to create expert profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <GradientHeader 
        title="Expert Registration"
        subtitle="Complete your profile to start helping shoppers"
      />
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
            />
          </View>

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
            style={[styles.createButton, isLoading && styles.createButtonDisabled]}
            onPress={handleCreateProfile}
            disabled={isLoading}
          >
            <Text style={styles.createButtonText}>
              {isLoading ? 'Creating Profile...' : 'Create Expert Profile'}
            </Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 Your profile will be reviewed before going live. You'll be notified once it's approved.
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
