import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js'
import { PublicKey, TransactionSignature } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import { solanaUtils } from '../utils/solana'
import { paymentService } from './paymentService'
import { toUint8Array } from 'js-base64'

console.log('[ExpertProgram] 🔄 EXPERT PROGRAM SERVICE LOADED WITH FIXES - VERSION 2024-08-05')

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
  async registerExpertOnChain(expertData: ExpertRegistrationData): Promise<{
    signature: TransactionSignature;
    expertPublicKey: PublicKey;
    expertAccount: PublicKey;
  }> {
    try {
      console.log('[ExpertProgram] ===== STARTING EXPERT REGISTRATION =====')
      console.log('[ExpertProgram] Expert data:', expertData)
      console.log('[ExpertProgram] Platform config:', {
        network: PLATFORM_CONFIG.NETWORK,
        cluster: PLATFORM_CONFIG.CLUSTER,
        rpc: PLATFORM_CONFIG.RPC_ENDPOINT
      })
      console.log('[ExpertProgram] Program IDs:', solanaUtils.getProgramIds())

      console.log('[ExpertProgram] About to call transact...')
      const result = await transact(async (wallet) => {
        console.log('[ExpertProgram] Inside transact callback, wallet:', typeof wallet)
        
        // Authorize the wallet with enhanced identity
        console.log('[ExpertProgram] Requesting wallet authorization with cluster:', PLATFORM_CONFIG.CLUSTER)
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Expert Registration',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })
        console.log('[ExpertProgram] Wallet authorization completed')

        console.log('[ExpertProgram] Authorization result:', JSON.stringify(authResult, null, 2));
        const account = authResult.accounts && authResult.accounts.length > 0 ? authResult.accounts[0] : undefined;
        if (!account) {
          console.error('[ExpertProgram] Wallet authorization failed. Full auth result:', authResult);
          throw new Error('Wallet authorization failed. Please try again.')
        }
        
        // Convert base64 address to PublicKey
        const publicKeyByteArray = toUint8Array(account.address)
        const authority = new PublicKey(publicKeyByteArray)
        console.log('[ExpertProgram] Wallet authorized:', authority.toString())

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(authority)
        console.log('[ExpertProgram] Program IDs:', solanaUtils.getProgramIds())

        // Get expert account PDA
        const [expertAccount, bump] = solanaUtils.findExpertAccount(authority)
        console.log('[ExpertProgram] Expert account PDA:', expertAccount.toString(), 'bump:', bump)
        console.log('Please provide this PDA to the assistant:', expertAccount.toString());

        // Build register expert transaction
        const transaction = await solanaUtils.buildRegisterExpertTransaction(
          authority,
          expertData.name,
          expertData.specialization,
          solanaUtils.solToLamports(expertData.sessionRate),
        )

        console.log('[ExpertProgram] Transaction built:', transaction)

        // Get latest blockhash and set transaction details
        const { blockhash } = await solanaUtils.getConnection().getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = authority

        console.log('[ExpertProgram] Transaction prepared with blockhash and fee payer, requesting signature...')

        // Sign and send the transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[ExpertProgram] Transaction signed with signature:', signature)

        // Wait for transaction confirmation
        console.log('[ExpertProgram] Waiting for transaction confirmation...')
        const confirmation = await solanaUtils.getConnection().confirmTransaction(signature, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }

        console.log('[ExpertProgram] Expert registered successfully!', {
          signature,
          expertAccount: expertAccount.toString(),
          authority: authority.toString(),
          confirmation: confirmation.value
        })

        return {
          signature,
          expertPublicKey: authority,
          expertAccount
        }
      })
      
      console.log('[ExpertProgram] Transact completed successfully:', result)
      return result
    } catch (error) {
      console.error('[ExpertProgram] Failed to register expert on chain:', error)
      
      // Enhanced error handling
      if (error.message?.includes('User declined') || error.message?.includes('User rejected')) {
        throw new Error('Registration cancelled by user')
      } else if (error.message?.includes('Insufficient funds') || error.message?.includes('insufficient lamports')) {
        throw new Error('Insufficient SOL for transaction fees. Please add more SOL to your wallet.')
      } else if (error.message?.includes('already exists') || error.message?.includes('already in use')) {
        throw new Error('Expert account already exists for this wallet')
      } else if (error.message?.includes('Transaction failed')) {
        throw new Error(`Registration transaction failed: ${error.message}`)
      } else if (error.message?.includes('Connection')) {
        throw new Error('Network connection error. Please check your connection and try again.')
      } else {
        throw new Error(`Registration failed: ${error.message || 'Unknown error'}`)
      }
    }
  },

  async updateExpertStatusOnChain(isOnline: boolean): Promise<{
    signature: TransactionSignature;
    expertPublicKey: PublicKey;
    newStatus: boolean;
  }> {
    try {
      console.log(`[ExpertProgram] Updating expert status to: ${isOnline ? 'online' : 'offline'}`)

      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: PLATFORM_CONFIG.CLUSTER,
          identity: {
            name: 'ShopSage Expert Status',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        })

        const account = authResult.accounts && authResult.accounts.length > 0 ? authResult.accounts[0] : undefined;
        if (!account) {
          throw new Error('Wallet authorization failed. Please try again.')
        }
        
        // Convert base64 address to PublicKey
        const publicKeyByteArray = toUint8Array(account.address)
        const authority = new PublicKey(publicKeyByteArray)
        console.log('[ExpertProgram] Wallet authorized for status update:', authority.toString())

        // Initialize Solana utils with wallet
        await solanaUtils.initializePrograms(authority)

        // Build update expert status transaction
        const transaction = await solanaUtils.buildUpdateExpertStatusTransaction(authority, isOnline)

        // Get latest blockhash and set transaction details
        const { blockhash } = await solanaUtils.getConnection().getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = authority

        console.log('[ExpertProgram] Status update transaction prepared, requesting signature...')

        // Sign and send the transaction
        const signatures = await wallet.signAndSendTransactions({
          transactions: [transaction],
        })

        const signature = signatures[0]
        console.log('[ExpertProgram] Status update transaction signed with signature:', signature)

        // Wait for transaction confirmation
        console.log('[ExpertProgram] Waiting for status update confirmation...')
        const confirmation = await solanaUtils.getConnection().confirmTransaction(signature, 'confirmed')
        
        if (confirmation.value.err) {
          throw new Error(`Status update transaction failed: ${JSON.stringify(confirmation.value.err)}`)
        }

        console.log('[ExpertProgram] Expert status updated successfully!', {
          signature,
          authority: authority.toString(),
          newStatus: isOnline,
          confirmation: confirmation.value
        })

        return {
          signature,
          expertPublicKey: authority,
          newStatus: isOnline
        }
      })
    } catch (error) {
      console.error('[ExpertProgram] Failed to update expert status on chain:', error)
      
      // Enhanced error handling
      if (error.message?.includes('User declined')) {
        throw new Error('Status update cancelled by user')
      } else if (error.message?.includes('Expert not found')) {
        throw new Error('Expert account not found. Please register as an expert first.')
      } else {
        throw new Error(`Status update failed: ${error.message || 'Unknown error'}`)
      }
    }
  },

  async getExpertFromChain(expertWalletAddress: string): Promise<ChainExpertData | null> {
    try {
      const authority = new PublicKey(expertWalletAddress)
      await solanaUtils.initializePrograms(authority) // Ensure programs are initialized
      return await solanaUtils.getExpertAccount(authority)
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
  async registerExpertHybrid(expertData: ExpertRegistrationData): Promise<{ 
    chainResult: {
      signature: TransactionSignature;
      expertPublicKey: PublicKey;
      expertAccount: PublicKey;
    };
    backendExpert?: any;
  }> {
    try {
      console.log('[ExpertProgram] Starting hybrid expert registration...')

      // First register on blockchain (source of truth)
      const chainResult = await this.registerExpertOnChain(expertData)
      console.log('[ExpertProgram] Blockchain registration successful:', chainResult.signature)

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
          // Include blockchain data
          walletAddress: chainResult.expertPublicKey.toString(),
          expertAccountAddress: chainResult.expertAccount.toString(),
          registrationSignature: chainResult.signature,
        })

        console.log('[ExpertProgram] Backend registration successful')
      } catch (backendError) {
        console.warn('[ExpertProgram] Backend expert registration failed, but blockchain registration succeeded:', backendError)
        // Continue since blockchain is the source of truth
      }

      return { 
        chainResult,
        backendExpert 
      }
    } catch (error) {
      console.error('[ExpertProgram] Failed to register expert (hybrid):', error)
      throw error
    }
  },

  // Update expert status on both chain and backend
  async updateExpertStatusHybrid(isOnline: boolean): Promise<{
    signature: TransactionSignature;
    expertPublicKey: PublicKey;
    newStatus: boolean;
  }> {
    try {
      console.log('[ExpertProgram] Starting hybrid status update...')

      // Update on blockchain first (source of truth)
      const chainResult = await this.updateExpertStatusOnChain(isOnline)
      console.log('[ExpertProgram] Blockchain status update successful:', chainResult.signature)

      // Then update backend for UI consistency
      try {
        const { expertService } = await import('./expertService')
        await expertService.toggleOnlineStatus(isOnline)
        console.log('[ExpertProgram] Backend status update successful')
      } catch (backendError) {
        console.warn('[ExpertProgram] Backend expert status update failed:', backendError)
        // Continue since blockchain is the source of truth
      }

      return chainResult
    } catch (error) {
      console.error('[ExpertProgram] Failed to update expert status (hybrid):', error)
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
