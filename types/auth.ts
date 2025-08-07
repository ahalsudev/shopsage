export interface UserProfile {
  id?: string
  walletAddress?: string
  name?: string
  email?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserRoles {
  canShop: boolean // has shopper profile
  canExpert: boolean // has expert profile
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
  userId: string
  specialization: string
  bio: string | null
  sessionRate: number
  rating: number
  totalConsultations: number
  isVerified: boolean
  isOnline: boolean
  profileImageUrl: string | null
  walletAddress?: string
  name?: string
  createdAt?: string
  updatedAt?: string
}
export interface UserCompleteProfile {
  user: UserProfile
  shopperProfile?: ShopperProfile
  expertProfile?: ExpertProfile
  availableRoles?: UserRoles['activeRole'][]
  activeRole?: UserRoles['activeRole']
}
