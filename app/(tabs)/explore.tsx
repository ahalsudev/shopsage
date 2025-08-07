import { GradientHeader } from '@/components/common/GradientHeader'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

interface Expert {
  id: string
  name: string
  specialization: string
  bio: string
  sessionRate: number
  rating: number
  totalConsultations: number
  totalRaters: number
  isOnline: boolean
  categories: string[]
  products: string[]
  avatar: string
  bgColor: string
}

export default function ExploreScreen() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [experts, setExperts] = useState<Expert[]>([])
  const [filteredExperts, setFilteredExperts] = useState<Expert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    loadExperts()
  }, [])

  useEffect(() => {
    smartSearch()
    generateSuggestions()
  }, [searchQuery, experts])

  const loadExperts = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setIsLoading(true)
      }
      const { expertService } = await import('@/services/expertService')
      const expertsData = await expertService.getExperts()
      const expertsList = expertsData["experts"]
      

      // Check if we got valid data
      if (!expertsData) {
        throw new Error('No data received from backend')
      }

      // Handle different response formats
      // Transform backend data to match the Expert interface
      const transformedExperts: Expert[] = expertsList.map((expert, index) => ({
        ...expert,
        id: expert.id || expert.userId,
        name: expert.name || 'Unknown Expert',
        specialization: expert.specialization || 'General',
        bio: expert.bio || 'Experienced consultant ready to help you make informed purchasing decisions.',
        sessionRate: expert.sessionRate || 0.01,
        rating: expert.rating || 4.0,
        totalConsultations: expert.totalConsultations || 0,
        totalRaters: expert.totalRaters || expert.totalConsultations || Math.floor(Math.random() * 200) + 50, // Generate realistic rater count
        isOnline: expert.isOnline || false,
        categories: [expert.specialization || 'General'], // Example: derive categories from specialization
        products: [], // Placeholder, populate from actual data if available
        avatar: ['👗', '📱', '🏠', '💪', '💄'][index % 5], // Fallback avatar
        bgColor: ['#60faaa', '#3b82f6', '#60a5fa', '#60faaa', '#3b82f6'][index % 5], // Fallback colors
      }))

      console.log('Transformed experts:', transformedExperts)
      setExperts(transformedExperts)
      setFilteredExperts(transformedExperts)
    } catch (error) {
      console.error('Failed to load experts:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const generateSuggestions = () => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }

    const query = searchQuery.toLowerCase()
    const allProducts = experts.flatMap((expert) => expert.products)
    const allCategories = experts.flatMap((expert) => expert.categories)
    const allTerms = [...new Set([...allProducts, ...allCategories])]

    const matchingSuggestions = allTerms
      .filter((term) => term.toLowerCase().includes(query) && term.toLowerCase() !== query)
      .slice(0, 5)

    setSuggestions(matchingSuggestions)
  }

  const smartSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredExperts(experts)
      setSuggestions([])
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = experts.filter((expert) => {
      // Search by expert name
      if (expert.name.toLowerCase().includes(query)) return true

      // Search by specialization
      if (expert.specialization.toLowerCase().includes(query)) return true

      // Smart product matching
      const matchesProduct = expert.products.some(
        (product) => product.toLowerCase().includes(query) || query.includes(product.toLowerCase()),
      )

      // Category matching
      const matchesCategory = expert.categories.some((category) => category.toLowerCase().includes(query))

      return matchesProduct || matchesCategory
    })

    // Sort by relevance (online experts first, then by rating)
    filtered.sort((a, b) => {
      if (a.isOnline && !b.isOnline) return -1
      if (!a.isOnline && b.isOnline) return 1
      return b.rating - a.rating
    })

    setFilteredExperts(filtered)
  }

  const handleExpertPress = (expert: Expert) => {
    router.push(`/(expert)/detail?expertId=${expert.id}`)
  }

  const renderExpertCard = (expert: Expert) => (
    <TouchableOpacity key={expert.id} style={styles.expertCard} onPress={() => handleExpertPress(expert)}>
      {/* Avatar Section */}
      <View style={[styles.avatarSection, { backgroundColor: expert.bgColor }]}>
        <Text style={styles.avatarEmoji}>{expert.avatar}</Text>
        <View style={styles.onlineIndicatorCard}>
          <View style={[styles.onlineIndicator, { backgroundColor: expert.isOnline ? '#10b981' : '#6b7280' }]} />
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.expertName} numberOfLines={1}>
          {expert.name}
        </Text>
        <Text style={styles.expertSpecialization} numberOfLines={1}>
          {expert.specialization}
        </Text>

        <Text style={styles.expertBio} numberOfLines={2}>
          {expert.bio}
        </Text>

        <View style={styles.expertFooter}>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {expert.rating}</Text>
            <Text style={styles.raters}>({expert.totalRaters} raters)</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{expert.sessionRate} SOL</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <GradientHeader title="Find Shopping Experts" subtitle="Get personalized advice for any product" />
      <SafeAreaView style={styles.contentContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by product, category, or expert..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={() => setSearchQuery('')}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => setSearchQuery(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Search Results */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadExperts(true)}
              colors={['#3b82f6']}
              tintColor="#3b82f6"
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Finding experts...</Text>
            </View>
          ) : filteredExperts.length > 0 ? (
            <>
              {searchQuery ? (
                <Text style={styles.resultsText}>
                  Found {filteredExperts.length} expert{filteredExperts.length !== 1 ? 's' : ''} for &quot;{searchQuery}
                  &quot;
                </Text>
              ) : (
                <Text style={styles.resultsText}>Available Experts</Text>
              )}
              <View style={styles.expertGrid}>{filteredExperts.map(renderExpertCard)}</View>
            </>
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsTitle}>No experts found</Text>
              <Text style={styles.noResultsSubtitle}>
                Try searching for products like &quot;iPhone&quot;, &quot;dress&quot;, or &quot;furniture&quot;
              </Text>
            </View>
          )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
    zIndex: 1000,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#60faaa',
    borderRadius: 16,
    shadowColor: '#60faaa',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#3b82f6',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    backgroundColor: '#fefefe',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f8fafc',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  suggestionText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  resultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 16,
  },
  expertGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  expertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '48%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  avatarSection: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  onlineIndicatorCard: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cardContent: {
    padding: 12,
  },
  expertName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 2,
  },
  expertSpecialization: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 8,
  },
  expertBio: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 15,
    marginBottom: 12,
    minHeight: 30,
    fontStyle: 'italic',
  },
  expertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 2,
  },
  raters: {
    fontSize: 10,
    color: '#60a5fa',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60faaa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#60a5fa',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: '#60a5fa',
    textAlign: 'center',
    lineHeight: 20,
  },
})
