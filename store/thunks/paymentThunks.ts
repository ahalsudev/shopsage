import { createAsyncThunk } from '@reduxjs/toolkit';
import { 
  paymentService, 
  ProcessPaymentRequest,
  SolanaPaymentParams 
} from '../../services/paymentService';

// Process a payment
export const processPayment = createAsyncThunk(
  'payments/process',
  async (paymentData: ProcessPaymentRequest, { rejectWithValue }) => {
    try {
      const result = await paymentService.processPayment(paymentData);
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to process payment');
    }
  }
);

// Create Solana payment transaction
export const createSolanaPayment = createAsyncThunk(
  'payments/createSolana',
  async (params: SolanaPaymentParams, { rejectWithValue }) => {
    try {
      const transactionHash = await paymentService.createSolanaPayment(params);
      return transactionHash;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create Solana payment');
    }
  }
);

// Verify payment transaction
export const verifyPayment = createAsyncThunk(
  'payments/verify',
  async ({ transactionHash, expectedAmount }: { transactionHash: string; expectedAmount: string }, { rejectWithValue }) => {
    try {
      const isValid = await paymentService.verifyPayment(transactionHash, expectedAmount);
      return { transactionHash, isValid };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  }
);

// Fetch payment history
export const fetchPaymentHistory = createAsyncThunk(
  'payments/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const payments = await paymentService.getPaymentHistory();
      return payments;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch payment history');
    }
  }
);

// Calculate network fee
export const calculateNetworkFee = createAsyncThunk(
  'payments/calculateFee',
  async (_, { rejectWithValue }) => {
    try {
      const fee = await paymentService.calculateNetworkFee();
      return fee;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to calculate network fee');
    }
  }
);

// Get SOL price
export const fetchSolPrice = createAsyncThunk(
  'payments/fetchSolPrice',
  async (_, { rejectWithValue }) => {
    try {
      const price = await paymentService.getSolPrice();
      return price;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch SOL price');
    }
  }
);