import { PaymentStatus } from '@/types/payments'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface PaymentStatusIndicatorProps {
  status: PaymentStatus['status']
  amount?: number
  compact?: boolean
}

const PaymentStatusIndicator: React.FC<PaymentStatusIndicatorProps> = ({
  status,
  amount,
  compact = false,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'paid':
        return '#10b981'
      case 'processing':
        return '#f59e0b'
      case 'failed':
        return '#ef4444'
      case 'unpaid':
      default:
        return '#6b7280'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'paid':
        return compact ? 'Paid' : 'Payment Confirmed'
      case 'processing':
        return compact ? 'Processing' : 'Payment Processing'
      case 'failed':
        return compact ? 'Failed' : 'Payment Failed'
      case 'unpaid':
      default:
        return compact ? 'Unpaid' : 'Payment Required'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'paid':
        return '✓'
      case 'processing':
        return '⏳'
      case 'failed':
        return '✗'
      case 'unpaid':
      default:
        return '💳'
    }
  }

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View 
        style={[
          styles.indicator, 
          { backgroundColor: getStatusColor() },
          compact && styles.compactIndicator
        ]}
      >
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text 
          style={[
            styles.statusText, 
            { color: getStatusColor() },
            compact && styles.compactText
          ]}
        >
          {getStatusText()}
        </Text>
        {amount && !compact && (
          <Text style={styles.amountText}>
            {amount.toFixed(4)} SOL
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compactContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  compactIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  icon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactText: {
    fontSize: 12,
  },
  amountText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
})

export default PaymentStatusIndicator