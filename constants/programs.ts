import { PublicKey } from '@solana/web3.js'

// Program IDs from your deployed programs
export const PROGRAM_IDS = {
  SHOPSAGE_PAYMENT: new PublicKey('6cMZaPoG9diMkt9ZAjM4QVKiTzEEnS5X5m3Rk4KD2GiH'),
  SHOPSAGE_SESSION: new PublicKey('BE2PGfJWduNCchbXfX392oP4P2BCbNwHdWA3JpjVxjh9'),
  SHOPSAGE_EXPERT: new PublicKey('96WDSiHJAPs4WmTVn8Yv5JnnWgZR8rz6JCCJiwWBn2Me'),
} as const

// Standard Solana program IDs
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111112')
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

// Platform configuration
export const PLATFORM_CONFIG = {
  // Platform fee account (20% of consultation fees)
  PLATFORM_WALLET: new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),

  // Commission rates
  EXPERT_COMMISSION_RATE: 0.8, // 80%
  PLATFORM_COMMISSION_RATE: 0.2, // 20%

  // Default RPC endpoint
  RPC_ENDPOINT: process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',

  // Network cluster
  CLUSTER: 'devnet' as const,
} as const

// PDA Seeds for deterministic account derivation
export const PDA_SEEDS = {
  PAYMENT: 'payment',
  SESSION: 'session',
  EXPERT: 'expert',
} as const
