import { useCustomAlert } from '@/components/CustomAlert'
import { useAuth } from '@/components/auth/auth-provider'
import { GradientHeader } from '@/components/common/GradientHeader'
import { videoCallNavigation } from '@/utils/videoCallNavigation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Expert {
  id: string
  name: string
  specialization: string
  bio: string
  sessionRate: number
  rating: number
  totalConsultations: number
  isVerified: boolean
  isOnline: boolean
  avatar?: string
  bgColor?: string
}

const ExpertDetailScreen: React.FC = () => {
  const { expertId } = useLocalSearchParams()
  const router = useRouter()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { user } = useAuth()
  const [expert, setExpert] = useState<Expert | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExpert()
  }, [expertId])

  const loadExpert = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const { expertService } = await import('@/services/expertService')
      const expertData = await expertService.getExpertById(expertId as string)
      
      console.log('Loaded expert data:', expertData)
      
      if (!expertData) {
        throw new Error('Expert not found')
      }

      // Transform backend data to match our interface
      const transformedExpert: Expert = {
        id: expertData.id || expertData.userId,
        name: expertData.name || 'Unknown Expert',
        specialization: expertData.specialization || 'General',
        bio: expertData.bio || 'No bio available',
        sessionRate: expertData.sessionRate || 0.01,
        rating: expertData.rating || 4.0,
        totalConsultations: expertData.totalConsultations || 0,
        isVerified: expertData.isVerified || false,
        isOnline: expertData.isOnline || false,
        avatar: '👨‍💼', // Default avatar
        bgColor: '#6366f1' // Default color
      }
      
      setExpert(transformedExpert)
    } catch (error) {
      console.error('Failed to load expert:', error)
      setError('Failed to load expert details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookConsultation = async () => {
    if (!expert) return
    
    showAlert('Book Consultation', `Book a 5-minute consultation with ${expert.name} for ${expert.sessionRate} SOL?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Video Call',
        onPress: async () => {
          try {
            if (!user?.user?.id) {
              Alert.alert('Error', 'Please log in to book a consultation')
              return
            }

            // Check if we have authentication token
            const AsyncStorage = await import('@react-native-async-storage/async-storage').then((m) => m.default)
            const token = await AsyncStorage.getItem('token')
            console.log('Auth token available:', !!token)
            
            if (!token) {
              Alert.alert(
                'Authentication Required', 
                'You need to log in to book a consultation. Would you like to log in now?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Log In', 
                    onPress: () => router.push('/(auth)/connect-wallet')
                  }
                ]
              )
              return
            }

            // Check if video calling is available
            const isAvailable = await videoCallNavigation.isVideoCallAvailable()
            if (!isAvailable) {
              Alert.alert('Video Call Unavailable', 'Video calling is not configured. Please check your settings.')
              return
            }

            // First create a session in the backend
            const { sessionService } = await import('@/services/sessionService')
            
            const sessionData = {
              expertId: expertId as string,
              startTime: new Date().toISOString(),
              amount: expert.sessionRate.toString()
            }
            
            console.log('Creating session with data:', sessionData)
            console.log('User data:', user.user)
            const session = await sessionService.createSession(sessionData)
            console.log('Created session:', session)

            // Now start video call with the created session
            await videoCallNavigation.startVideoCall({
              sessionId: session.id,
              userId: user.user.id,
              participantIds: [user.user.id, expertId as string],
            })
          } catch (error) {
            console.error('Failed to start video call:', error)
            const errorMessage = error instanceof Error ? error.message : 'Failed to start video call. Please try again.'
            Alert.alert('Error', errorMessage)
          }
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GradientHeader 
          title="Loading Expert..."
          subtitle="Please wait"
        />
        <SafeAreaView style={styles.contentContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading expert details...</Text>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (error || !expert) {
    return (
      <View style={styles.container}>
        <GradientHeader 
          title="Expert Not Found"
          subtitle="Unable to load expert details"
        />
        <SafeAreaView style={styles.contentContainer}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Expert Not Found</Text>
            <Text style={styles.errorText}>{error || 'This expert could not be found.'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadExpert}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <GradientHeader 
        title={expert.name}
        subtitle={`${expert.specialization} Expert`}
      />
      <SafeAreaView style={styles.contentContainer}>
        <ScrollView style={styles.scrollView}>
          {/* Expert Header */}
          <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={[styles.avatar, { backgroundColor: expert.bgColor }]}>
              <Text style={styles.avatarText}>{expert.avatar}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.expertName}>{expert.name}</Text>
              <Text style={styles.specialization}>{expert.specialization}</Text>
              <View style={styles.statusContainer}>
                <View style={[styles.statusIndicator, { backgroundColor: expert.isOnline ? '#10b981' : '#6b7280' }]} />
                <Text style={styles.statusText}>{expert.isOnline ? 'Online' : 'Offline'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>⭐ {expert.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{expert.totalConsultations}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{expert.sessionRate} SOL</Text>
            <Text style={styles.statLabel}>Per Session</Text>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>{expert.bio}</Text>
        </View>

        {/* Consultation Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Details</Text>
          <View style={styles.consultationInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>5 minutes</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Price:</Text>
              <Text style={styles.infoValue}>{expert.sessionRate} SOL</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment:</Text>
              <Text style={styles.infoValue}>Solana blockchain</Text>
            </View>
          </View>
        </View>

        {/* Book Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.bookButton, !expert.isOnline && styles.bookButtonDisabled]}
            onPress={handleBookConsultation}
            disabled={!expert.isOnline}
          >
            <Text style={styles.bookButtonText}>{expert.isOnline ? 'Book Consultation' : 'Currently Offline'}</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
        {AlertComponent}
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
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 32,
    textAlign: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    padding: 24,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  consultationInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 24,
    backgroundColor: '#ffffff',
    marginTop: 8,
  },
  bookButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ExpertDetailScreen
