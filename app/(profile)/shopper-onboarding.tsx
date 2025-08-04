import { useAuth } from '@/components/auth/auth-provider'
import { GradientHeader } from '@/components/common/GradientHeader'
import { dataProvider } from '@/services/dataProvider'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const categories = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports',
  'Books',
  'Automotive',
  'Health',
  'Food & Cooking',
  'Travel',
  'Photography',
]

const interests = [
  'Technology',
  'Gaming',
  'Fashion',
  'Fitness',
  'Cooking',
  'Travel',
  'Photography',
  'Music',
  'Reading',
  'Sports',
]

export default function ShopperOnboarding() {
  const { syncUserData, isLoading } = useAuth()
  const router = useRouter()
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: 0.01, max: 1.0 })

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) => (prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]))
  }

  const handleComplete = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Categories Required', 'Please select at least one category of interest.')
      return
    }

    if (selectedInterests.length === 0) {
      Alert.alert('Interests Required', 'Please select at least one interest.')
      return
    }

    try {
      const shopperProfileData = {
        preferences: {
          categories: selectedCategories,
          priceRange: { min: priceRange.min, max: priceRange.max },
        },
        interests: selectedInterests,
        preferredExperts: [],
        savedExperts: [],
        totalSessions: 0,
        totalSpent: 0,
        averageRating: 0,
      }

      await dataProvider.createShopperProfile(shopperProfileData)
      await syncUserData()

      Alert.alert('Welcome, Shopper!', 'Your shopper profile has been created successfully.', [
        { text: 'Get Started', onPress: () => router.push('/(shopper)/sessions') },
      ])
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create shopper profile')
    }
  }

  return (
    <View style={styles.container}>
      <GradientHeader 
        title="Become a Shopper"
        subtitle="Tell us about your interests to get personalized expert recommendations"
      />
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView style={styles.scrollView}>

        {/* Categories Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shopping Categories</Text>
          <Text style={styles.sectionDescription}>What types of products are you interested in?</Text>
          <View style={styles.tagsContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[styles.tag, selectedCategories.includes(category) && styles.selectedTag]}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[styles.tagText, selectedCategories.includes(category) && styles.selectedTagText]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Interests Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Interests</Text>
          <Text style={styles.sectionDescription}>What are your hobbies and interests?</Text>
          <View style={styles.tagsContainer}>
            {interests.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[styles.tag, selectedInterests.includes(interest) && styles.selectedTag]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={[styles.tagText, selectedInterests.includes(interest) && styles.selectedTagText]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Range Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Range</Text>
          <Text style={styles.sectionDescription}>What's your typical budget for expert consultations?</Text>
          <View style={styles.priceOptions}>
            {[
              { label: '$0.01 - $0.50', min: 0.01, max: 0.5 },
              { label: '$0.50 - $1.00', min: 0.5, max: 1.0 },
              { label: '$1.00 - $2.00', min: 1.0, max: 2.0 },
              { label: '$2.00+', min: 2.0, max: 10.0 },
            ].map((range) => (
              <TouchableOpacity
                key={range.label}
                style={[styles.priceOption, priceRange.min === range.min && styles.selectedPriceOption]}
                onPress={() => setPriceRange({ min: range.min, max: range.max })}
              >
                <Text style={[styles.priceOptionText, priceRange.min === range.min && styles.selectedPriceOptionText]}>
                  {range.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.completeButton, isLoading && styles.disabledButton]}
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text style={styles.completeButtonText}>{isLoading ? 'Creating Profile...' : 'Complete Shopper Setup'}</Text>
        </TouchableOpacity>
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
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedTag: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tagText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#ffffff',
  },
  priceOptions: {
    gap: 8,
  },
  priceOption: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedPriceOption: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f0ff',
  },
  priceOptionText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  selectedPriceOptionText: {
    color: '#6366f1',
  },
  completeButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
})
