import { log } from '@/config/environment'

/**
 * Fallback utilities for native modules that may not be available
 * This helps prevent crashes when native dependencies are missing
 */

// NetInfo fallback
export const createNetInfoFallback = () => {
  log.warn('NetInfo native module not available, using fallback')

  return {
    fetch: () =>
      Promise.resolve({
        isConnected: true,
        isInternetReachable: true,
        type: 'unknown',
        details: null,
      }),
    addEventListener: () => () => {}, // Return empty unsubscribe function
    useNetInfo: () => ({
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
    }),
  }
}

// Notifee fallback
export const createNotifeeFallback = () => {
  log.warn('Notifee native module not available, using fallback')

  return {
    requestPermission: () => Promise.resolve({ authorizationStatus: 1 }),
    createChannel: () => Promise.resolve(),
    displayNotification: () => Promise.resolve(),
    onForegroundEvent: () => () => {}, // Return empty unsubscribe function
    onBackgroundEvent: () => () => {}, // Return empty unsubscribe function
    EventType: {
      DISMISSED: 0,
      PRESS: 1,
    },
  }
}

/**
 * Safely import NetInfo with fallback
 */
export const getSafeNetInfo = () => {
  try {
    const NetInfo = require('@react-native-community/netinfo')
    if (!NetInfo || !NetInfo.fetch) {
      return createNetInfoFallback()
    }
    return NetInfo
  } catch (error) {
    log.warn('Failed to import NetInfo, using fallback:', error)
    return createNetInfoFallback()
  }
}

/**
 * Safely import Notifee with fallback
 */
export const getSafeNotifee = () => {
  log.info('Notifee not installed - using fallback for background notifications')
  return createNotifeeFallback()
}

/**
 * Check if native modules are properly available
 */
export const checkNativeModuleAvailability = () => {
  const status = {
    netinfo: false,
    notifee: false,
  }

  try {
    const NetInfo = require('@react-native-community/netinfo')
    status.netinfo = !!(NetInfo && NetInfo.fetch)
  } catch (error) {
    log.warn('NetInfo not available:', error)
  }

  // Notifee is not installed
  status.notifee = false

  log.info('Native module availability:', status)
  return status
}
