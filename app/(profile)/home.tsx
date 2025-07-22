import { useAuth } from '@/components/auth/auth-provider';
import { router } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const HomeScreen: React.FC = () => {
  const { user, signOut } = useAuth();

  const handleFindExperts = () => {
    router.push('/(expert)/list');
  };

  const handleMySessions = () => {
    router.push('/(shopper)/sessions')
  }

  const handleProfile = () => {
    router.push('/(profile)/profile');
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome back, {user?.name || 'User'}! 👋
          </Text>
          <Text style={styles.userType}>
            {user?.userType === 'expert' ? 'Expert Consultant' : 'Shopper'}
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {user?.userType === 'shopper' ? (
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
          ) : (
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
              <Text style={styles.statLabel}>
                {user?.userType === 'expert' ? 'Consultations' : 'Sessions'}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>
                {user?.userType === 'expert' ? 'Earnings (SOL)' : 'Spent (SOL)'}
              </Text>
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
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              Welcome to ShopSage! Start by exploring experts or updating your profile.
            </Text>
          </View>
        </View>

        {/* Navigation */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.navButton} onPress={handleProfile}>
            <Text style={styles.navButtonText}>My Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
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
  },
  activityText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
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
});

export default HomeScreen; 