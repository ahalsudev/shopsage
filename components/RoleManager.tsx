import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './auth/auth-provider';

interface RoleManagerProps {
  style?: any;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ style }) => {
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState<'shopper' | 'expert' | 'dual'>('shopper');

  useEffect(() => {
    // Load saved active role preference
    loadActiveRole();
  }, []);

  useEffect(() => {
    // Auto-set role based on available profiles
    if (user?.roles) {
      if (user.roles.canShop && user.roles.canExpert) {
        // Both roles available - use saved preference or default to dual
        if (!activeRole || activeRole === 'dual') {
          setActiveRole('dual');
        }
      } else if (user.roles.canExpert) {
        setActiveRole('expert');
      } else if (user.roles.canShop) {
        setActiveRole('shopper');
      }
    }
  }, [user?.roles]);

  const loadActiveRole = async () => {
    try {
      const savedRole = await AsyncStorage.getItem('activeRole');
      if (savedRole && ['shopper', 'expert', 'dual'].includes(savedRole)) {
        setActiveRole(savedRole as 'shopper' | 'expert' | 'dual');
      }
    } catch (error) {
      console.log('Failed to load active role:', error);
    }
  };

  const saveActiveRole = async (role: 'shopper' | 'expert' | 'dual') => {
    try {
      await AsyncStorage.setItem('activeRole', role);
    } catch (error) {
      console.log('Failed to save active role:', error);
    }
  };

  const handleRoleSwitch = async (role: 'shopper' | 'expert' | 'dual') => {
    setActiveRole(role);
    await saveActiveRole(role);
  };

  // Don't show if user doesn't have both roles
  if (!user?.roles?.canShop || !user?.roles?.canExpert) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Active View</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            activeRole === 'shopper' && styles.activeButton
          ]}
          onPress={() => handleRoleSwitch('shopper')}
        >
          <Text style={[
            styles.roleText,
            activeRole === 'shopper' && styles.activeText
          ]}>
            🛍️ Shopper
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            activeRole === 'dual' && styles.activeButton
          ]}
          onPress={() => handleRoleSwitch('dual')}
        >
          <Text style={[
            styles.roleText,
            activeRole === 'dual' && styles.activeText
          ]}>
            ⚡ Both
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            activeRole === 'expert' && styles.activeButton
          ]}
          onPress={() => handleRoleSwitch('expert')}
        >
          <Text style={[
            styles.roleText,
            activeRole === 'expert' && styles.activeText
          ]}>
            🎯 Expert
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#6366f1',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

// Hook to get current active role
export const useActiveRole = () => {
  const [activeRole, setActiveRole] = useState<'shopper' | 'expert' | 'dual'>('shopper');

  useEffect(() => {
    const loadRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('activeRole');
        if (savedRole && ['shopper', 'expert', 'dual'].includes(savedRole)) {
          setActiveRole(savedRole as 'shopper' | 'expert' | 'dual');
        }
      } catch (error) {
        console.log('Failed to load active role:', error);
      }
    };

    loadRole();

    // Listen for changes
    const interval = setInterval(loadRole, 1000);
    return () => clearInterval(interval);
  }, []);

  return activeRole;
};