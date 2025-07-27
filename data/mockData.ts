/**
 * Mock Data for Local Development
 * Provides realistic dummy data when not using remote API
 */

import { User, UserProfile, ShopperProfile, ExpertProfile } from '../types/auth'
import { SessionWithDetails } from '../services/sessionService'

// Utility function to generate random IDs
const generateId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Generate realistic wallet addresses
const generateWalletAddress = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  let result = ''
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Mock Users Data
export const mockUsers: User[] = [
  {
    profile: {
      id: 'user1',
      walletAddress: generateWalletAddress(),
      name: 'Alice Johnson',
      email: 'alice@example.com',
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-20T15:45:00Z',
    },
    shopperProfile: {
      preferences: {
        categories: ['Electronics', 'Fashion', 'Home & Garden'],
        priceRange: { min: 0.01, max: 5.0 },
        preferredExperts: ['expert1', 'expert3'],
      },
      consultationHistory: {
        totalSessions: 12,
        totalSpent: 2.45,
        averageRating: 4.7,
      },
      savedExperts: ['expert1', 'expert2', 'expert3'],
      interests: ['Technology', 'Fashion', 'Fitness'],
    },
    expertProfile: {
      specialization: 'Tech Support',
      bio: 'Experienced tech consultant with 8+ years in consumer electronics and software troubleshooting.',
      hourlyRate: 0.05,
      rating: 4.8,
      totalConsultations: 156,
      isVerified: true,
      isOnline: true,
      availability: {
        schedule: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '10:00', end: '16:00', available: false },
          sunday: { start: '10:00', end: '16:00', available: false },
        },
        timezone: 'UTC',
      },
      profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      stats: {
        totalEarnings: 7.8,
        totalHours: 156,
        responseTime: 5,
        satisfaction: 95,
      },
    },
  },
  {
    profile: {
      id: 'user2',
      walletAddress: generateWalletAddress(),
      name: 'Bob Smith',
      email: 'bob@example.com',
      createdAt: '2024-01-10T08:20:00Z',
      updatedAt: '2024-01-22T12:30:00Z',
    },
    shopperProfile: {
      preferences: {
        categories: ['Sports', 'Automotive', 'Books'],
        priceRange: { min: 0.005, max: 2.0 },
        preferredExperts: ['expert2'],
      },
      consultationHistory: {
        totalSessions: 8,
        totalSpent: 1.2,
        averageRating: 4.5,
      },
      savedExperts: ['expert2', 'expert4'],
      interests: ['Sports', 'Automotive', 'Reading'],
    },
  },
]

// Mock Expert Profiles
export const mockExperts: ExpertProfile[] = [
  {
    specialization: 'Fashion Consulting',
    bio: 'Personal stylist and fashion consultant helping you find your perfect look for any occasion.',
    hourlyRate: 0.08,
    rating: 4.9,
    totalConsultations: 89,
    isVerified: true,
    isOnline: false,
    availability: {
      schedule: {
        monday: { start: '10:00', end: '18:00', available: true },
        tuesday: { start: '10:00', end: '18:00', available: true },
        wednesday: { start: '10:00', end: '18:00', available: true },
        thursday: { start: '10:00', end: '18:00', available: true },
        friday: { start: '10:00', end: '18:00', available: true },
        saturday: { start: '11:00', end: '15:00', available: true },
        sunday: { start: '11:00', end: '15:00', available: false },
      },
      timezone: 'EST',
    },
    profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150',
    stats: {
      totalEarnings: 7.12,
      totalHours: 89,
      responseTime: 3,
      satisfaction: 98,
    },
  },
  {
    specialization: 'Home Improvement',
    bio: 'DIY expert and contractor with 15+ years experience in home renovation and improvement projects.',
    hourlyRate: 0.06,
    rating: 4.7,
    totalConsultations: 203,
    isVerified: true,
    isOnline: true,
    availability: {
      schedule: {
        monday: { start: '08:00', end: '16:00', available: true },
        tuesday: { start: '08:00', end: '16:00', available: true },
        wednesday: { start: '08:00', end: '16:00', available: true },
        thursday: { start: '08:00', end: '16:00', available: true },
        friday: { start: '08:00', end: '16:00', available: true },
        saturday: { start: '09:00', end: '13:00', available: true },
        sunday: { start: '09:00', end: '13:00', available: false },
      },
      timezone: 'PST',
    },
    profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    stats: {
      totalEarnings: 12.18,
      totalHours: 203,
      responseTime: 8,
      satisfaction: 92,
    },
  },
  {
    specialization: 'Fitness Coaching',
    bio: 'Certified personal trainer and nutrition coach helping you achieve your health and fitness goals.',
    hourlyRate: 0.07,
    rating: 4.8,
    totalConsultations: 124,
    isVerified: true,
    isOnline: true,
    availability: {
      schedule: {
        monday: { start: '06:00', end: '20:00', available: true },
        tuesday: { start: '06:00', end: '20:00', available: true },
        wednesday: { start: '06:00', end: '20:00', available: true },
        thursday: { start: '06:00', end: '20:00', available: true },
        friday: { start: '06:00', end: '20:00', available: true },
        saturday: { start: '08:00', end: '18:00', available: true },
        sunday: { start: '08:00', end: '18:00', available: true },
      },
      timezone: 'MST',
    },
    profileImageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150',
    stats: {
      totalEarnings: 8.68,
      totalHours: 124,
      responseTime: 2,
      satisfaction: 96,
    },
  },
  {
    specialization: 'Financial Advice',
    bio: 'Certified financial planner offering guidance on investments, budgeting, and financial planning.',
    hourlyRate: 0.12,
    rating: 4.9,
    totalConsultations: 67,
    isVerified: true,
    isOnline: false,
    availability: {
      schedule: {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '10:00', end: '14:00', available: false },
        sunday: { start: '10:00', end: '14:00', available: false },
      },
      timezone: 'EST',
    },
    profileImageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    stats: {
      totalEarnings: 8.04,
      totalHours: 67,
      responseTime: 6,
      satisfaction: 94,
    },
  },
]

// Mock Sessions Data
export const mockSessions: SessionWithDetails[] = [
  {
    id: 'session1',
    expertId: 'expert1',
    expertName: 'Alice Johnson',
    expertSpecialization: 'Tech Support',
    shopperId: 'user2',
    shopperName: 'Bob Smith',
    startTime: '2024-01-22T14:00:00Z',
    endTime: '2024-01-22T15:00:00Z',
    status: 'completed',
    amount: '0.05',
    paymentStatus: 'completed',
    transactionHash: 'tx_' + generateId(),
    createdAt: '2024-01-22T13:45:00Z',
    updatedAt: '2024-01-22T15:05:00Z',
  },
  {
    id: 'session2',
    expertId: 'expert2',
    expertName: 'Sarah Wilson',
    expertSpecialization: 'Fashion Consulting',
    shopperId: 'user1',
    shopperName: 'Alice Johnson',
    startTime: '2024-01-23T16:00:00Z',
    status: 'pending',
    amount: '0.08',
    paymentStatus: 'pending',
    createdAt: '2024-01-23T10:30:00Z',
    updatedAt: '2024-01-23T10:30:00Z',
  },
  {
    id: 'session3',
    expertId: 'expert3',
    expertName: 'Mike Davis',
    expertSpecialization: 'Home Improvement',
    shopperId: 'user1',
    shopperName: 'Alice Johnson',
    startTime: '2024-01-21T10:00:00Z',
    endTime: '2024-01-21T11:30:00Z',
    status: 'completed',
    amount: '0.09',
    paymentStatus: 'completed',
    transactionHash: 'tx_' + generateId(),
    createdAt: '2024-01-21T09:45:00Z',
    updatedAt: '2024-01-21T11:35:00Z',
  },
  {
    id: 'session4',
    expertId: 'expert4',
    expertName: 'Lisa Chen',
    expertSpecialization: 'Fitness Coaching',
    shopperId: 'user2',
    shopperName: 'Bob Smith',
    startTime: '2024-01-24T07:00:00Z',
    status: 'active',
    amount: '0.07',
    paymentStatus: 'completed',
    transactionHash: 'tx_' + generateId(),
    createdAt: '2024-01-24T06:45:00Z',
    updatedAt: '2024-01-24T07:00:00Z',
  },
]

// Mock Categories and Interests
export const mockCategories = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports',
  'Books',
  'Beauty',
  'Automotive',
  'Health',
  'Food & Cooking',
  'Travel',
  'Photography',
  'Music',
  'Art & Crafts',
  'Pets',
]

export const mockInterests = [
  'Technology',
  'Gaming',
  'Fashion',
  'Fitness',
  'Cooking',
  'Travel',
  'Photography',
  'Music',
  'Reading',
  'Sports',
  'Art',
  'Nature',
  'Science',
  'History',
]

// Mock Specializations
export const mockSpecializations = [
  'Tech Support',
  'Fashion Consulting',
  'Home Improvement',
  'Fitness Coaching',
  'Financial Advice',
  'Career Counseling',
  'Product Research',
  'DIY Projects',
  'Cooking & Nutrition',
  'Travel Planning',
  'Photography Tips',
  'Music Lessons',
]

// Data generators for creating new mock data
export const generateMockUser = (overrides: Partial<User> = {}): User => {
  const baseUser: User = {
    profile: {
      id: generateId(),
      walletAddress: generateWalletAddress(),
      name: 'Test User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }

  // Deep merge to preserve nested objects
  const mergedUser: User = {
    ...baseUser,
    ...overrides,
    profile: {
      ...baseUser.profile,
      ...(overrides.profile || {}),
    },
  }

  // Ensure all required fields are present
  if (!mergedUser.profile.id) {
    mergedUser.profile.id = generateId()
  }
  if (!mergedUser.profile.walletAddress) {
    mergedUser.profile.walletAddress = generateWalletAddress()
  }
  if (!mergedUser.profile.name) {
    mergedUser.profile.name = 'Test User'
  }
  if (!mergedUser.profile.createdAt) {
    mergedUser.profile.createdAt = new Date().toISOString()
  }
  if (!mergedUser.profile.updatedAt) {
    mergedUser.profile.updatedAt = new Date().toISOString()
  }

  return mergedUser
}

export const generateMockSession = (overrides: Partial<SessionWithDetails> = {}): SessionWithDetails => {
  const baseSession: SessionWithDetails = {
    id: generateId(),
    expertId: 'expert1',
    expertName: 'Mock Expert',
    expertSpecialization: 'General Consulting',
    shopperId: 'user1',
    shopperName: 'Mock Shopper',
    startTime: new Date().toISOString(),
    status: 'pending',
    amount: '0.05',
    paymentStatus: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  return { ...baseSession, ...overrides }
}
