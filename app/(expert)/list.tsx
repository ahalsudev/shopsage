import { RootState } from '@/store'
import { fetchExpertsFailure, fetchExpertsStart, fetchExpertsSuccess } from '@/store/slices/expertSlice'
import { GradientHeader } from '@/components/common/GradientHeader'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

const ExpertListScreen: React.FC = () => {
  const dispatch = useDispatch()
  const { experts, isLoading, error } = useSelector((state: RootState) => state.experts)
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredExperts, setFilteredExperts] = useState(experts)

  useEffect(() => {
    loadExperts()
  }, [])

  useEffect(() => {
    filterExperts()
  }, [searchQuery, experts])

  const loadExperts = async () => {
    dispatch(fetchExpertsStart())
    try {
      const { expertService } = await import('@/services/expertService')
      const expertsData = await expertService.getExperts()
      console.log('Loaded experts from backend:', expertsData)
      dispatch(fetchExpertsSuccess(expertsData))
    } catch (error) {
      console.error('Failed to load experts:', error)
      dispatch(fetchExpertsFailure('Failed to load experts'))
    }
  }

  const filterExperts = () => {
    const filtered = experts.filter(
      (expert) =>
        expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expert.specialization.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredExperts(filtered)
  }

  interface Expert {
    id: string
    userId: string
    name: string
    specialization: string
    bio: string
    sessionRate: number
    rating: number
    totalConsultations: number
    isVerified: boolean
    isOnline: boolean
  }

  const handleExpertPress = (expert: Expert) => {
    router.push(`/(expert)/detail?expertId=${expert.id}`)
  }

  const renderExpertCard = ({ item }: { item: Expert }) => (
    <TouchableOpacity style={styles.expertCard} onPress={() => handleExpertPress(item)}>
      <View style={styles.expertHeader}>
        <View style={styles.expertInfo}>
          <Text style={styles.expertName}>{item.name}</Text>
          <Text style={styles.expertSpecialization}>{item.specialization}</Text>
        </View>
        <View style={styles.expertStatus}>
          <View style={[styles.onlineIndicator, { backgroundColor: item.isOnline ? '#10b981' : '#6b7280' }]} />
          <Text style={styles.onlineText}>{item.isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      <Text style={styles.expertBio} numberOfLines={2}>
        {item.bio}
      </Text>

      <View style={styles.expertFooter}>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {item.rating}</Text>
          <Text style={styles.consultations}>({item.totalConsultations} sessions)</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.sessionRate} SOL</Text>
          <Text style={styles.priceLabel}>per session</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GradientHeader 
          title="Find Experts"
          subtitle="Connect with verified shopping experts"
        />
        <SafeAreaView style={styles.contentContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading experts...</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <GradientHeader 
        title="Find Experts"
        subtitle="Connect with verified shopping experts"
      />
      <SafeAreaView style={styles.contentContainer}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search experts or specializations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* Expert List */}
      <FlatList
        data={filteredExperts}
        renderItem={renderExpertCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
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
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  listContainer: {
    padding: 16,
  },
  expertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expertInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  expertSpecialization: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  expertStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#6b7280',
  },
  expertBio: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 4,
  },
  consultations: {
    fontSize: 12,
    color: '#6b7280',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 16,
    margin: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
})

export default ExpertListScreen
