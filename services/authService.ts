import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { User } from '../store/slices/authSlice';

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

export interface ConnectWalletResponse {
  token: string;
  user: User;
}

export const authService = {
  async connectWallet(walletAddress: string, name: string, userType: 'shopper' | 'expert'): Promise<ConnectWalletResponse> {
    try {
      const response = await api.post('/auth/connect', {
        walletAddress,
        name,
        userType,
      });

      // Store token locally
      await AsyncStorage.setItem('token', response.data.token);
      console.log('response.data', response.data);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to connect wallet');
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('token');
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get current user');
      }
      throw error;
    }
  },
};