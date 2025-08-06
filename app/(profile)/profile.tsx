import { useAuth } from '@/components/auth/auth-provider'
import { useCustomAlert } from '@/components/CustomAlert'
import { router } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Modal, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ProfileSetup } from '../../components/ProfileSetup'

const ProfileScreen: React.FC = () => {
  const { user, signOut, syncUserData, enableRole } = useAuth()
  const { showAlert, AlertComponent } = useCustomAlert()
  const [showProfileSetup, setShowProfileSetup] = useState(false)
  const [setupRole, setSetupRole] = useState<'shopper' | 'expert'>('shopper')
  const [refreshing, setRefreshing] = useState(false)

  // Navigate to expert screens if user has expert profile
  useEffect(() => {
    if (user?.expertProfile) {
      router.push('/(expert)/profile-management')
    }
  }, [user?.expertProfile])

  // Sync user data on mount
  useEffect(() => {
    syncUserData()
  }, [])

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: signOut,
      },
    ])
  }

  const handleEditProfile = () => {
    showAlert('Edit Profile', 'Profile editing feature coming soon!')
  }

  const handleBecomeExpert = () => {
    setSetupRole('expert')
    setShowProfileSetup(true)
  }

  const handleBecomeShopperFirst = () => {
    setSetupRole('shopper')
    setShowProfileSetup(true)
  }

  const isExpertAvailable = user?.availableRoles?.includes('expert') || false
  const isShopperAvailable = user?.availableRoles?.includes('shopper') || false

  const currentRoleProfile = user?.activeRole === 'expert' ? user?.expertProfile : user?.shopperProfile
  const currentRoleData = {
    shopper: {
      totalSessions: user?.shopperProfile?.totalSessions || 0,
      totalSpent: user?.shopperProfile?.totalSpent || 0,
      savedExperts: user?.shopperProfile?.savedExperts?.length || 0,
    },
    expert: {
      totalConsultations: user?.expertProfile?.totalConsultations || 0,
      rating: user?.expertProfile?.rating || 0,
      isOnline: user?.expertProfile?.isOnline || false,
    },
  }

  const handleWalletSettings = () => {
    showAlert('Wallet Settings', 'Wallet management feature coming soon!')
  }

  const handleNotifications = () => {
    showAlert('Notifications', 'Notification settings feature coming soon!')
  }

  const handleHelp = () => {
    showAlert('Help & Support', 'Help center feature coming soon!')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await syncUserData()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.user.name?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.name}>{user?.user?.name || 'User'}</Text>
          <Text style={styles.userType}>{user?.activeRole === 'expert' ? 'Expert Consultant' : 'Shopper'}</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleCount}>
              {user?.availableRoles?.length || 1} role{(user?.availableRoles?.length || 1) > 1 ? 's' : ''} available
            </Text>
          </View>
          <Text style={styles.walletAddress}>
            {user?.user?.walletAddress?.slice(0, 8)}...{user?.user?.walletAddress?.slice(-8)}
          </Text>
        </View>

        {/* Current Role Stats */}
        {currentRoleProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{user?.activeRole === 'expert' ? 'Expert' : 'Shopper'} Stats</Text>
            {user?.activeRole === 'expert' ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statText}>Rating: {currentRoleData.expert.rating.toFixed(1)}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>💼</Text>
                  <Text style={styles.statText}>Consultations: {currentRoleData.expert.totalConsultations}</Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>🟢</Text>
                  <Text style={styles.statText}>Status: {currentRoleData.expert.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>🛍️</Text>
                  <Text style={styles.statText}>Sessions: {currentRoleData.shopper.totalSessions}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>💰</Text>
                  <Text style={styles.statText}>Total Spent: {currentRoleData.shopper.totalSpent.toFixed(4)} SOL</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statText}>Saved Experts: {currentRoleData.shopper.savedExperts}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Role Setup Options */}
        {(!isExpertAvailable || !isShopperAvailable) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expand Your Experience</Text>
            {!isExpertAvailable && (
              <TouchableOpacity style={styles.menuItem} onPress={handleBecomeExpert}>
                <Text style={styles.menuIcon}>👨‍💼</Text>
                <Text style={styles.menuText}>Become an Expert</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}
            {!isShopperAvailable && (
              <TouchableOpacity style={styles.menuItem} onPress={handleBecomeShopperFirst}>
                <Text style={styles.menuIcon}>🛍️</Text>
                <Text style={styles.menuText}>Set up Shopper Profile</Text>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

      {/* Profile Setup Modal */}
      <Modal visible={showProfileSetup} animationType="slide" presentationStyle="pageSheet">
        <ProfileSetup
          role={setupRole}
          onComplete={() => {
            setShowProfileSetup(false)
            syncUserData() // Refresh user data
          }}
          onCancel={() => setShowProfileSetup(false)}
        />
      </Modal>
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
  roleInfo: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
  },
  roleCount: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#374151',
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
})

export default ProfileScreen
