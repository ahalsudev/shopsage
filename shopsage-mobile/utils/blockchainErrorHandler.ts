import { Alert } from 'react-native'

export enum BlockchainErrorType {
  WALLET_CONNECTION = 'wallet_connection',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  TRANSACTION_FAILED = 'transaction_failed',
  PROGRAM_ERROR = 'program_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  USER_REJECTED = 'user_rejected',
  INVALID_ACCOUNT = 'invalid_account',
  ACCOUNT_NOT_FOUND = 'account_not_found',
  UNAUTHORIZED = 'unauthorized',
  UNKNOWN = 'unknown',
}

export interface BlockchainError {
  type: BlockchainErrorType
  message: string
  originalError?: any
  userMessage: string
  canRetry: boolean
  suggestedAction?: string
}

export class BlockchainErrorHandler {
  static parseError(error: any): BlockchainError {
    const errorStr = error?.message || error?.toString() || 'Unknown error'
    const lowerErrorStr = errorStr.toLowerCase()

    // Wallet connection errors
    if (lowerErrorStr.includes('wallet') && lowerErrorStr.includes('not connected')) {
      return {
        type: BlockchainErrorType.WALLET_CONNECTION,
        message: errorStr,
        originalError: error,
        userMessage: 'Please connect your wallet to continue',
        canRetry: true,
        suggestedAction: 'Connect your wallet and try again',
      }
    }

    // User rejected transaction
    if (lowerErrorStr.includes('user rejected') || lowerErrorStr.includes('user denied')) {
      return {
        type: BlockchainErrorType.USER_REJECTED,
        message: errorStr,
        originalError: error,
        userMessage: 'Transaction was cancelled',
        canRetry: true,
        suggestedAction: 'Try the transaction again and approve it in your wallet',
      }
    }

    // Insufficient funds
    if (lowerErrorStr.includes('insufficient') || lowerErrorStr.includes('balance')) {
      return {
        type: BlockchainErrorType.INSUFFICIENT_FUNDS,
        message: errorStr,
        originalError: error,
        userMessage: 'Insufficient funds to complete this transaction',
        canRetry: false,
        suggestedAction: 'Add more SOL to your wallet',
      }
    }

    // Program-specific errors
    if (lowerErrorStr.includes('program error') || lowerErrorStr.includes('0x')) {
      const programErrorType = this.parseProgramError(errorStr)
      return {
        type: BlockchainErrorType.PROGRAM_ERROR,
        message: errorStr,
        originalError: error,
        userMessage: programErrorType.userMessage,
        canRetry: programErrorType.canRetry,
        suggestedAction: programErrorType.suggestedAction,
      }
    }

    // Network/RPC errors
    if (lowerErrorStr.includes('network') || lowerErrorStr.includes('rpc') || lowerErrorStr.includes('fetch')) {
      return {
        type: BlockchainErrorType.NETWORK_ERROR,
        message: errorStr,
        originalError: error,
        userMessage: 'Network connection error',
        canRetry: true,
        suggestedAction: 'Check your internet connection and try again',
      }
    }

    // Timeout errors
    if (lowerErrorStr.includes('timeout') || lowerErrorStr.includes('timed out')) {
      return {
        type: BlockchainErrorType.TIMEOUT,
        message: errorStr,
        originalError: error,
        userMessage: 'Transaction timed out',
        canRetry: true,
        suggestedAction: 'The network might be congested. Try again in a few moments',
      }
    }

    // Account errors
    if (lowerErrorStr.includes('account not found') || lowerErrorStr.includes('invalid account')) {
      return {
        type: BlockchainErrorType.ACCOUNT_NOT_FOUND,
        message: errorStr,
        originalError: error,
        userMessage: 'Account not found on blockchain',
        canRetry: false,
        suggestedAction: 'Make sure you have the correct wallet address',
      }
    }

    // Unauthorized errors
    if (lowerErrorStr.includes('unauthorized') || lowerErrorStr.includes('permission denied')) {
      return {
        type: BlockchainErrorType.UNAUTHORIZED,
        message: errorStr,
        originalError: error,
        userMessage: 'You are not authorized to perform this action',
        canRetry: false,
        suggestedAction: 'Make sure you are using the correct wallet',
      }
    }

    // Default unknown error
    return {
      type: BlockchainErrorType.UNKNOWN,
      message: errorStr,
      originalError: error,
      userMessage: 'An unexpected error occurred',
      canRetry: true,
      suggestedAction: 'Please try again or contact support if the problem persists',
    }
  }

  private static parseProgramError(errorStr: string): {
    userMessage: string
    canRetry: boolean
    suggestedAction: string
  } {
    const lowerError = errorStr.toLowerCase()

    // ShopSage-specific program errors
    if (lowerError.includes('invalid session status')) {
      return {
        userMessage: 'Session is in an invalid state for this action',
        canRetry: false,
        suggestedAction: 'Check the session status and try the appropriate action',
      }
    }

    if (lowerError.includes('unauthorized')) {
      return {
        userMessage: 'You are not authorized to perform this action',
        canRetry: false,
        suggestedAction: 'Make sure you are the correct participant in this session',
      }
    }

    if (lowerError.includes('expert already exists')) {
      return {
        userMessage: 'Expert profile already exists for this wallet',
        canRetry: false,
        suggestedAction: 'Use the update profile function instead',
      }
    }

    if (lowerError.includes('insufficient funds')) {
      return {
        userMessage: 'Insufficient funds for payment',
        canRetry: false,
        suggestedAction: 'Add more SOL to your wallet',
      }
    }

    if (lowerError.includes('invalid amount')) {
      return {
        userMessage: 'Invalid payment amount',
        canRetry: false,
        suggestedAction: 'Check the consultation fee and try again',
      }
    }

    // Generic program error
    return {
      userMessage: 'Smart contract operation failed',
      canRetry: true,
      suggestedAction: 'Try again or contact support if the problem persists',
    }
  }

  static showErrorAlert(error: BlockchainError, onRetry?: () => void): void {
    const buttons: any[] = [{ text: 'OK', style: 'default' }]

    if (error.canRetry && onRetry) {
      buttons.unshift({
        text: 'Retry',
        style: 'default',
        onPress: onRetry,
      })
    }

    Alert.alert('Transaction Error', `${error.userMessage}\n\n${error.suggestedAction || ''}`, buttons)
  }

  static showSuccessAlert(title: string, message: string): void {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }])
  }

  static showWarningAlert(title: string, message: string, onConfirm?: () => void): void {
    const buttons: any[] = [{ text: 'Cancel', style: 'cancel' }]

    if (onConfirm) {
      buttons.push({
        text: 'Continue',
        style: 'destructive',
        onPress: onConfirm,
      })
    }

    Alert.alert(title, message, buttons)
  }

  static logError(error: BlockchainError, context: string): void {
    console.error(`[${context}] Blockchain Error:`, {
      type: error.type,
      message: error.message,
      userMessage: error.userMessage,
      canRetry: error.canRetry,
      suggestedAction: error.suggestedAction,
      originalError: error.originalError,
    })
  }

  // Utility method for handling common async blockchain operations
  static async handleBlockchainOperation<T>(
    operation: () => Promise<T>,
    context: string,
    options: {
      showSuccessAlert?: boolean
      successTitle?: string
      successMessage?: string
      showErrorAlert?: boolean
      onRetry?: () => void
    } = {},
  ): Promise<T | null> {
    try {
      const result = await operation()

      if (options.showSuccessAlert && options.successTitle && options.successMessage) {
        this.showSuccessAlert(options.successTitle, options.successMessage)
      }

      return result
    } catch (error) {
      const blockchainError = this.parseError(error)
      this.logError(blockchainError, context)

      if (options.showErrorAlert !== false) {
        this.showErrorAlert(blockchainError, options.onRetry)
      }

      return null
    }
  }

  // Specific handlers for common operations
  static async handlePaymentOperation<T>(operation: () => Promise<T>, onRetry?: () => void): Promise<T | null> {
    return this.handleBlockchainOperation(operation, 'Payment', {
      showSuccessAlert: true,
      successTitle: 'Payment Successful',
      successMessage: 'Your payment has been processed successfully',
      showErrorAlert: true,
      onRetry,
    })
  }

  static async handleSessionOperation<T>(
    operation: () => Promise<T>,
    operationType: 'create' | 'start' | 'end' | 'cancel',
    onRetry?: () => void,
  ): Promise<T | null> {
    const actionLabels = {
      create: 'Session Created',
      start: 'Session Started',
      end: 'Session Ended',
      cancel: 'Session Cancelled',
    }

    return this.handleBlockchainOperation(operation, `Session ${operationType}`, {
      showSuccessAlert: true,
      successTitle: actionLabels[operationType],
      successMessage: `Your session has been ${operationType}d successfully`,
      showErrorAlert: true,
      onRetry,
    })
  }

  static async handleExpertOperation<T>(
    operation: () => Promise<T>,
    operationType: 'register' | 'update',
    onRetry?: () => void,
  ): Promise<T | null> {
    const actionLabels = {
      register: 'Expert Registration',
      update: 'Profile Updated',
    }

    const successMessages = {
      register: 'Your expert profile has been registered successfully',
      update: 'Your expert profile has been updated successfully',
    }

    return this.handleBlockchainOperation(operation, `Expert ${operationType}`, {
      showSuccessAlert: true,
      successTitle: actionLabels[operationType],
      successMessage: successMessages[operationType],
      showErrorAlert: true,
      onRetry,
    })
  }
}

export default BlockchainErrorHandler
