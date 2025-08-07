import { useAuth } from '@/components/auth/auth-provider'
import { GradientHeader } from '@/components/common/GradientHeader'
import { router, useFocusEffect } from 'expo-router'
import React, { useEffect, useState, useCallback } from 'react'
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { sessionService, SessionWithDetails } from '@/services/sessionService'
import { localSessionStorage } from '@/services/localSessionStorage'
import { LoadingSpinner, LoadingState } from '@/components/common/LoadingSpinner'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import { videoCallNavigation } from '@/utils/videoCallNavigation'
import PaymentStatusIndicator from '@/components/payments/PaymentStatusIndicator'
import { paymentService } from '@/services/paymentService'

interface Session {
  id: string
  expertId: string
  expertName: string
  expertSpecialization: string
  date: string
  duration: number
  status: 'completed' | 'cancelled' | 'upcoming' | 'pending' | 'active'
  cost: number
  rating?: number
  review?: string
  paymentStatus?: 'unpaid' | 'paid' | 'failed' | 'processing'
  transactionHash?: string
}

const SessionsScreen: React.FC = () => {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingPaymentStatus, setLoadingPaymentStatus] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    loadSessions()
  }, [])

  // Reload sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSessions(true)
    }, []),
  )

  const loadSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      let sessionData: SessionWithDetails[] = []

      // Try to get sessions from API first
      try {
        sessionData = await sessionService.getUserSessions()
      } catch (apiError) {
        console.warn('Failed to load sessions from API, trying local storage:', apiError)

        // Fallback to local storage
        const localSessions = await localSessionStorage.getSessions()
        sessionData = await Promise.all(
          localSessions.map((localSession) => localSessionStorage.convertToSessionWithDetails(localSession)),
        )
      }

      // Convert backend session format to component format with payment status
      const formattedSessions: Session[] = await Promise.all(sessionData.map(async (session: SessionWithDetails) => {
        // Get payment status for each session
        let paymentStatus: 'unpaid' | 'paid' | 'failed' | 'processing' = 'unpaid'
        try {
          if (session.transactionHash) {
            const payment = await paymentService.getSessionPaymentStatus(session.id)
            paymentStatus = payment.status
          } else if (session.paymentStatus === 'completed') {
            paymentStatus = 'paid'
          } else if (session.paymentStatus === 'failed') {
            paymentStatus = 'failed'
          }
        } catch (error) {
          console.warn(`Failed to get payment status for session ${session.id}:`, error)
        }

        return {
          id: session.id,
          expertId: session.expertId,
          expertName: session.expertName || 'Unknown Expert',
          expertSpecialization: session.expertSpecialization || 'General',
          date: session.startTime,
          duration: session.endTime
            ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60))
            : 5, // Calculate actual duration or default to 5 minutes
          status: mapSessionStatus(session.status),
          cost: parseFloat(session.amount || '0'),
          paymentStatus,
          transactionHash: session.transactionHash,
          // TODO: Add rating and review from backend when implemented
        }
      }))

      setSessions(formattedSessions)
    } catch (err) {
      console.error('Failed to load sessions from both API and local storage:', err)
      setError(err instanceof Error ? err.message : 'Failed to load sessions')
      setSessions([])
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const mapSessionStatus = (backendStatus: string): Session['status'] => {
    switch (backendStatus?.toLowerCase()) {
      case 'pending':
        return 'pending'
      case 'active':
        return 'active'
      case 'completed':
        return 'completed'
      case 'cancelled':
        return 'cancelled'
      default:
        console.warn(`Unknown session status: ${backendStatus}`)
        return 'pending'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return '#10b981'
      case 'active':
        return '#f59e0b'
      case 'pending':
      case 'upcoming':
        return '#6366f1'
      case 'cancelled':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const handleSessionPress = async (session: Session) => {
    // Check payment status before allowing session join
    if (session.status === 'upcoming' || session.status === 'pending') {
      if (session.paymentStatus === 'unpaid') {
        Alert.alert(
          'Payment Required',
          'This session requires payment before you can join. Please complete the payment to proceed.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Make Payment',
              onPress: () => {
                // Navigate to expert detail screen to make payment
                router.push(`/(expert)/detail?expertId=${session.expertId}`)
              },
            },
          ]
        )
        return
      } else if (session.paymentStatus === 'processing') {
        Alert.alert(
          'Payment Processing',
          'Your payment is still being processed. Please wait a few moments and try again.',
          [{ text: 'OK' }]
        )
        return
      } else if (session.paymentStatus === 'failed') {
        Alert.alert(
          'Payment Failed',
          'The payment for this session has failed. Please retry payment to join the session.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Retry Payment',
              onPress: () => {
                router.push(`/(expert)/detail?expertId=${session.expertId}`)
              },
            },
          ]
        )
        return
      }

      Alert.alert('Join Session', `Are you ready to start your consultation with ${session.expertName}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join Video Call',
          onPress: async () => {
            try {
              if (!user?.user?.id) {
                Alert.alert('Error', 'User not authenticated')
                return
              }

              // Check if video calling is available
              const isAvailable = await videoCallNavigation.isVideoCallAvailable()
              if (!isAvailable) {
                Alert.alert('Video Call Unavailable', 'Video calling is not configured. Please check your settings.')
                return
              }

              // Start video call with both participants
              await videoCallNavigation.startVideoCall({
                sessionId: session.id,
                userId: user.user.id,
                participantIds: [user.user.id, session.expertId],
              })
            } catch (error) {
              console.error('Failed to start video call:', error)
              Alert.alert('Error', 'Failed to start video call. Please try again.')
            }
          },
        },
      ])
    } else if (session.status === 'active') {
      // For active sessions, allow joining existing call
      Alert.alert('Rejoin Session', 'This session is already in progress. Would you like to rejoin?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rejoin Call',
          onPress: async () => {
            try {
              if (!user?.user?.id) {
                Alert.alert('Error', 'User not authenticated')
                return
              }

              await videoCallNavigation.joinVideoCall({
                sessionId: session.id,
                userId: user.user.id,
              })
            } catch (error) {
              console.error('Failed to join video call:', error)
              Alert.alert('Error', 'Failed to join video call. Please try again.')
            }
          },
        },
      ])
    } else {
      // Show session details with payment info
      const paymentInfo = session.transactionHash 
        ? `\n\nTransaction: ${session.transactionHash.substring(0, 8)}...`
        : ''
      Alert.alert(
        'Session Details',
        `Expert: ${session.expertName}\nStatus: ${session.status}\nPayment: ${session.paymentStatus || 'unknown'}${paymentInfo}`
      )
    }
  }

  const refreshPaymentStatus = async (sessionId: string) => {
    setLoadingPaymentStatus(prev => ({ ...prev, [sessionId]: true }))
    
    try {
      const paymentStatus = await paymentService.getSessionPaymentStatus(sessionId)
      
      // Update the session in the local state
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId 
            ? { ...session, paymentStatus: paymentStatus.status, transactionHash: paymentStatus.transactionHash }
            : session
        )
      )
    } catch (error) {
      console.error(`Failed to refresh payment status for session ${sessionId}:`, error)
    } finally {
      setLoadingPaymentStatus(prev => ({ ...prev, [sessionId]: false }))
    }
  }

  const handleRetry = () => {
    loadSessions()
  }

  const renderSessionCard = ({ item }: { item: Session }) => (
    <TouchableOpacity style={styles.sessionCard} onPress={() => handleSessionPress(item)}>
      <LinearGradient colors={['#fefefe', '#f8fafc']} style={styles.sessionCardGradient}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.expertName}>{item.expertName}</Text>
            <Text style={styles.specialization}>{item.expertSpecialization}</Text>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.sessionStatus}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.sessionDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>{item.duration} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Cost:</Text>
            <Text style={styles.detailValue}>{item.cost} SOL</Text>
          </View>
          {item.rating && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Rating:</Text>
              <Text style={styles.detailValue}>{'⭐'.repeat(item.rating)}</Text>
            </View>
          )}
        </View>

        {/* Payment Status */}
        {item.paymentStatus && (
          <View style={styles.paymentContainer}>
            <PaymentStatusIndicator 
              status={item.paymentStatus} 
              amount={item.cost} 
              compact={true}
            />
            {(item.paymentStatus === 'processing' || item.paymentStatus === 'failed') && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => refreshPaymentStatus(item.id)}
                disabled={loadingPaymentStatus[item.id]}
              >
                <Text style={styles.refreshButtonText}>
                  {loadingPaymentStatus[item.id] ? '⏳' : '🔄'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.review && (
          <View style={styles.reviewContainer}>
            <Text style={styles.reviewText}>&quot;{item.review}&quot;</Text>
          </View>
        )}

        {(item.status === 'upcoming' || item.status === 'pending') && (
          <View style={[
            styles.actionContainer,
            item.paymentStatus === 'unpaid' && { backgroundColor: '#ef4444' },
            item.paymentStatus === 'processing' && { backgroundColor: '#f59e0b' },
            item.paymentStatus === 'failed' && { backgroundColor: '#ef4444' }
          ]}>
            <Text style={styles.actionText}>
              {item.paymentStatus === 'unpaid' && 'Payment Required - Tap to Pay'}
              {item.paymentStatus === 'processing' && 'Payment Processing - Please Wait'}
              {item.paymentStatus === 'failed' && 'Payment Failed - Tap to Retry'}
              {item.paymentStatus === 'paid' && 'Tap to join session'}
              {!item.paymentStatus && 'Tap to join session'}
            </Text>
          </View>
        )}
        {item.status === 'active' && (
          <View style={[styles.actionContainer, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.actionText}>Tap to rejoin session</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GradientHeader title="My Sessions" subtitle="Your consultation history" />
        <SafeAreaView style={styles.contentContainer}>
          <LoadingSpinner message="Loading your sessions..." />
        </SafeAreaView>
      </View>
    )
  }

  if (error && sessions.length === 0) {
    return (
      <View style={styles.container}>
        <GradientHeader title="My Sessions" subtitle="Your consultation history" />
        <SafeAreaView style={styles.contentContainer}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Failed to Load Sessions</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <GradientHeader title="My Sessions" subtitle="Your consultation history" />
        <SafeAreaView style={styles.contentContainer}>
          {error && sessions.length > 0 && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>Some data may be outdated</Text>
            </View>
          )}
          {sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptyText}>
                You haven&apos;t booked any consultation sessions yet. Start by finding an expert!
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.emptyButtonText}>Find Experts</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={sessions}
              renderItem={renderSessionCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={() => loadSessions(true)}
            />
          )}
        </SafeAreaView>
      </View>
    </ErrorBoundary>
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
  listContainer: {
    padding: 16,
  },
  sessionCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  sessionCardGradient: {
    padding: 16,
    borderRadius: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#60faaa',
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#60a5fa',
  },
  sessionStatus: {
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
    fontSize: 12,
    fontWeight: '600',
  },
  sessionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  reviewContainer: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  actionContainer: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 4,
  },
  refreshButtonText: {
    fontSize: 16,
  },
})

export default SessionsScreen
