/**
 * App Initializer
 * Handles app startup configuration and validation
 */

import { logConfig, validateConfig, log } from '../config/environment'

export const initializeApp = async (): Promise<void> => {
  try {
    log.info('=== Initializing ShopSage Mobile App ===')

    // Log current configuration
    logConfig()

    // Validate configuration
    const validation = validateConfig()
    if (!validation.isValid) {
      log.error('Configuration validation failed:', validation.errors)
      throw new Error(`Configuration errors: ${validation.errors.join(', ')}`)
    }

    log.info('App initialization completed successfully')
  } catch (error) {
    log.error('App initialization failed:', error)
    throw error
  }
}
