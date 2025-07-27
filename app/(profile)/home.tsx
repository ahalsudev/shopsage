import { useAuth } from '@/components/auth/auth-provider'
import { RoleManager } from '@/components/RoleManager'
import { useRoleNavigation } from '@/hooks/useRoleNavigation'
import { sessionService, SessionWithDetails } from '@/services/sessionService'
import { videoCallService } from '@/services/videoCallService'
import { videoCallNavigation } from '@/utils/videoCallNavigation'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const HomeScreen: React.FC = () => {
  const { user, completeProfile, signOut, isLoading } = useAuth()
  const { canAccessRole, needsOnboarding, navigateToRoleOnboarding, activeRole } = useRoleNavigation()
  const [recentSessions, setRecentSessions] = useState<SessionWithDetails[]>([])
  const [loadingRecent, setLoadingRecent] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleFindExperts = () => {
    router.push('/(expert)/list')
  }

  const handleMySessions = () => {
    router.push('/(shopper)/sessions')
  }

  const handleProfile = () => {
    router.push('/(profile)/profile')
  }

  const handleLogout = async () => {
    try {
      setIsSigningOut(true)
      // Clear sessions immediately to prevent loading during logout
      setRecentSessions([])
      setLoadingRecent(false)
      await signOut()
    } catch (error) {
      console.error('Logout failed:', error)
      // Still try to navigate away even if logout fails
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleTestVideoCall = async () => {
    try {
      if (!user?.profile?.id) {
        Alert.alert('Error', 'Please log in to test video calling');
        return;
      }

      // Check if video calling is available
      const isAvailable = await videoCallNavigation.isVideoCallAvailable();
      if (!isAvailable) {
        Alert.alert(
          'Video Call Unavailable', 
          'Video calling is not configured. Please check your settings.'
        );
        return;
      }

      // Generate a test session ID
      const sessionId = `test_session_123`;
      

      Alert.alert(
        'Test Video Call',
        'Start a test video call? This will request camera and microphone permissions.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Video Call',
            onPress: async () => {
              try {
                // Start the video call for just this user - other users will join separately
                const credentials = await sessionService.startVideoCall(sessionId, [user.profile.id]);
                
                console.log('=== CALL STARTED ===');
                console.log('Call ID:', credentials.callId);
                console.log('Share this Call ID with the other device to join!');
                console.log('==================');
                
                // Show the call ID to user
                Alert.alert(
                  'Call Started!', 
                  `Call ID: ${credentials.callId}\n\nShare this ID with the other device to join the call.`,
                  [{ text: 'Continue to Call', onPress: () => {
                    // Navigate to the call
                    router.push({
                      pathname: '/(call)/video-call',
                      params: {
                        sessionId,
                        callId: credentials.callId,
                        userId: credentials.userId,
                        userToken: credentials.userToken,
                      },
                    });
                  }}]
                );
              } catch (error) {
                console.error('Failed to start test video call:', error);
                Alert.alert('Error', 'Failed to start test video call. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to test video call:', error);
      Alert.alert('Error', 'Failed to test video call. Please try again.');
    }
  }

  const handleSimulateJoinCall = async () => {
    try {
      if (!user?.profile?.id) {
        Alert.alert('Error', 'Please log in to join a call');
        return;
      }

      Alert.alert(
        'Join Test Call',
        'Enter a call ID to join an existing call, or use "test_call_123" for demo:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Join Demo Call',
            onPress: async () => {
              try {
                // Use a consistent call ID so multiple devices can join
                const demoCallId = 'call_demo_123';
                const sessionId = `test_session_123`;
                
                // Create credentials for joining existing call
                const credentials = {
                  userId: user.profile.id,
                  userToken: await videoCallService.generateUserToken(user.profile.id),
                  callId: demoCallId,
                };

                router.push({
                  pathname: '/(call)/video-call',
                  params: {
                    sessionId,
                    callId: credentials.callId,
                    userId: credentials.userId,
                    userToken: credentials.userToken,
                  },
                });
              } catch (error) {
                console.error('Failed to join call:', error);
                Alert.alert('Error', 'Failed to join call. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to join call:', error);
      Alert.alert('Error', 'Failed to join call. Please try again.');
    }
  }

  // Load recent sessions on mount
  useEffect(() => {
    const loadRecentSessions = async () => {
      // Don't load sessions if signing out or during auth loading
      if (!user) return
      if (isSigningOut || isLoading) return

      try {
        setLoadingRecent(true)
        const sessions = await sessionService.getUserSessions()
        // Get the 3 most recent sessions
        const sortedSessions = sessions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
        setRecentSessions(sortedSessions)
      } catch (error) {
        console.error('Failed to load recent sessions:', error)
        setRecentSessions([])
      } finally {
        setLoadingRecent(false)
      }
    }

    // Only load if we have authenticated user and not signing out
    if (user && !isSigningOut && !isLoading) {
      loadRecentSessions()
    } else if (isSigningOut) {
      // Clear sessions when signing out
      setRecentSessions([])
      setLoadingRecent(false)
    }
  }, [user, isSigningOut, isLoading])

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.profile?.name || 'User'}! 👋</Text>
          <Text style={styles.userType}>
            {activeRole === 'dual' ? 'Multi-Role User' : 
             activeRole === 'expert' ? 'Expert Consultant' : 'Shopper'}
          </Text>
        </View>

        {/* Role Manager for multi-role users */}
        {completeProfile?.roles?.canShop && completeProfile?.roles?.canExpert && (
          <View style={styles.section}>
            <RoleManager />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {/* Show onboarding options if user needs them */}
          {(needsOnboarding().shopper || needsOnboarding().expert) && (
            <View style={styles.onboardingContainer}>
              <Text style={styles.onboardingTitle}>Complete Your Profile</Text>
              <View style={styles.actionGrid}>
                {needsOnboarding().shopper && (
                  <TouchableOpacity 
                    style={[styles.actionCard, styles.onboardingCard]} 
                    onPress={() => navigateToRoleOnboarding('shopper')}
                  >
                    <Text style={styles.actionIcon}>🛍️</Text>
                    <Text style={styles.actionTitle}>Become Shopper</Text>
                    <Text style={styles.actionSubtitle}>Get expert advice</Text>
                  </TouchableOpacity>
                )}
                
                {needsOnboarding().expert && (
                  <TouchableOpacity 
                    style={[styles.actionCard, styles.onboardingCard]} 
                    onPress={() => navigateToRoleOnboarding('expert')}
                  >
                    <Text style={styles.actionIcon}>🎯</Text>
                    <Text style={styles.actionTitle}>Become Expert</Text>
                    <Text style={styles.actionSubtitle}>Share expertise</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Regular actions based on active role */}
          {(activeRole === 'shopper' || activeRole === 'dual') && canAccessRole('shopper') && (
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={handleFindExperts}>
                <Text style={styles.actionIcon}>🔍</Text>
                <Text style={styles.actionTitle}>Find Experts</Text>
                <Text style={styles.actionSubtitle}>Browse consultants</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={handleMySessions}>
                <Text style={styles.actionIcon}>📞</Text>
                <Text style={styles.actionTitle}>My Sessions</Text>
                <Text style={styles.actionSubtitle}>View history</Text>
              </TouchableOpacity>
            </View>
          )}

          {(activeRole === 'expert' || activeRole === 'dual') && canAccessRole('expert') && (
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>💰</Text>
                <Text style={styles.actionTitle}>Earnings</Text>
                <Text style={styles.actionSubtitle}>View commissions</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard}>
                <Text style={styles.actionIcon}>📅</Text>
                <Text style={styles.actionTitle}>Schedule</Text>
                <Text style={styles.actionSubtitle}>Manage availability</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>{user?.activeRole === 'expert' ? 'Consultations' : 'Sessions'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>{user?.activeRole === 'expert' ? 'Earnings (SOL)' : 'Spent (SOL)'}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>⭐</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loadingRecent ? (
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>Loading recent activity...</Text>
            </View>
          ) : recentSessions.length > 0 ? (
            <>
              {recentSessions.map((session, index) => (
                <View key={session.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityTitle}>
                      {user?.activeRole === 'expert' ? 'Session with' : 'Consultation with'}{' '}
                      {user?.activeRole === 'expert' ? session.shopperName : session.expertName}
                    </Text>
                    <Text style={styles.activityStatus}>{session.status}</Text>
                  </View>
                  <Text style={styles.activityDetails}>
                    {user?.activeRole === 'expert'
                      ? session.expertSpecialization
                      : `${session.expertSpecialization} • ${session.amount} SOL`}
                  </Text>
                  <Text style={styles.activityTime}>{new Date(session.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.viewAllButton} onPress={handleMySessions}>
                <Text style={styles.viewAllText}>View All Sessions</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>
                {user?.activeRole === 'expert'
                  ? 'No consultations yet. Your expertise is waiting to be discovered!'
                  : 'Welcome to ShopSage! Start by exploring experts and booking your first consultation.'}
              </Text>
            </View>
          )}
        </View>

        {/* Navigation */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.navButton} onPress={handleProfile}>
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.testButton} onPress={handleTestVideoCall}>
            <Text style={styles.testButtonText}>🎥 Test Video Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.simulateButton} onPress={handleSimulateJoinCall}>
            <Text style={styles.simulateButtonText}>👥 Join Test Call</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: '#6366f1',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  activityStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366f1',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    textTransform: 'capitalize',
  },
  activityDetails: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  activityText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  viewAllButton: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  navButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  simulateButton: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  simulateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  onboardingContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  onboardingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  onboardingCard: {
    backgroundColor: '#fefce8',
    borderColor: '#fbbf24',
    borderWidth: 1,
  },
})

export default HomeScreen
