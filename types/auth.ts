export interface UserProfile {
  id: string
  walletAddress: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface UserRoles {
  canShop: boolean      // has shopper profile
  canExpert: boolean    // has expert profile  
  activeRole: 'shopper' | 'expert' | 'dual' | 'none'
}

export interface ShopperProfile {
  id: string
  categories: string[]
  priceRangeMin: number
  priceRangeMax: number
  preferredExperts: string[]
  savedExperts: string[]
  interests: string[]
  totalSessions: number
  totalSpent: number
  averageRating: number
}

export interface ExpertProfile {
  id: string
  specialization: string
  bio: string
  hourlyRate: number
  rating: number
  totalConsultations: number
  isVerified: boolean
  isOnline: boolean
  profileImageUrl?: string
}

export interface CompleteUserProfile {
  user: UserProfile
  roles: UserRoles
  shopperProfile?: ShopperProfile
  expertProfile?: ExpertProfile
}

// Legacy User interface for backward compatibility during transition
export interface User {
  profile: UserProfile
  roles?: UserRoles
  shopperProfile?: ShopperProfile
  expertProfile?: ExpertProfile
}
