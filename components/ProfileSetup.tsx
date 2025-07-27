import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Switch } from 'react-native'
import { useAuth } from '@/components/auth/auth-provider'

interface ProfileSetupProps {
  role: 'shopper' | 'expert'
  onComplete: () => void
  onCancel: () => void
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ role, onComplete, onCancel }) => {
  const { enableRole } = useAuth()
  const [loading, setLoading] = useState(false)

  // Shopper profile state
  const [categories, setCategories] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100 })

  // Expert profile state
  const [specialization, setSpecialization] = useState('')
  const [bio, setBio] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [timezone, setTimezone] = useState('UTC')

  // Common categories for shoppers
  const availableCategories = [
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Sports',
    'Books',
    'Beauty',
    'Automotive',
    'Health',
  ]

  // Common interests
  const availableInterests = ['Technology', 'Gaming', 'Fashion', 'Fitness', 'Cooking', 'Travel', 'Photography', 'Music']

  // Expert specializations
  const expertSpecializations = [
    'Tech Support',
    'Fashion Consulting',
    'Home Improvement',
    'Fitness Coaching',
    'Financial Advice',
    'Career Counseling',
    'Product Research',
    'DIY Projects',
  ]

  const toggleCategory = (category: string) => {
    setCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]))
  }

  const toggleInterest = (interest: string) => {
    setInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      if (role === 'shopper') {
        if (categories.length === 0) {
          Alert.alert('Error', 'Please select at least one category')
          return
        }

        const profileData = {
          preferences: {
            categories,
            priceRange,
          },
          interests,
        }

        await enableRole('shopper', profileData)
      } else {
        if (!specialization || !bio || !hourlyRate) {
          Alert.alert('Error', 'Please fill in all required fields')
          return
        }

        const rate = parseFloat(hourlyRate)
        if (isNaN(rate) || rate <= 0) {
          Alert.alert('Error', 'Please enter a valid hourly rate')
          return
        }

        const profileData = {
          specialization,
          bio,
          hourlyRate: rate,
          availability: {
            schedule: {
              monday: { start: '09:00', end: '17:00', available: true },
              tuesday: { start: '09:00', end: '17:00', available: true },
              wednesday: { start: '09:00', end: '17:00', available: true },
              thursday: { start: '09:00', end: '17:00', available: true },
              friday: { start: '09:00', end: '17:00', available: true },
              saturday: { start: '10:00', end: '16:00', available: false },
              sunday: { start: '10:00', end: '16:00', available: false },
            },
            timezone,
          },
        }

        await enableRole('expert', profileData)
      }

      onComplete()
    } catch (error) {
      Alert.alert('Setup Failed', error instanceof Error ? error.message : 'Failed to set up profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Set up your {role === 'shopper' ? 'Shopper' : 'Expert'} Profile</Text>
        <Text style={styles.subtitle}>
          {role === 'shopper'
            ? 'Help us personalize your shopping experience'
            : 'Let shoppers know about your expertise'}
        </Text>
      </View>

      {role === 'shopper' ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interested Categories</Text>
            <View style={styles.tagContainer}>
              {availableCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[styles.tag, categories.includes(category) && styles.tagSelected]}
                  onPress={() => toggleCategory(category)}
                >
                  <Text style={[styles.tagText, categories.includes(category) && styles.tagTextSelected]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Interests</Text>
            <View style={styles.tagContainer}>
              {availableInterests.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  style={[styles.tag, interests.includes(interest) && styles.tagSelected]}
                  onPress={() => toggleInterest(interest)}
                >
                  <Text style={[styles.tagText, interests.includes(interest) && styles.tagTextSelected]}>
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Range (SOL)</Text>
            <View style={styles.priceRange}>
              <View style={styles.priceInput}>
                <Text style={styles.priceLabel}>Min:</Text>
                <TextInput
                  style={styles.input}
                  value={priceRange.min.toString()}
                  onChangeText={(text) => setPriceRange((prev) => ({ ...prev, min: parseFloat(text) || 0 }))}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
              <View style={styles.priceInput}>
                <Text style={styles.priceLabel}>Max:</Text>
                <TextInput
                  style={styles.input}
                  value={priceRange.max.toString()}
                  onChangeText={(text) => setPriceRange((prev) => ({ ...prev, max: parseFloat(text) || 100 }))}
                  keyboardType="numeric"
                  placeholder="100"
                />
              </View>
            </View>
          </View>
        </>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specialization *</Text>
            <View style={styles.tagContainer}>
              {expertSpecializations.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[styles.tag, specialization === spec && styles.tagSelected]}
                  onPress={() => setSpecialization(spec)}
                >
                  <Text style={[styles.tagText, specialization === spec && styles.tagTextSelected]}>{spec}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bio *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell shoppers about your expertise and experience..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hourly Rate (SOL) *</Text>
            <TextInput
              style={styles.input}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              placeholder="0.01"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timezone</Text>
            <TextInput style={styles.input} value={timezone} onChangeText={setTimezone} placeholder="UTC" />
          </View>
        </>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>{loading ? 'Setting up...' : 'Complete Setup'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tagSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tagText: {
    fontSize: 14,
    color: '#333',
  },
  tagTextSelected: {
    color: 'white',
  },
  priceRange: {
    flexDirection: 'row',
    gap: 15,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
})
