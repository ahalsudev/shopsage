export interface ExpertPaymentInfo {
  id: string
  name: string
  specialization: string
  sessionRate: number
  walletAddress: string
  avatar?: string
}

export interface SessionPaymentInfo {
  id: string
  amount: string
  expertId: string
}

export interface PaymentBreakdown {
  sessionRate: number // Expert's rate in SOL
  platformFee: number // Platform fee in SOL
  networkFee: number // Estimated network fee in SOL
  totalAmount: number // Total to pay in SOL
  expertAmount: number // Amount expert receives in SOL
}

export interface PaymentResult {
  success: boolean
  transactionHash?: string
  error?: string
  breakdown?: PaymentBreakdown
}

export interface PreCallPaymentProps {
  visible: boolean
  expert: ExpertPaymentInfo
  session: SessionPaymentInfo
  onPaymentSuccess: (result: PaymentResult) => void
  onPaymentCancel: () => void
  onPaymentError: (error: string) => void
}

export interface PaymentStatus {
  status: 'unpaid' | 'paid' | 'failed' | 'processing'
  transactionHash?: string
  amount?: number
  timestamp?: Date
}

export interface SessionPaymentVerification {
  sessionId: string
  isPaid: boolean
  paymentStatus: PaymentStatus
  canJoinCall: boolean
}