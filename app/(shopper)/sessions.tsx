import { useAuth } from '@/components/auth/auth-provider';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { sessionService, SessionWithDetails } from '@/services/sessionService';
import { LoadingSpinner, LoadingState } from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface Session {
  id: string;
  expertId: string;
  expertName: string;
  expertSpecialization: string;
  date: string;
  duration: number;
  status: 'completed' | 'cancelled' | 'upcoming' | 'pending' | 'active';
  cost: number;
  rating?: number;
  review?: string;
}

const SessionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      
      const sessionData = await sessionService.getUserSessions();
      
      // Convert backend session format to component format
      const formattedSessions: Session[] = sessionData.map((session: SessionWithDetails) => ({
        id: session.id,
        expertId: session.expertId,
        expertName: session.expertName,
        expertSpecialization: session.expertSpecialization,
        date: session.startTime,
        duration: 5, // Default duration - could be calculated from start/end time
        status: mapSessionStatus(session.status),
        cost: parseFloat(session.amount),
        // TODO: Add rating and review from backend when implemented
      }));
      
      setSessions(formattedSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
      
      // Fallback to mock data if API fails
      const mockSessions: Session[] = [
        {
          id: '1',
          expertId: '1',
          expertName: 'Dr. Sarah Johnson',
          expertSpecialization: 'Fashion & Style',
          date: '2024-01-15T14:30:00Z',
          duration: 5,
          status: 'completed',
          cost: 0.01,
          rating: 5,
          review: 'Excellent advice on wardrobe choices!',
        },
        {
          id: '2',
          expertId: '2',
          expertName: 'Mike Chen',
          expertSpecialization: 'Tech & Gadgets',
          date: '2024-01-12T10:00:00Z',
          duration: 5,
          status: 'completed',
          cost: 0.01,
          rating: 4,
          review: 'Very helpful with laptop recommendations.',
        },
        {
          id: '3',
          expertId: '3',
          expertName: 'Emma Davis',
          expertSpecialization: 'Home & Garden',
          date: '2024-01-20T16:00:00Z',
          duration: 5,
          status: 'upcoming',
          cost: 0.01,
        },
      ];
      setSessions(mockSessions);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const mapSessionStatus = (backendStatus: string): Session['status'] => {
    switch (backendStatus) {
      case 'pending':
        return 'upcoming';
      case 'active':
        return 'upcoming';
      case 'completed':
        return 'completed';
      case 'cancelled':
        return 'cancelled';
      default:
        return 'upcoming';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'upcoming':
        return '#6366f1';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const handleSessionPress = (session: Session) => {
    if (session.status === 'upcoming') {
      Alert.alert(
        'Join Session',
        `Are you ready to start your consultation with ${session.expertName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Join', 
            onPress: () => router.push(`/(call)/video-call?sessionId=${session.id}&expertId=${session.expertId}`)
          },
        ]
      );
    } else {
      // TODO: Show session details modal
      Alert.alert('Session Details', `Session ${session.id} details would be shown here.`);
    }
  };

  const handleRetry = () => {
    loadSessions();
  };

  const renderSessionCard = ({ item }: { item: Session }) => (
    <TouchableOpacity 
      style={styles.sessionCard} 
      onPress={() => handleSessionPress(item)}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <Text style={styles.expertName}>{item.expertName}</Text>
          <Text style={styles.specialization}>{item.expertSpecialization}</Text>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
        </View>
        <View style={styles.sessionStatus}>
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: getStatusColor(item.status) }
            ]} 
          />
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
            <Text style={styles.detailValue}>{'P'.repeat(item.rating)}</Text>
          </View>
        )}
      </View>

      {item.review && (
        <View style={styles.reviewContainer}>
          <Text style={styles.reviewText}>"{item.review}"</Text>
        </View>
      )}

      {item.status === 'upcoming' && (
        <View style={styles.actionContainer}>
          <Text style={styles.actionText}>Tap to join session</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner message="Loading your sessions..." />
      </SafeAreaView>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Failed to Load Sessions</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {error && sessions.length > 0 && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>Some data may be outdated</Text>
          </View>
        )}
        {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>=�</Text>
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptyText}>
            You haven't booked any consultation sessions yet. Start by finding an expert!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={() => router.push('/(expert)/list')}
          >
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
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContainer: {
    padding: 16,
  },
  sessionCard: {
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
    color: '#1e293b',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
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
    color: '#1e293b',
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
    backgroundColor: '#6366f1',
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
    backgroundColor: '#6366f1',
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
    backgroundColor: '#6366f1',
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
});

export default SessionsScreen;