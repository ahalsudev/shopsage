import { AppDispatch, RootState } from '@/store';
import {
  fetchCurrentUserProfile,
  toggleCurrentUserOnlineStatus,
  updateCurrentUserProfile,
} from '@/store/thunks/expertThunks';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../_layout';

type ExpertProfileManagementScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ExpertProfileManagementScreen: React.FC = () => {
  const navigation = useNavigation<ExpertProfileManagementScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { currentUserProfile, profileLoading, profileError } = useSelector((state: RootState) => state.experts);

  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [specialization, setSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentUserProfile());
  }, [dispatch]);

  useEffect(() => {
    if (currentUserProfile) {
      // Initialize form state with current profile data
      setSpecialization(currentUserProfile.specialization);
      setBio(currentUserProfile.bio || '');
      setHourlyRate(currentUserProfile.hourlyRate.toString());
      setProfileImageUrl(currentUserProfile.profileImageUrl || '');
      setIsOnline(currentUserProfile.isOnline);
    }
  }, [currentUserProfile]);

  const handleSaveProfile = async () => {
    if (!specialization.trim() || !hourlyRate.trim()) {
      Alert.alert('Error', 'Please fill in specialization and hourly rate');
      return;
    }

    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid hourly rate');
      return;
    }

    const profileData = {
      specialization: specialization.trim(),
      bio: bio.trim() || undefined,
      hourlyRate: rate,
      profileImageUrl: profileImageUrl.trim() || undefined,
      isOnline,
    };

    try {
      const result = await dispatch(updateCurrentUserProfile(profileData));

      if (updateCurrentUserProfile.fulfilled.match(result)) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', result.payload as string || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleToggleOnlineStatus = async () => {
    if (!currentUserProfile) return;

    try {
      const result = await dispatch(toggleCurrentUserOnlineStatus(!isOnline));

      if (toggleCurrentUserOnlineStatus.fulfilled.match(result)) {
        setIsOnline(result.payload.isOnline);
      } else {
        Alert.alert('Error', result.payload as string || 'Failed to update online status');
      }
    } catch (error) {
      console.error('Error updating online status:', error);
      Alert.alert('Error', 'Failed to update online status. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    // Reset form state to original values
    if (currentUserProfile) {
      setSpecialization(currentUserProfile.specialization);
      setBio(currentUserProfile.bio || '');
      setHourlyRate(currentUserProfile.hourlyRate.toString());
      setProfileImageUrl(currentUserProfile.profileImageUrl || '');
      setIsOnline(currentUserProfile.isOnline);
    }
    setIsEditing(false);
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUserProfile && !profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>👨‍💼</Text>
          <Text style={styles.errorTitle}>Create Your Expert Profile</Text>
          <Text style={styles.errorText}>
            You need to complete your expert profile to start helping shoppers.
          </Text>
          <TouchableOpacity 
            style={styles.createProfileButton} 
            onPress={() => router.push('/(expert)/registration')}
          >
            <Text style={styles.createProfileButtonText}>Create Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => dispatch(fetchCurrentUserProfile())}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Expert Profile</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profile Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{currentUserProfile.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{currentUserProfile.totalConsultations}</Text>
              <Text style={styles.statLabel}>Consultations</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{currentUserProfile.isVerified ? '✓' : '✗'}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          </View>

          {/* Online Status Toggle */}
          <View style={styles.onlineContainer}>
            <Text style={styles.onlineLabel}>Online Status</Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnlineStatus}
              trackColor={{ false: '#767577', true: '#6366f1' }}
              thumbColor={isOnline ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {/* Profile Form */}
          {isEditing ? (
            <>
              {/* Specialization Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Specialization *</Text>
                <TextInput
                  style={styles.input}
                  value={specialization}
                  onChangeText={setSpecialization}
                  placeholder="e.g., Tech Support, Fashion Advice"
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
                  placeholder="Tell shoppers about your expertise"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Hourly Rate Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Hourly Rate (SOL) *</Text>
                <TextInput
                  style={styles.input}
                  value={hourlyRate}
                  onChangeText={setHourlyRate}
                  placeholder="0.05"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>

              {/* Profile Image URL Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Profile Image URL</Text>
                <TextInput
                  style={styles.input}
                  value={profileImageUrl}
                  onChangeText={setProfileImageUrl}
                  placeholder="https://example.com/photo.jpg"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, profileLoading && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={profileLoading}
                >
                  <Text style={styles.saveButtonText}>
                    {profileLoading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Profile Display */}
              <View style={styles.profileSection}>
                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>Specialization</Text>
                  <Text style={styles.fieldValue}>{currentUserProfile.specialization}</Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <Text style={styles.fieldValue}>
                    {currentUserProfile.bio || 'No bio provided'}
                  </Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>Hourly Rate</Text>
                  <Text style={styles.fieldValue}>{currentUserProfile.hourlyRate} SOL</Text>
                </View>

                <View style={styles.profileField}>
                  <Text style={styles.fieldLabel}>Status</Text>
                  <Text style={[
                    styles.fieldValue,
                    { color: currentUserProfile.isOnline ? '#10b981' : '#ef4444' }
                  ]}>
                    {currentUserProfile.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
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
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  createProfileButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  createProfileButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  editButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  onlineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    paddingVertical: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1e293b',
  },
});

export default ExpertProfileManagementScreen;