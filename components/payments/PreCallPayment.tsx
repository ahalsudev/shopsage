import { PLATFORM_CONFIG } from '@/constants/programs'
import { paymentService } from '@/services/paymentService'
import { PaymentBreakdown, PaymentResult, PreCallPaymentProps } from '@/types/payments'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useCluster } from '../cluster/cluster-provider'

const PreCallPayment: React.FC<PreCallPaymentProps> = ({
  visible,
  expert,
  session,
  onPaymentSuccess,
  onPaymentCancel,
  onPaymentError,
}) => {
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [solToUsd, setSolToUsd] = useState(0)
  const [networkFee, setNetworkFee] = useState(0)
  const { selectedCluster } = useCluster();


  useEffect(() => {
    if (visible) {
      calculatePaymentBreakdown()
      fetchSolPrice()
      calculateNetworkFee()
    }
  }, [visible, expert.sessionRate])

  const calculatePaymentBreakdown = () => {
    const sessionRate = expert.sessionRate
    const platformFeeRate = PLATFORM_CONFIG.PLATFORM_COMMISSION_RATE // 20%
    const expertRate = PLATFORM_CONFIG.EXPERT_COMMISSION_RATE // 80%

    const expertAmount = sessionRate * expertRate
    const platformFee = sessionRate * platformFeeRate
    const totalAmount = sessionRate // Total amount user pays

    setPaymentBreakdown({
      sessionRate,
      platformFee,
      networkFee: 0, // Will be updated by calculateNetworkFee
      totalAmount,
      expertAmount,
    })
  }

  const fetchSolPrice = async () => {
    try {
      const price = await paymentService.getSolPrice()
      setSolToUsd(price)
    } catch (error) {
      console.warn('Failed to fetch SOL price:', error)
      setSolToUsd(0)
    }
  }

  const calculateNetworkFee = async () => {
    try {
      const fee = await paymentService.calculateNetworkFee()
      setNetworkFee(fee)
      
      // Update breakdown with network fee
      setPaymentBreakdown(prev => prev ? {
        ...prev,
        networkFee: fee,
        totalAmount: prev.sessionRate + fee
      } : null)
    } catch (error) {
      console.warn('Failed to calculate network fee:', error)
      setNetworkFee(0.000005) // Default fallback
    }
  }

  const handlePayment = async () => {
    if (!paymentBreakdown) {
      onPaymentError('Payment calculation not ready')
      return
    }

    setIsProcessing(true)
    
    try {
      console.log('[PreCallPayment] Processing payment for session:', session.id)
      
      // Process payment through mobile wallet
      const paymentResult = await paymentService.processConsultationPayment({
        sessionId: session.id,
        expertWalletAddress: expert.walletAddress,
        amount: expert.sessionRate, // Amount without network fee (wallet handles that)
        sessionData: {
          expertId: expert.id,
          expertName: expert.name,
          specialization: expert.specialization,
        },
        selectedCluster
      })

      console.log('[PreCallPayment] Payment successful:', paymentResult.signature)

      // Create successful result
      const result: PaymentResult = {
        success: true,
        transactionHash: paymentResult.signature,
        breakdown: paymentBreakdown,
      }

      onPaymentSuccess(result)
      
    } catch (error) {
      console.error('[PreCallPayment] Payment failed:', error)
      
      let errorMessage = 'Payment failed. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('User declined')) {
          errorMessage = 'Payment was cancelled.'
        } else if (error.message.includes('Insufficient funds')) {
          errorMessage = 'Insufficient SOL balance for payment and fees.'
        } else {
          errorMessage = error.message
        }
      }
      
      onPaymentError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatSol = (amount: number) => {
    return amount.toFixed(6).replace(/\.?0+$/, '')
  }

  const formatUsd = (solAmount: number) => {
    if (!solToUsd) return ''
    return `(~$${(solAmount * solToUsd).toFixed(2)})`
  }

  if (!paymentBreakdown) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Calculating payment...</Text>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Confirm Payment</Text>
            <Text style={styles.subtitle}>5-Minute Consultation</Text>
          </View>

          {/* Expert Info */}
          <View style={styles.expertSection}>
            <View style={styles.expertAvatar}>
              <Text style={styles.avatarText}>{expert.avatar || '👨‍💼'}</Text>
            </View>
            <View style={styles.expertInfo}>
              <Text style={styles.expertName}>{expert.name}</Text>
              <Text style={styles.expertSpecialization}>{expert.specialization}</Text>
            </View>
          </View>

          {/* Payment Breakdown */}
          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Payment Breakdown</Text>
            
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Session Rate</Text>
              <View style={styles.breakdownAmount}>
                <Text style={styles.breakdownValue}>
                  {formatSol(paymentBreakdown.sessionRate)} SOL
                </Text>
                <Text style={styles.breakdownUsd}>
                  {formatUsd(paymentBreakdown.sessionRate)}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Expert receives (80%)</Text>
              <View style={styles.breakdownAmount}>
                <Text style={styles.breakdownValue}>
                  {formatSol(paymentBreakdown.expertAmount)} SOL
                </Text>
                <Text style={styles.breakdownUsd}>
                  {formatUsd(paymentBreakdown.expertAmount)}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Platform Fee (20%)</Text>
              <View style={styles.breakdownAmount}>
                <Text style={styles.breakdownValue}>
                  {formatSol(paymentBreakdown.platformFee)} SOL
                </Text>
                <Text style={styles.breakdownUsd}>
                  {formatUsd(paymentBreakdown.platformFee)}
                </Text>
              </View>
            </View>

            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Network Fee</Text>
              <View style={styles.breakdownAmount}>
                <Text style={styles.breakdownValue}>
                  ~{formatSol(paymentBreakdown.networkFee)} SOL
                </Text>
                <Text style={styles.breakdownUsd}>
                  {formatUsd(paymentBreakdown.networkFee)}
                </Text>
              </View>
            </View>

            <View style={[styles.breakdownItem, styles.totalItem]}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={styles.breakdownAmount}>
                <Text style={styles.totalValue}>
                  {formatSol(paymentBreakdown.totalAmount)} SOL
                </Text>
                <Text style={styles.totalUsd}>
                  {formatUsd(paymentBreakdown.totalAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onPaymentCancel}
              disabled={isProcessing}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.payButton, isProcessing && styles.payButtonDisabled]} 
              onPress={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.payButtonText}>Pay with Wallet</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Payment will be processed through your connected Solana wallet. 
            The consultation will begin immediately after payment confirmation.
          </Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  expertSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  expertAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  expertInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  expertSpecialization: {
    fontSize: 14,
    color: '#64748b',
  },
  breakdownSection: {
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalItem: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginTop: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownAmount: {
    alignItems: 'flex-end',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  breakdownUsd: {
    fontSize: 12,
    color: '#64748b',
  },
  totalUsd: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  payButton: {
    flex: 2,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disclaimer: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6366f1',
    marginTop: 12,
    textAlign: 'center',
  },
})

export default PreCallPayment