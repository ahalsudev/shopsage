import { User, UserProfile } from '../types/auth'

/**
 * Utility functions for transforming backend responses to frontend types
 */

// Helper to safely parse dates
const parseDate = (dateString: string | Date | undefined): Date | undefined => {
  if (!dateString) return undefined
  if (dateString instanceof Date) return dateString

  try {
    const parsed = new Date(dateString)
    return isNaN(parsed.getTime()) ? undefined : parsed
  } catch {
    return undefined
  }
}

// Transform flat backend user response to our User structure
export const transformBackendUser = (backendUser: any): User => {
  if (!backendUser) {
    throw new Error('Backend user data is null or undefined')
  }

  // If it's already in our format, return as-is
  if (backendUser.profile) {
    return backendUser
  }

  // Transform flat structure to nested
  const profile: UserProfile = {
    id: backendUser.id,
    walletAddress: backendUser.walletAddress,
    name: backendUser.name,
    email: backendUser.email,
    profilePictureUrl: backendUser.profilePictureUrl,
    createdAt: parseDate(backendUser.createdAt),
    updatedAt: parseDate(backendUser.updatedAt),
  }

  // Validate required fields
  if (!profile.id) {
    throw new Error('User ID is missing from backend response')
  }
  if (!profile.walletAddress) {
    throw new Error('Wallet address is missing from backend response')
  }
  if (!profile.name) {
    throw new Error('User name is missing from backend response')
  }

  return {
    profile,
    shopperProfile: backendUser.shopperProfile,
    expertProfile: backendUser.expertProfile,
  }
}

// Transform flat backend profile response to UserProfile
export const transformBackendProfile = (backendProfile: any): UserProfile => {
  if (!backendProfile) {
    throw new Error('Backend profile data is null or undefined')
  }

  return {
    id: backendProfile.id,
    walletAddress: backendProfile.walletAddress,
    name: backendProfile.name,
    email: backendProfile.email,
    userType: backendProfile.userType,
    profilePictureUrl: backendProfile.profilePictureUrl,
    createdAt: parseDate(backendProfile.createdAt),
    updatedAt: parseDate(backendProfile.updatedAt),
  }
}
