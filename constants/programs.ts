import { PublicKey } from '@solana/web3.js'
import { AppConfig } from '../config/environment'

// Network types
export type SolanaNetwork = 'localnet' | 'devnet' | 'testnet' | 'mainnet-beta'

// Network-specific program IDs
export const PROGRAM_IDS_BY_NETWORK = {
  localnet: {
    SHOPSAGE_PAYMENT: new PublicKey('GN61kESLP3vmVREX6nhTfqEf94vyuLX8YK4trEv6u6cZ'),
    SHOPSAGE_SESSION: new PublicKey('5dDShygfkN6qwRh7jrPN5BmNcDY4EF5LY88Ffw7dS1Zc'),
    SHOPSAGE_EXPERT: new PublicKey('GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3'),
  },
  devnet: {
    // Updated with actual devnet deployment IDs
    SHOPSAGE_PAYMENT: new PublicKey('GN61kESLP3vmVREX6nhTfqEf94vyuLX8YK4trEv6u6cZ'),
    SHOPSAGE_SESSION: new PublicKey('5dDShygfkN6qwRh7jrPN5BmNcDY4EF5LY88Ffw7dS1Zc'),
    SHOPSAGE_EXPERT: new PublicKey('GHfHdFkfV93FGVz5atrTSUyBHpKkot4XkTRTaVdHD9b3'),
  },
  testnet: {
    // Placeholder for testnet deployment
    SHOPSAGE_PAYMENT: new PublicKey('11111111111111111111111111111112'),
    SHOPSAGE_SESSION: new PublicKey('11111111111111111111111111111112'),
    SHOPSAGE_EXPERT: new PublicKey('11111111111111111111111111111112'),
  },
  'mainnet-beta': {
    // Placeholder for mainnet deployment
    SHOPSAGE_PAYMENT: new PublicKey('11111111111111111111111111111112'),
    SHOPSAGE_SESSION: new PublicKey('11111111111111111111111111111112'),
    SHOPSAGE_EXPERT: new PublicKey('11111111111111111111111111111112'),
  },
} as const

// Get program IDs for current network
export function getProgramIds(network: SolanaNetwork) {
  return PROGRAM_IDS_BY_NETWORK[network]
}

// Legacy support - uses current network from environment
export const PROGRAM_IDS = getProgramIds(
  (process.env.EXPO_PUBLIC_SOLANA_CLUSTER as SolanaNetwork) || 'localnet'
)

// Standard Solana program IDs
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111112')
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

// Network-specific RPC endpoints
export const RPC_ENDPOINTS = {
  localnet: 'http://127.0.0.1:8899',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
} as const

// Get current network from environment (consolidated with AppConfig)
export function getCurrentNetwork(): SolanaNetwork {
  // Auto-detect local validator from RPC URL
  if (AppConfig.blockchain.rpcUrl.includes('127.0.0.1') || 
      AppConfig.blockchain.rpcUrl.includes('localhost')) {
    return 'localnet'
  }
  
  // Map AppConfig cluster to SolanaNetwork
  const clusterMap: Record<string, SolanaNetwork> = {
    'devnet': 'devnet',
    'testnet': 'testnet',
    'mainnet-beta': 'mainnet-beta'
  }
  
  return clusterMap[AppConfig.blockchain.cluster] || 'localnet'
}

// Get RPC endpoint for current network (use AppConfig)
export function getCurrentRpcEndpoint(): string {
  return AppConfig.blockchain.rpcUrl
}

// Platform configuration
export const PLATFORM_CONFIG = {
  // Platform fee account (20% of consultation fees)
  PLATFORM_WALLET: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),

  // Commission rates
  EXPERT_COMMISSION_RATE: 0.8, // 80%
  PLATFORM_COMMISSION_RATE: 0.2, // 20%

  // Dynamic network configuration
  get NETWORK(): SolanaNetwork {
    return getCurrentNetwork()
  },
  
  get RPC_ENDPOINT(): string {
    return getCurrentRpcEndpoint()
  },

  get CLUSTER(): string {
    const network = getCurrentNetwork()
    // For localnet, we need to use 'localnet' to maintain consistency
    // Mobile Wallet Adapter should connect to the actual RPC endpoint
    return network
  },
} as const

// PDA Seeds for deterministic account derivation
export const PDA_SEEDS = {
  PAYMENT: 'payment',
  SESSION: 'session',
  EXPERT: 'expert',
} as const
