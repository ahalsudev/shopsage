import { Connection, PublicKey } from '@solana/web3.js'
import { PLATFORM_CONFIG } from '../constants/programs'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface TransactionStatus {
  signature: string
  status: 'pending' | 'confirmed' | 'finalized' | 'failed'
  confirmations: number
  blockTime?: number
  error?: string
  slot?: number
}

export interface PendingTransaction {
  signature: string
  type: 'payment' | 'session_create' | 'session_start' | 'session_end' | 'expert_register' | 'expert_status'
  metadata: any
  timestamp: number
}

class TransactionMonitorService {
  private connection: Connection
  private pendingTransactions: Map<string, PendingTransaction> = new Map()
  private statusListeners: Map<string, ((status: TransactionStatus) => void)[]> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private readonly MONITORING_INTERVAL = 5000 // 5 seconds
  private readonly STORAGE_KEY = 'pending_transactions'

  constructor() {
    this.connection = new Connection(PLATFORM_CONFIG.RPC_ENDPOINT, 'confirmed')
    this.loadPendingTransactions()
    this.startMonitoring()
  }

  async addTransaction(signature: string, type: PendingTransaction['type'], metadata: any = {}): Promise<void> {
    const transaction: PendingTransaction = {
      signature,
      type,
      metadata,
      timestamp: Date.now(),
    }

    this.pendingTransactions.set(signature, transaction)
    await this.savePendingTransactions()

    console.log(`Added transaction to monitor: ${signature} (${type})`)
  }

  addStatusListener(signature: string, listener: (status: TransactionStatus) => void): () => void {
    if (!this.statusListeners.has(signature)) {
      this.statusListeners.set(signature, [])
    }
    this.statusListeners.get(signature)!.push(listener)

    // Return unsubscribe function
    return () => {
      const listeners = this.statusListeners.get(signature)
      if (listeners) {
        const index = listeners.indexOf(listener)
        if (index > -1) {
          listeners.splice(index, 1)
        }
        if (listeners.length === 0) {
          this.statusListeners.delete(signature)
        }
      }
    }
  }

  async getTransactionStatus(signature: string): Promise<TransactionStatus> {
    try {
      const signatureStatus = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      })

      if (!signatureStatus.value) {
        return {
          signature,
          status: 'pending',
          confirmations: 0,
        }
      }

      const status = signatureStatus.value

      if (status.err) {
        return {
          signature,
          status: 'failed',
          confirmations: status.confirmations || 0,
          error: JSON.stringify(status.err),
        }
      }

      let transactionStatus: TransactionStatus['status'] = 'pending'
      if (status.confirmationStatus === 'processed') {
        transactionStatus = 'pending'
      } else if (status.confirmationStatus === 'confirmed') {
        transactionStatus = 'confirmed'
      } else if (status.confirmationStatus === 'finalized') {
        transactionStatus = 'finalized'
      }

      return {
        signature,
        status: transactionStatus,
        confirmations: status.confirmations || 0,
        slot: status.slot,
      }
    } catch (error) {
      console.error('Failed to get transaction status:', error)
      return {
        signature,
        status: 'failed',
        confirmations: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async waitForConfirmation(
    signature: string,
    commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
    timeout: number = 60000, // 60 seconds
  ): Promise<TransactionStatus> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now()

      const checkStatus = async () => {
        try {
          const status = await this.getTransactionStatus(signature)

          if (status.status === 'failed') {
            reject(new Error(`Transaction failed: ${status.error}`))
            return
          }

          if (
            (commitment === 'processed' && status.confirmations > 0) ||
            (commitment === 'confirmed' && status.status === 'confirmed') ||
            (commitment === 'finalized' && status.status === 'finalized')
          ) {
            resolve(status)
            return
          }

          if (Date.now() - startTime > timeout) {
            reject(new Error('Transaction confirmation timeout'))
            return
          }

          // Check again in 2 seconds
          setTimeout(checkStatus, 2000)
        } catch (error) {
          reject(error)
        }
      }

      checkStatus()
    })
  }

  private async monitorPendingTransactions(): Promise<void> {
    if (this.pendingTransactions.size === 0) {
      return
    }

    const signatures = Array.from(this.pendingTransactions.keys())

    for (const signature of signatures) {
      try {
        const status = await this.getTransactionStatus(signature)

        // Notify listeners
        const listeners = this.statusListeners.get(signature)
        if (listeners) {
          listeners.forEach((listener) => {
            try {
              listener(status)
            } catch (error) {
              console.error('Error in transaction status listener:', error)
            }
          })
        }

        // Remove from pending if finalized or failed
        if (status.status === 'finalized' || status.status === 'failed') {
          this.pendingTransactions.delete(signature)
          this.statusListeners.delete(signature)
          await this.savePendingTransactions()

          console.log(`Transaction ${status.status}: ${signature}`)
        }
      } catch (error) {
        console.error(`Failed to monitor transaction ${signature}:`, error)
      }
    }
  }

  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(() => {
      this.monitorPendingTransactions()
    }, this.MONITORING_INTERVAL)
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  private async loadPendingTransactions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const transactions: PendingTransaction[] = JSON.parse(stored)

        // Filter out transactions older than 10 minutes
        const now = Date.now()
        const validTransactions = transactions.filter((tx) => now - tx.timestamp < 10 * 60 * 1000)

        this.pendingTransactions.clear()
        validTransactions.forEach((tx) => {
          this.pendingTransactions.set(tx.signature, tx)
        })

        console.log(`Loaded ${validTransactions.length} pending transactions`)
      }
    } catch (error) {
      console.error('Failed to load pending transactions:', error)
    }
  }

  private async savePendingTransactions(): Promise<void> {
    try {
      const transactions = Array.from(this.pendingTransactions.values())
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(transactions))
    } catch (error) {
      console.error('Failed to save pending transactions:', error)
    }
  }

  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
  }

  hasPendingTransaction(signature: string): boolean {
    return this.pendingTransactions.has(signature)
  }

  async clearExpiredTransactions(): Promise<void> {
    const now = Date.now()
    const expiredSignatures: string[] = []

    this.pendingTransactions.forEach((transaction, signature) => {
      // Remove transactions older than 1 hour
      if (now - transaction.timestamp > 60 * 60 * 1000) {
        expiredSignatures.push(signature)
      }
    })

    expiredSignatures.forEach((signature) => {
      this.pendingTransactions.delete(signature)
      this.statusListeners.delete(signature)
    })

    if (expiredSignatures.length > 0) {
      await this.savePendingTransactions()
      console.log(`Cleared ${expiredSignatures.length} expired transactions`)
    }
  }

  async getTransactionDetails(signature: string): Promise<any> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      return transaction
    } catch (error) {
      console.error('Failed to get transaction details:', error)
      return null
    }
  }

  // Utility method to format transaction for display
  formatTransactionForDisplay(transaction: PendingTransaction, status?: TransactionStatus) {
    const typeLabels = {
      payment: 'Payment',
      session_create: 'Create Session',
      session_start: 'Start Session',
      session_end: 'End Session',
      expert_register: 'Register Expert',
      expert_status: 'Update Status',
    }

    return {
      id: transaction.signature,
      type: typeLabels[transaction.type] || transaction.type,
      status: status?.status || 'pending',
      timestamp: transaction.timestamp,
      metadata: transaction.metadata,
      confirmations: status?.confirmations || 0,
      error: status?.error,
    }
  }
}

// Export singleton instance
export const transactionMonitor = new TransactionMonitorService()
export default transactionMonitor
