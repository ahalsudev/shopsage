import { useCustomAlert } from '@/components/CustomAlert'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native'
import { videoCallNavigation } from '@/utils/videoCallNavigation'
import { useAuth } from '@/components/auth/auth-provider'

const ExpertDetailScreen: React.FC = () => {
  const { expertId } = useLocalSearchParams()
  const router = useRouter()
  const { showAlert, AlertComponent } = useCustomAlert()
  const { user } = useAuth()

  // Mock expert data - replace with actual data fetching
  const expert = {
    id: expertId,
    name: 'Dr. Sarah Johnson',
    specialization: 'Fashion & Style',
    bio: 'Professional fashion consultant with over 10 years of experience helping clients find their perfect style. Specializing in wardrobe optimization, shopping strategies, and personal branding.',
    hourlyRate: 0.01,
    rating: 4.8,
    totalConsultations: 156,
    isVerified: true,
    isOnline: true,
    profileImageUrl: null,
  }

  const handleBookConsultation = async () => {
    showAlert(
      'Book Consultation', 
      `Book a 5-minute consultation with ${expert.name} for ${expert.hourlyRate} SOL?`, 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Video Call',
          onPress: async () => {
            try {
              if (!user?.profile?.id) {
                Alert.alert('Error', 'Please log in to book a consultation');
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

              // Generate a session ID for this consultation
              const sessionId = `session_${user.profile.id}_${expertId}_${Date.now()}`;

              // Start video call directly (this creates the session)
              await videoCallNavigation.startVideoCall({
                sessionId,
                userId: user.profile.id,
                participantIds: [user.profile.id, expertId as string],
              });

            } catch (error) {
              console.error('Failed to start video call:', error);
              Alert.alert('Error', 'Failed to start video call. Please try again.');
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Expert Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{expert.name.charAt(0)}</Text>
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
            <Text style={styles.statNumber}>{expert.hourlyRate} SOL</Text>
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
              <Text style={styles.infoValue}>{expert.hourlyRate} SOL</Text>
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
    fontWeight: 'bold',
    color: '#ffffff',
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
})

export default ExpertDetailScreen
