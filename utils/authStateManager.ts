import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from '../config/environment'

/**
 * Auth State Manager - Preserves user registration state across wallet interactions
 */

const STORAGE_KEYS = {
  REGISTRATION_STATE: 'registration_state',
  WALLET_AUTH_STATE: 'wallet_auth_state',
  USER_FLOW_STATE: 'user_flow_state'
} as const

export interface RegistrationState {
  walletAddress: string
  isInRegistrationFlow: boolean
  registrationStep: 'connect-wallet' | 'complete-profile' | 'completed'
  timestamp: number
}

export interface UserFlowState {
  currentFlow: 'registration' | 'session-creation' | 'expert-registration' | 'none'
  data: any
  preserveAuthState: boolean
}

export const authStateManager = {
  /**
   * Save registration state to prevent losing progress during wallet operations
   */
  async saveRegistrationState(state: RegistrationState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REGISTRATION_STATE, JSON.stringify(state))
      log.info('[AuthStateManager] Registration state saved:', state)
    } catch (error) {
      log.error('[AuthStateManager] Failed to save registration state:', error)
    }
  },

  /**
   * Load registration state
   */
  async loadRegistrationState(): Promise<RegistrationState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.REGISTRATION_STATE)
      if (!data) return null
      
      const state = JSON.parse(data) as RegistrationState
      
      // Check if state is not stale (24 hours)
      const isStale = Date.now() - state.timestamp > 24 * 60 * 60 * 1000
      if (isStale) {
        await this.clearRegistrationState()
        return null
      }
      
      log.info('[AuthStateManager] Registration state loaded:', state)
      return state
    } catch (error) {
      log.error('[AuthStateManager] Failed to load registration state:', error)
      return null
    }
  },

  /**
   * Clear registration state
   */
  async clearRegistrationState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REGISTRATION_STATE)
      log.info('[AuthStateManager] Registration state cleared')
    } catch (error) {
      log.error('[AuthStateManager] Failed to clear registration state:', error)
    }
  },

  /**
   * Check if user is in registration flow
   */
  async isInRegistrationFlow(): Promise<boolean> {
    const state = await this.loadRegistrationState()
    const result = state?.isInRegistrationFlow || false
    console.log('[AuthStateManager] isInRegistrationFlow check:', { state, result })
    return result
  },

  /**
   * Start registration flow
   */
  async startRegistrationFlow(walletAddress: string): Promise<void> {
    const state = {
      walletAddress,
      isInRegistrationFlow: true,
      registrationStep: 'connect-wallet' as const,
      timestamp: Date.now()
    }
    console.log('[AuthStateManager] Starting registration flow with state:', state)
    await this.saveRegistrationState(state)
  },

  /**
   * Update registration step
   */
  async updateRegistrationStep(step: RegistrationState['registrationStep']): Promise<void> {
    const currentState = await this.loadRegistrationState()
    if (currentState) {
      await this.saveRegistrationState({
        ...currentState,
        registrationStep: step,
        timestamp: Date.now()
      })
    }
  },

  /**
   * Complete registration flow
   */
  async completeRegistrationFlow(): Promise<void> {
    const currentState = await this.loadRegistrationState()
    if (currentState) {
      await this.saveRegistrationState({
        ...currentState,
        isInRegistrationFlow: false,
        registrationStep: 'completed',
        timestamp: Date.now()
      })
    }
  },

  /**
   * Save user flow state to preserve context during blockchain operations
   */
  async saveUserFlowState(state: UserFlowState): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_FLOW_STATE, JSON.stringify(state))
      log.info('[AuthStateManager] User flow state saved:', state.currentFlow)
    } catch (error) {
      log.error('[AuthStateManager] Failed to save user flow state:', error)
    }
  },

  /**
   * Load user flow state
   */
  async loadUserFlowState(): Promise<UserFlowState | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_FLOW_STATE)
      return data ? JSON.parse(data) : null
    } catch (error) {
      log.error('[AuthStateManager] Failed to load user flow state:', error)
      return null
    }
  },

  /**
   * Clear user flow state
   */
  async clearUserFlowState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_FLOW_STATE)
      log.info('[AuthStateManager] User flow state cleared')
    } catch (error) {
      log.error('[AuthStateManager] Failed to clear user flow state:', error)
    }
  },

  /**
   * Preserve auth state during blockchain operations
   */
  async preserveAuthForBlockchainOp<T>(
    operation: () => Promise<T>,
    context: {
      flow: UserFlowState['currentFlow']
      data?: any
    }
  ): Promise<T> {
    try {
      // Save current flow state
      await this.saveUserFlowState({
        currentFlow: context.flow,
        data: context.data,
        preserveAuthState: true
      })

      // Execute blockchain operation
      const result = await operation()

      // Clear flow state after successful operation
      await this.clearUserFlowState()

      return result
    } catch (error) {
      log.error('[AuthStateManager] Blockchain operation failed:', error)
      // Keep flow state for retry
      throw error
    }
  },

  /**
   * Check if we should preserve auth state during current operation
   */
  async shouldPreserveAuthState(): Promise<boolean> {
    const flowState = await this.loadUserFlowState()
    const registrationState = await this.loadRegistrationState()
    
    return flowState?.preserveAuthState || registrationState?.isInRegistrationFlow || false
  },

  /**
   * Get recovery data for interrupted flows
   */
  async getRecoveryData(): Promise<{
    registrationState: RegistrationState | null
    userFlowState: UserFlowState | null
  }> {
    const [registrationState, userFlowState] = await Promise.all([
      this.loadRegistrationState(),
      this.loadUserFlowState()
    ])

    return { registrationState, userFlowState }
  },

  /**
   * Recover from interrupted registration flow
   */
  async recoverRegistrationFlow(): Promise<{
    shouldRedirectToRegistration: boolean
    walletAddress?: string
    step?: RegistrationState['registrationStep']
  }> {
    const registrationState = await this.loadRegistrationState()
    
    if (!registrationState?.isInRegistrationFlow) {
      return { shouldRedirectToRegistration: false }
    }

    log.info('[AuthStateManager] Recovering registration flow:', registrationState)
    
    return {
      shouldRedirectToRegistration: true,
      walletAddress: registrationState.walletAddress,
      step: registrationState.registrationStep
    }
  }
}