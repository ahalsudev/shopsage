import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Session } from '../store/slices/sessionSlice';

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

export interface CreateSessionRequest {
  expertId: string;
  startTime: string; // ISO 8601 format
  amount: string; // BigDecimal as string
}

export interface UpdateSessionRequest {
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  endTime?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
}

export interface SessionWithDetails {
  id: string;
  expertId: string;
  expertName: string;
  expertSpecialization: string;
  shopperId: string;
  shopperName: string;
  startTime: string;
  endTime?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  amount: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionResponse {
  id: string;
  expertId: string;
  shopperId: string;
  status: string;
  amount: string;
  createdAt: string;
}

export interface SessionsListResponse {
  sessions: SessionWithDetails[];
}

export const sessionService = {
  async createSession(sessionData: CreateSessionRequest): Promise<SessionResponse> {
    try {
      const response = await api.post('/sessions', {
        expert_id: sessionData.expertId,
        start_time: sessionData.startTime,
        amount: sessionData.amount,
      });
      return {
        id: response.data.id,
        expertId: response.data.expert_id,
        shopperId: response.data.shopper_id,
        status: response.data.status,
        amount: response.data.amount,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to create session');
      }
      throw error;
    }
  },

  async getSession(sessionId: string): Promise<SessionResponse> {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      return {
        id: response.data.id,
        expertId: response.data.expert_id,
        shopperId: response.data.shopper_id,
        status: response.data.status,
        amount: response.data.amount,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get session');
      }
      throw error;
    }
  },

  async getUserSessions(): Promise<SessionWithDetails[]> {
    try {
      const response = await api.get('/sessions');
      return response.data.sessions || response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get sessions');
      }
      throw error;
    }
  },

  async updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<SessionResponse> {
    try {
      const payload: any = {};
      if (updates.status) payload.status = updates.status;
      if (updates.endTime) payload.end_time = updates.endTime;
      if (updates.paymentStatus) payload.payment_status = updates.paymentStatus;
      if (updates.transactionHash) payload.transaction_hash = updates.transactionHash;

      const response = await api.put(`/sessions/${sessionId}`, payload);
      return {
        id: response.data.id,
        expertId: response.data.expert_id,
        shopperId: response.data.shopper_id,
        status: response.data.status,
        amount: response.data.amount,
        createdAt: response.data.created_at,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to update session');
      }
      throw error;
    }
  },

  async cancelSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, { status: 'cancelled' });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to cancel session');
      }
      throw error;
    }
  },

  async completeSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, { 
        status: 'completed',
        endTime: new Date().toISOString()
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to complete session');
      }
      throw error;
    }
  },

  async startSession(sessionId: string): Promise<SessionResponse> {
    try {
      return await this.updateSession(sessionId, { status: 'active' });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to start session');
      }
      throw error;
    }
  },

  async getActiveSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions();
      return sessions.filter(session => session.status === 'active');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get active sessions');
      }
      throw error;
    }
  },

  async getUpcomingSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions();
      return sessions.filter(session => 
        session.status === 'pending' && 
        new Date(session.startTime) > new Date()
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get upcoming sessions');
      }
      throw error;
    }
  },

  async getPastSessions(): Promise<SessionWithDetails[]> {
    try {
      const sessions = await this.getUserSessions();
      return sessions.filter(session => 
        session.status === 'completed' || session.status === 'cancelled'
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error || 'Failed to get past sessions');
      }
      throw error;
    }
  },
};