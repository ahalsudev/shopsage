import { log } from '@/config/environment'

interface ErrorDetails {
  message: string
  stack?: string
  timestamp: Date
  context: string
  additionalInfo?: any
}

class GlobalErrorHandler {
  private errors: ErrorDetails[] = []
  private isHandlingError = false

  init() {
    console.log('[GlobalErrorHandler] Initializing React Native compatible error handler...')
    
    // Only use React Native's ErrorUtils
    if (typeof global !== 'undefined' && global.ErrorUtils) {
      const originalHandler = global.ErrorUtils.getGlobalHandler()
      
      global.ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        console.error('[GlobalErrorHandler] FATAL ERROR DETECTED:', error?.message || error)
        console.error('[GlobalErrorHandler] Error details:', {
          name: error?.name,
          message: error?.message,
          isFatal
        })
        
        this.captureError(error, 'ReactNativeGlobalHandler', { isFatal })
        
        // Call the original handler to maintain normal behavior
        if (originalHandler) {
          originalHandler(error, isFatal)
        }
      })
      
      console.log('[GlobalErrorHandler] React Native error handler set up successfully')
    } else {
      console.log('[GlobalErrorHandler] ErrorUtils not available - basic logging only')
    }

    log.info('Global error handler initialized')
  }

  captureError(error: Error, context: string, additionalInfo?: any) {
    if (this.isHandlingError) {
      // Prevent infinite loops
      return
    }

    this.isHandlingError = true

    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date(),
      context,
      additionalInfo
    }

    this.errors.push(errorDetails)
    
    // Log the error with full details
    log.error(`[${context}] Error captured:`, {
      message: error.message,
      stack: error.stack,
      additionalInfo,
      timestamp: errorDetails.timestamp.toISOString()
    })

    // Keep only the last 10 errors to avoid memory issues
    if (this.errors.length > 10) {
      this.errors = this.errors.slice(-10)
    }

    this.isHandlingError = false
  }

  getRecentErrors(): ErrorDetails[] {
    return [...this.errors]
  }

  clearErrors() {
    this.errors = []
  }

  // Wrap async functions to catch errors
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      } catch (error) {
        this.captureError(
          error instanceof Error ? error : new Error(String(error)),
          `AsyncWrapper:${context}`
        )
        throw error
      }
    }
  }

  // Wrap sync functions to catch errors  
  wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    context: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args)
      } catch (error) {
        this.captureError(
          error instanceof Error ? error : new Error(String(error)),
          `SyncWrapper:${context}`
        )
        throw error
      }
    }
  }
}

export const globalErrorHandler = new GlobalErrorHandler()

// Initialize on import
globalErrorHandler.init()