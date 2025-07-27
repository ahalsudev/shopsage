import { useRouter } from 'expo-router';
import { useAuth } from '../components/auth/auth-provider';
import { useActiveRole } from '../components/RoleManager';

export const useRoleNavigation = () => {
  const { completeProfile } = useAuth();
  const activeRole = useActiveRole();
  const router = useRouter();

  const navigateToRoleHome = () => {
    if (!completeProfile?.roles) return;

    const { canShop, canExpert } = completeProfile.roles;

    if (activeRole === 'dual' && canShop && canExpert) {
      // Show combined dashboard
      router.push('/(profile)/home');
    } else if (activeRole === 'expert' && canExpert) {
      router.push('/(expert)/profile-management');
    } else if (activeRole === 'shopper' && canShop) {
      router.push('/(shopper)/sessions');
    } else {
      // Fallback to profile
      router.push('/(profile)/home');
    }
  };

  const navigateToRoleOnboarding = (role: 'shopper' | 'expert') => {
    if (role === 'shopper') {
      router.push('/(profile)/shopper-onboarding');
    } else {
      router.push('/(profile)/expert-onboarding');
    }
  };

  const canAccessRole = (role: 'shopper' | 'expert'): boolean => {
    if (!completeProfile?.roles) return false;
    return role === 'shopper' ? completeProfile.roles.canShop : completeProfile.roles.canExpert;
  };

  const needsOnboarding = (): { shopper: boolean; expert: boolean } => {
    if (!completeProfile?.roles) {
      return { shopper: true, expert: true };
    }

    return {
      shopper: !completeProfile.roles.canShop,
      expert: !completeProfile.roles.canExpert,
    };
  };

  const getAvailableRoles = (): ('shopper' | 'expert')[] => {
    if (!completeProfile?.roles) return [];
    
    const roles: ('shopper' | 'expert')[] = [];
    if (completeProfile.roles.canShop) roles.push('shopper');
    if (completeProfile.roles.canExpert) roles.push('expert');
    
    return roles;
  };

  const getRecommendedRole = (): 'shopper' | 'expert' | 'dual' => {
    const available = getAvailableRoles();
    
    if (available.length === 2) return 'dual';
    if (available.includes('expert')) return 'expert';
    if (available.includes('shopper')) return 'shopper';
    
    return 'shopper'; // Default for new users
  };

  return {
    navigateToRoleHome,
    navigateToRoleOnboarding,
    canAccessRole,
    needsOnboarding,
    getAvailableRoles,
    getRecommendedRole,
    activeRole,
  };
};