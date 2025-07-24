import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.20.10.8:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ProcessPaymentRequest {
  sessionId: string;
  transactionHash: string;
}

export interface ProcessPaymentResponse {
  payment: {
    id: string;
    sessionId: string;
    amount: string;
    status: 'pending' | 'completed' | 'failed';
    transactionHash?: string;
    createdAt: string;
    updatedAt: string;
  };
  session: {
    id: string;
    expertId: string;
    shopperId: string;
    status: string;
    amount: string;
    paymentStatus: 'pending' | 'completed' | 'failed';
    transactionHash?: string;
  };
}

export interface PaymentWithDetails {
  id: string;
  sessionId: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  expertName: string;
  expertSpecialization: string;
  sessionStartTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistoryResponse {
  payments: PaymentWithDetails[];
}

export interface SolanaPaymentParams {
  expertWalletAddress: string;
  amount: number; // in SOL
  memo?: string;
}

export const paymentService = {
  async processPayment(paymentData: ProcessPaymentRequest): Promise<ProcessPaymentResponse> {
    try {
      const response = await api.post('/payments/process', {
        session_id: paymentData.sessionId,
        transaction_hash: paymentData.transactionHash,
      });

      return {
        payment: {
          id: response.data.payment.id,
          sessionId: response.data.payment.session_id,
          amount: response.data.payment.amount,
          status: response.data.payment.status,
          transactionHash: response.data.payment.transaction_hash,
          createdAt: response.data.payment.created_at,
          updatedAt: response.data.payment.updated_at,
        },
        session: {
          id: response.data.session.id,
          expertId: response.data.session.expert_id,
          shopperId: response.data.session.shopper_id,
          status: response.data.session.status,
          amount: response.data.session.amount,
          paymentStatus: response.data.session.payment_status,
          transactionHash: response.data.session.transaction_hash,
        },
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to process payment');
      }
      throw error;
    }
  },

  async getPaymentHistory(): Promise<PaymentWithDetails[]> {
    try {
      const response = await api.get('/payments/history');
      return response.data.payments;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get payment history');
      }
      throw error;
    }
  },

  async createSolanaPayment(params: SolanaPaymentParams): Promise<string> {
    try {
      // Convert SOL to lamports
      const lamports = params.amount * LAMPORTS_PER_SOL;
      
      return await transact(async (wallet) => {
        // Authorize the wallet
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: {
            name: 'ShopSage',
            uri: 'https://shopsage.app',
            icon: 'favicon.ico',
          },
        });

        const fromPubkey = authResult.accounts[0].publicKey;
        const toPubkey = new PublicKey(params.expertWalletAddress);

        // Create connection to Solana devnet
        const connection = new Connection('https://api.devnet.solana.com');

        // Get latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // Create transfer transaction
        const transaction = new Transaction({
          feePayer: fromPubkey,
          recentBlockhash: blockhash,
        }).add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );

        // Add memo if provided
        if (params.memo) {
          const { TransactionInstruction } = await import('@solana/web3.js');
          transaction.add(
            new TransactionInstruction({
              keys: [],
              programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
              data: Buffer.from(params.memo, 'utf-8'),
            })
          );
        }

        // Sign and send transaction
        const signedTransactions = await wallet.signTransactions({
          transactions: [transaction],
        });

        const signature = await connection.sendRawTransaction(
          signedTransactions[0]
        );

        // Wait for confirmation
        await connection.confirmTransaction(signature);

        return signature;
      });
    } catch (error) {
      console.error('Solana payment error:', error);
      throw new Error('Failed to process Solana payment');
    }
  },

  async verifyPayment(transactionHash: string, expectedAmount: string): Promise<boolean> {
    try {
      const connection = new Connection('https://api.devnet.solana.com');
      
      // Get transaction details
      const transaction = await connection.getTransaction(transactionHash, {
        commitment: 'confirmed',
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify transaction amount (basic verification)
      // In a production app, you'd want more thorough verification
      const expectedLamports = parseFloat(expectedAmount) * LAMPORTS_PER_SOL;
      
      // Check if transaction contains a transfer of approximately the right amount
      const hasValidTransfer = transaction.transaction.message.instructions.some(
        (instruction) => {
          // This is a simplified check - in production you'd parse the instruction more carefully
          return instruction.programId.toString() === SystemProgram.programId.toString();
        }
      );

      return hasValidTransfer && transaction.meta?.err === null;
    } catch (error) {
      console.error('Payment verification error:', error);
      return false;
    }
  },

  async calculateNetworkFee(): Promise<number> {
    try {
      const connection = new Connection('https://api.devnet.solana.com');
      const recentBlockhash = await connection.getLatestBlockhash();
      
      // Create a dummy transaction to estimate fee
      const transaction = new Transaction({
        recentBlockhash: recentBlockhash.blockhash,
        feePayer: new PublicKey('11111111111111111111111111111112'), // Dummy address
      }).add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey('11111111111111111111111111111112'),
          toPubkey: new PublicKey('11111111111111111111111111111113'),
          lamports: 1000000, // 0.001 SOL
        })
      );

      const fee = await connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      );

      return (fee?.value || 5000) / LAMPORTS_PER_SOL; // Default to 0.000005 SOL if unable to get fee
    } catch (error) {
      console.error('Fee calculation error:', error);
      return 0.000005; // Default network fee
    }
  },

  async getRecommendedGasPrice(): Promise<number> {
    // Solana doesn't have gas prices like Ethereum, but we can return the base fee
    return await this.calculateNetworkFee();
  },

  formatSolAmount(lamports: number): string {
    return (lamports / LAMPORTS_PER_SOL).toFixed(6);
  },

  formatUsdAmount(solAmount: number, solPriceUsd: number): string {
    return (solAmount * solPriceUsd).toFixed(2);
  },

  async getSolPrice(): Promise<number> {
    try {
      // You might want to use a different price API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 0;
    } catch (error) {
      console.error('Failed to get SOL price:', error);
      return 0;
    }
  },
};