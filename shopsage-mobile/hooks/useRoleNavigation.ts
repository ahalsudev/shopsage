import { useRouter } from 'expo-router'
import { useAuth } from '../components/auth/auth-provider'

export const useRoleNavigation = () => {
  const { user } = useAuth()
  const router = useRouter()

  const navigateToRoleHome = () => {
    if (!user) return

    if (user.activeRole === 'expert' && user.expertProfile) {
      router.push('/(expert)/profile-management')
    } else if (user.activeRole === 'shopper' && user.shopperProfile) {
      router.push('/(shopper)/sessions')
    } else if (user.activeRole === 'dual' && user.shopperProfile && user.expertProfile) {
      // For dual role, navigate to a combined dashboard or one of the specific dashboards
      // For now, let's default to shopper sessions if both exist
      router.push('/(shopper)/sessions')
    } else {
      // Fallback to profile or a general home screen if no specific role profile is active
      router.push('/(tabs)/explore')
    }
  }

  const navigateToRoleOnboarding = (role: 'shopper' | 'expert') => {
    if (role === 'shopper') {
      router.push('/(profile)/shopper-onboarding')
    } else {
      router.push('/(profile)/expert-onboarding')
    }
  }

  const canAccessRole = (role: 'shopper' | 'expert'): boolean => {
    if (!user) return false
    return role === 'shopper' ? !!user.shopperProfile : !!user.expertProfile
  }

  const needsOnboarding = (): { shopper: boolean; expert: boolean } => {
    if (!user) {
      return { shopper: true, expert: true }
    }

    return {
      shopper: !user.shopperProfile,
      expert: !user.expertProfile,
    }
  }

  const getAvailableRoles = (): ('shopper' | 'expert')[] => {
    if (!user) return []

    const roles: ('shopper' | 'expert')[] = []
    if (user.shopperProfile) roles.push('shopper')
    if (user.expertProfile) roles.push('expert')

    return roles
  }

  const getRecommendedRole = (): 'shopper' | 'expert' | 'dual' | 'none' => {
    const available = getAvailableRoles()

    if (available.length === 2) return 'dual'
    if (available.includes('expert')) return 'expert'
    if (available.includes('shopper')) return 'shopper'

    return 'none' // Default for new users
  }

  return {
    navigateToRoleHome,
    navigateToRoleOnboarding,
    canAccessRole,
    needsOnboarding,
    getAvailableRoles,
    getRecommendedRole,
    activeRole: user?.activeRole || 'none',
  }
}
