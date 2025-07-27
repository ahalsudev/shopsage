import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuth } from '@/components/auth/auth-provider'

interface RoleSwitcherProps {
  style?: any
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ style }) => {
  const { user, switchRole } = useAuth()
  const [switching, setSwitching] = useState(false)

  if (!user || user.availableRoles.length <= 1) {
    return null // Don't show if user doesn't have multiple roles
  }

  const handleRoleSwitch = async (role: 'shopper' | 'expert') => {
    if (role === user.activeRole) return

    try {
      setSwitching(true)
      await switchRole(role)
    } catch (error) {
      Alert.alert('Switch Role Failed', error instanceof Error ? error.message : 'Failed to switch role')
    } finally {
      setSwitching(false)
    }
  }

  const getRoleLabel = (role: 'shopper' | 'expert') => {
    return role === 'shopper' ? 'Shopper' : 'Expert'
  }

  const getRoleIcon = (role: 'shopper' | 'expert') => {
    return role === 'shopper' ? '🛍️' : '👨‍💼'
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Switch Role:</Text>
      <View style={styles.roleButtons}>
        {user.availableRoles.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.roleButton, user.activeRole === role && styles.activeRole]}
            onPress={() => handleRoleSwitch(role)}
            disabled={switching || user.activeRole === role}
          >
            <Text style={styles.roleIcon}>{getRoleIcon(role)}</Text>
            <Text style={[styles.roleText, user.activeRole === role && styles.activeRoleText]}>
              {getRoleLabel(role)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    padding: 4,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  activeRole: {
    backgroundColor: '#007AFF',
  },
  roleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  roleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  activeRoleText: {
    color: 'white',
  },
})
