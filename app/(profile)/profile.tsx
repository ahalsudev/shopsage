import { useAuth } from '@/components/auth/auth-provider';
import { useCustomAlert } from '@/components/CustomAlert';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();

  // If user is an expert, redirect to expert profile management screen
  useEffect(() => {
    if (user?.userType === 'expert') {
      router.push('/(expert)/profile-management');
    }
  }, [user?.userType]);

  const handleLogout = () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const handleEditProfile = () => {
    showAlert('Edit Profile', 'Profile editing feature coming soon!');
  };

  const handleWalletSettings = () => {
    showAlert('Wallet Settings', 'Wallet management feature coming soon!');
  };

  const handleNotifications = () => {
    showAlert('Notifications', 'Notification settings feature coming soon!');
  };

  const handleHelp = () => {
    showAlert('Help & Support', 'Help center feature coming soon!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
          <Text style={styles.userType}>
            {user?.userType === 'expert' ? 'Expert Consultant' : 'Shopper'}
          </Text>
          <Text style={styles.walletAddress}>
            {user?.walletAddress?.slice(0, 8)}...{user?.walletAddress?.slice(-8)}
          </Text>
        </View>

        {/* Profile Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
            <Text style={styles.menuIcon}>✏️</Text>
            <Text style={styles.menuText}>Edit Profile</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet & Payments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet & Payments</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleWalletSettings}>
            <Text style={styles.menuIcon}>💰</Text>
            <Text style={styles.menuText}>Wallet Settings</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>📊</Text>
            <Text style={styles.menuText}>Transaction History</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
            <Text style={styles.menuIcon}>🔔</Text>
            <Text style={styles.menuText}>Notifications</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Privacy & Security</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.menuItem} onPress={handleHelp}>
            <Text style={styles.menuIcon}>❓</Text>
            <Text style={styles.menuText}>Help & Support</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>📄</Text>
            <Text style={styles.menuText}>Terms of Service</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔒</Text>
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>ℹ️</Text>
            <Text style={styles.menuText}>About ShopSage</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
          <View style={styles.menuItem}>
            <Text style={styles.menuIcon}>📱</Text>
            <Text style={styles.menuText}>Version 1.0.0</Text>
            <Text style={styles.menuArrow}>›</Text>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {AlertComponent}
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
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  menuArrow: {
    fontSize: 18,
    color: '#9ca3af',
  },
  logoutSection: {
    padding: 24,
    marginTop: 24,
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

export default ProfileScreen; 