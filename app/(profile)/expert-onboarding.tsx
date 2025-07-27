import { useAuth } from '@/components/auth/auth-provider';
import { dataProvider } from '@/services/dataProvider';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const specializations = [
  'Tech Support', 'Fashion Consulting', 'Home Improvement', 'Fitness Coaching',
  'Financial Advice', 'Career Counseling', 'Product Research', 'DIY Projects',
  'Cooking & Nutrition', 'Travel Planning', 'Photography Tips', 'Music Lessons'
];

export default function ExpertOnboarding() {
  const { refreshCompleteProfile, isLoading } = useAuth();
  const router = useRouter();
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('0.10');

  const handleComplete = async () => {
    if (!selectedSpecialization) {
      Alert.alert('Specialization Required', 'Please select your area of expertise.');
      return;
    }

    if (!bio.trim()) {
      Alert.alert('Bio Required', 'Please write a brief bio about your expertise.');
      return;
    }

    if (!hourlyRate || parseFloat(hourlyRate) <= 0) {
      Alert.alert('Rate Required', 'Please set a valid hourly rate.');
      return;
    }

    try {
      const expertProfileData = {
        specialization: selectedSpecialization,
        bio: bio.trim(),
        hourlyRate: parseFloat(hourlyRate),
        rating: 0,
        totalConsultations: 0,
        isVerified: false,
        isOnline: false,
      };

      await dataProvider.createExpertProfile(expertProfileData);
      await refreshCompleteProfile();
      
      Alert.alert(
        'Welcome, Expert!',
        'Your expert profile has been created successfully. You can now offer consultations to shoppers.',
        [{ text: 'Get Started', onPress: () => router.push('/(expert)/profile-management') }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create expert profile'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Become an Expert</Text>
          <Text style={styles.subtitle}>
            Share your expertise and help shoppers make better decisions
          </Text>
        </View>

        {/* Specialization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Specialization</Text>
          <Text style={styles.sectionDescription}>
            What's your main area of expertise?
          </Text>
          <View style={styles.tagsContainer}>
            {specializations.map((specialization) => (
              <TouchableOpacity
                key={specialization}
                style={[
                  styles.tag,
                  selectedSpecialization === specialization && styles.selectedTag
                ]}
                onPress={() => setSelectedSpecialization(specialization)}
              >
                <Text style={[
                  styles.tagText,
                  selectedSpecialization === specialization && styles.selectedTagText
                ]}>
                  {specialization}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>
          <Text style={styles.sectionDescription}>
            Tell shoppers about your experience and expertise (100-300 characters)
          </Text>
          <TextInput
            style={styles.bioInput}
            multiline
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
            placeholder="I'm a seasoned professional with 5+ years of experience in..."
            maxLength={300}
          />
          <Text style={styles.charCount}>{bio.length}/300</Text>
        </View>

        {/* Hourly Rate Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hourly Rate</Text>
          <Text style={styles.sectionDescription}>
            Set your consultation rate (in SOL per hour)
          </Text>
          <View style={styles.rateContainer}>
            <Text style={styles.ratePrefix}>◎</Text>
            <TextInput
              style={styles.rateInput}
              value={hourlyRate}
              onChangeText={setHourlyRate}
              keyboardType="decimal-pad"
              placeholder="0.10"
            />
            <Text style={styles.rateSuffix}>SOL/hour</Text>
          </View>
          
          <View style={styles.rateExamples}>
            <Text style={styles.rateExampleTitle}>Rate Guidelines:</Text>
            <Text style={styles.rateExample}>• Beginner: 0.05 - 0.10 SOL/hour</Text>
            <Text style={styles.rateExample}>• Experienced: 0.10 - 0.25 SOL/hour</Text>
            <Text style={styles.rateExample}>• Expert: 0.25+ SOL/hour</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.completeButton, isLoading && styles.disabledButton]}
          onPress={handleComplete}
          disabled={isLoading}
        >
          <Text style={styles.completeButtonText}>
            {isLoading ? 'Creating Profile...' : 'Complete Expert Setup'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
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
  bioInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#1e293b',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratePrefix: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: 'bold',
    marginRight: 8,
  },
  rateInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    padding: 0,
  },
  rateSuffix: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 8,
  },
  rateExamples: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  rateExampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  rateExample: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
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
});