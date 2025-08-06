/**
 * Environment Configuration
 * Centralized configuration for the app based on environment variables
 */

export interface AppConfigInterface {
  name: string
  uri: string
  domain: string
  api: {
    useRemoteApi: boolean
    baseUrl: string
    timeout: number
  }
  development: {
    devMode: boolean
    enableLogging: boolean
    showNetworkLogs: boolean
  }
  blockchain: {
    cluster: 'devnet' | 'testnet' | 'mainnet-beta'
    rpcUrl: string
  }
  features: {
    enableBlockchain: boolean
    enableRealTimeChat: boolean
    enablePushNotifications: boolean
  }
}

// Get environment variable with fallback
const getEnvVar = (key: string, fallback: string = ''): string => {
  return process.env[key] || fallback
}

const getBooleanEnvVar = (key: string, fallback: boolean = false): boolean => {
  const value = process.env[key]?.toLowerCase()
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

// Main configuration object
export const AppConfig: AppConfigInterface = {
  name: 'shopsage-mobile',
  uri: 'https://shopsage.site',
  domain: 'shopsage.site',
  api: {
    useRemoteApi: getBooleanEnvVar('EXPO_PUBLIC_USE_REMOTE_API', false),
    baseUrl: getEnvVar('EXPO_PUBLIC_API_BASE_URL', 'http://192.168.8.153:3001/api'),
    timeout: 10000, // 10 seconds
  },
  development: {
    devMode: getBooleanEnvVar('EXPO_PUBLIC_DEV_MODE', __DEV__),
    enableLogging: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_LOGGING', __DEV__),
    showNetworkLogs: getBooleanEnvVar('EXPO_PUBLIC_SHOW_NETWORK_LOGS', __DEV__),
  },
  blockchain: {
    cluster: (getEnvVar('EXPO_PUBLIC_SOLANA_CLUSTER', 'devnet') as any) || 'devnet',
    rpcUrl: getEnvVar('EXPO_PUBLIC_SOLANA_RPC_URL', 'https://api.devnet.solana.com'),
  },
  features: {
    enableBlockchain: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_BLOCKCHAIN', false),
    enableRealTimeChat: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_REALTIME_CHAT', true),
    enablePushNotifications: getBooleanEnvVar('EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS', true),
  },
}

// Development helpers
export const isDevelopment = AppConfig.development.devMode
export const isProduction = !isDevelopment
export const useRemoteApi = AppConfig.api.useRemoteApi

// Logging utility
export const log = {
  info: (...args: any[]) => {
    if (AppConfig.development.enableLogging) {
      console.log('[INFO]', ...args)
    }
  },
  warn: (...args: any[]) => {
    if (AppConfig.development.enableLogging) {
      console.warn('[WARN]', ...args)
    }
  },
  error: (...args: any[]) => {
    if (AppConfig.development.enableLogging) {
      console.error('[ERROR]', ...args)
    }
  },
  network: (...args: any[]) => {
    if (AppConfig.development.showNetworkLogs) {
      console.log('[NETWORK]', ...args)
    }
  },
}

// Configuration validation
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (AppConfig.api.useRemoteApi && !AppConfig.api.baseUrl) {
    errors.push('API_BASE_URL is required when USE_REMOTE_API is true')
  }

  if (!AppConfig.blockchain.rpcUrl) {
    errors.push('SOLANA_RPC_URL is required')
  }

  const validClusters = ['devnet', 'testnet', 'mainnet-beta']
  if (!validClusters.includes(AppConfig.blockchain.cluster)) {
    errors.push(`Invalid SOLANA_CLUSTER. Must be one of: ${validClusters.join(', ')}`)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Debug function to log current configuration
export const logConfig = () => {
  if (AppConfig.development.enableLogging) {
    console.log('=== ShopSage App Configuration ===')
    console.log('API Mode:', AppConfig.api.useRemoteApi ? 'Remote' : 'Local Mock')
    console.log('API Base URL:', AppConfig.api.baseUrl)
    console.log('Development Mode:', AppConfig.development.devMode)
    console.log('Blockchain Cluster:', AppConfig.blockchain.cluster)
    console.log('RPC URL:', AppConfig.blockchain.rpcUrl)
    console.log('==================================')

    const validation = validateConfig()
    if (!validation.isValid) {
      console.error('Configuration Errors:', validation.errors)
    }
  }
}
