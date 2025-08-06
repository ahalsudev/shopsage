import { AppConfig } from '@/config/environment'
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { PublicKey } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { paymentService } from './paymentService'

export interface ExpertRegistrationData {
  name: string
  specialization: string
  sessionRate: number // in SOL
  bio?: string
  profileImageUrl?: string
}

export interface ChainExpertData {
  authority: PublicKey
  name: string
  specialization: string
  sessionRate: number // in lamports
  rating: number
  totalConsultations: number
  isVerified: boolean
  isOnline: boolean
}

export const expertProgramService = {
  async registerExpertOnChain(expertData: ExpertRegistrationData): Promise<string> {
    try {
      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: AppConfig.uri,
            icon: 'favicon.ico',
          },
        })

        const authority = solanaUtils.getPublicKeyFromAddress(authResult.accounts[0].address)

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(authority)

        // Build register expert transaction
        const transaction = await solanaUtils.buildRegisterExpertTransaction(
          authority,
          expertData.name,
          expertData.specialization,
          solanaUtils.solToLamports(expertData.sessionRate),
        )

        return await solanaUtils.executeTransaction(transaction, 'Register Expert')
      })
    } catch (error) {
      console.error('Failed to register expert on chain:', error)
      throw new Error('Failed to register expert on blockchain')
    }
  },

  async updateExpertStatusOnChain(isOnline: boolean): Promise<string> {
    try {
      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage',
            uri: AppConfig.uri,
            icon: 'favicon.ico',
          },
        })

        const authority = solanaUtils.getPublicKeyFromAddress(authResult.accounts[0].address)

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(authority)

        // Build update expert status transaction
        const transaction = await solanaUtils.buildUpdateExpertStatusTransaction(authority, isOnline)

        return await solanaUtils.executeTransaction(transaction, 'Update Expert Status')
      })
    } catch (error) {
      console.error('Failed to update expert status on chain:', error)
      throw new Error('Failed to update expert status on blockchain')
    }
  },

  async getExpertFromChain(expertWalletAddress: string): Promise<ChainExpertData | null> {
    try {
      return await paymentService.getExpertFromChain(expertWalletAddress)
    } catch (error) {
      console.error('Failed to get expert from chain:', error)
      return null
    }
  },

  async syncExpertWithChain(expertWalletAddress: string): Promise<any> {
    try {
      // Get expert data from blockchain
      const chainExpert = await this.getExpertFromChain(expertWalletAddress)

      if (!chainExpert) {
        console.warn('Expert not found on chain:', expertWalletAddress)
        return null
      }

      // Convert blockchain data to frontend format
      const syncedExpert = {
        id: chainExpert.authority.toString(),
        userId: chainExpert.authority.toString(),
        name: chainExpert.name,
        specialization: chainExpert.specialization,
        bio: null, // Chain doesn't store bio, backend does
        sessionRate: chainExpert.sessionRate / 1_000_000_000, // Convert lamports to SOL
        rating: chainExpert.rating,
        totalConsultations: chainExpert.totalConsultations,
        isVerified: chainExpert.isVerified,
        isOnline: chainExpert.isOnline,
        profileImageUrl: null, // Chain doesn't store image URL
        createdAt: new Date().toISOString(), // Chain doesn't store creation time
        updatedAt: new Date().toISOString(),
      }

      return syncedExpert
    } catch (error) {
      console.error('Failed to sync expert with chain:', error)
      return null
    }
  },

  // Hybrid expert registration that registers on both chain and backend
  async registerExpertHybrid(expertData: ExpertRegistrationData): Promise<{ txId: string; expert: any }> {
    try {
      // First register on blockchain
      const txId = await this.registerExpertOnChain(expertData)

      // Then register in backend for additional metadata (bio, image, etc.)
      let backendExpert = null
      try {
        // Import expert service to avoid circular dependency
        const { expertService } = await import('./expertService')

        backendExpert = await expertService.createProfile({
          specialization: expertData.specialization,
          bio: expertData.bio,
          sessionRate: expertData.sessionRate,
          profileImageUrl: expertData.profileImageUrl,
        })
      } catch (backendError) {
        console.warn('Backend expert registration failed, but blockchain registration succeeded:', backendError)
        // Continue since blockchain is the source of truth
      }

      return { txId, expert: backendExpert }
    } catch (error) {
      console.error('Failed to register expert (hybrid):', error)
      throw error
    }
  },

  // Update expert status on both chain and backend
  async updateExpertStatusHybrid(isOnline: boolean): Promise<string> {
    try {
      // Update on blockchain first
      const txId = await this.updateExpertStatusOnChain(isOnline)

      // Then update backend for UI consistency
      try {
        const { expertService } = await import('./expertService')
        await expertService.toggleOnlineStatus(isOnline)
      } catch (backendError) {
        console.warn('Backend expert status update failed:', backendError)
      }

      return txId
    } catch (error) {
      console.error('Failed to update expert status (hybrid):', error)
      throw error
    }
  },

  // Get expert data with chain as source of truth, backend for metadata
  async getExpertHybrid(expertWalletAddress: string): Promise<any> {
    try {
      // Get chain data first (source of truth)
      const chainExpert = await this.syncExpertWithChain(expertWalletAddress)

      if (!chainExpert) {
        return null
      }

      // Get backend data for additional metadata
      try {
        const { expertService } = await import('./expertService')
        const backendExpert = await expertService.getExpertById(expertWalletAddress)

        // Merge chain truth with backend metadata
        return {
          ...chainExpert,
          bio: backendExpert?.bio || chainExpert.bio,
          profileImageUrl: backendExpert?.profileImageUrl || chainExpert.profileImageUrl,
          // Chain data takes precedence for critical fields
          sessionRate: chainExpert.sessionRate,
          rating: chainExpert.rating,
          totalConsultations: chainExpert.totalConsultations,
          isVerified: chainExpert.isVerified,
          isOnline: chainExpert.isOnline,
        }
      } catch (backendError) {
        console.warn('Failed to get backend expert data:', backendError)
        return chainExpert
      }
    } catch (error) {
      console.error('Failed to get expert (hybrid):', error)

      // Fallback to backend only
      try {
        const { expertService } = await import('./expertService')
        return await expertService.getExpertById(expertWalletAddress)
      } catch (fallbackError) {
        console.error('Fallback to backend also failed:', fallbackError)
        return null
      }
    }
  },
}
