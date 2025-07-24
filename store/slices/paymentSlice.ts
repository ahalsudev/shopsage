import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  processPayment,
  createSolanaPayment,
  verifyPayment,
  fetchPaymentHistory,
  calculateNetworkFee,
  fetchSolPrice,
} from '../thunks/paymentThunks';
import { PaymentWithDetails } from '../../services/paymentService';

export interface PaymentState {
  // Current payment processing
  isProcessing: boolean;
  currentTransactionHash: string | null;
  
  // Payment history
  payments: PaymentWithDetails[];
  isLoadingHistory: boolean;
  
  // Network info
  networkFee: number;
  solPriceUsd: number;
  
  // State management
  isLoading: boolean;
  error: string | null;
  
  // Payment verification
  verificationResults: Record<string, boolean>;
}

const initialState: PaymentState = {
  isProcessing: false,
  currentTransactionHash: null,
  payments: [],
  isLoadingHistory: false,
  networkFee: 0.000005, // Default Solana fee
  solPriceUsd: 0,
  isLoading: false,
  error: null,
  verificationResults: {},
};

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTransaction: (state) => {
      state.currentTransactionHash = null;
      state.isProcessing = false;
    },
    setNetworkFee: (state, action: PayloadAction<number>) => {
      state.networkFee = action.payload;
    },
    setSolPrice: (state, action: PayloadAction<number>) => {
      state.solPriceUsd = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Process payment
    builder
      .addCase(processPayment.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(processPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentTransactionHash = action.payload.payment.transactionHash || null;
        
        // Add to payment history if not already present
        const exists = state.payments.some(p => p.id === action.payload.payment.id);
        if (!exists) {
          const paymentWithDetails: PaymentWithDetails = {
            id: action.payload.payment.id,
            sessionId: action.payload.payment.sessionId,
            amount: action.payload.payment.amount,
            status: action.payload.payment.status,
            transactionHash: action.payload.payment.transactionHash,
            expertName: 'Unknown Expert', // This would come from the backend
            expertSpecialization: 'Unknown',
            sessionStartTime: action.payload.payment.createdAt,
            createdAt: action.payload.payment.createdAt,
            updatedAt: action.payload.payment.updatedAt,
          };
          state.payments.unshift(paymentWithDetails);
        }
      })
      .addCase(processPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });

    // Create Solana payment
    builder
      .addCase(createSolanaPayment.pending, (state) => {
        state.isProcessing = true;
        state.error = null;
      })
      .addCase(createSolanaPayment.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentTransactionHash = action.payload;
      })
      .addCase(createSolanaPayment.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      });

    // Verify payment
    builder
      .addCase(verifyPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.verificationResults[action.payload.transactionHash] = action.payload.isValid;
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch payment history
    builder
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.isLoadingHistory = true;
        state.error = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.isLoadingHistory = false;
        state.payments = action.payload;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.isLoadingHistory = false;
        state.error = action.payload as string;
      });

    // Calculate network fee
    builder
      .addCase(calculateNetworkFee.fulfilled, (state, action) => {
        state.networkFee = action.payload;
      })
      .addCase(calculateNetworkFee.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch SOL price
    builder
      .addCase(fetchSolPrice.fulfilled, (state, action) => {
        state.solPriceUsd = action.payload;
      })
      .addCase(fetchSolPrice.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  clearCurrentTransaction,
  setNetworkFee,
  setSolPrice,
} = paymentSlice.actions;

export default paymentSlice.reducer;