import { createAsyncThunk } from '@reduxjs/toolkit'
import {
  sessionService,
  CreateSessionRequest,
  UpdateSessionRequest,
  SessionWithDetails,
} from '../../services/sessionService'
import { paymentService, ProcessPaymentRequest } from '../../services/paymentService'

// Create a new session
export const createSession = createAsyncThunk(
  'sessions/create',
  async (sessionData: CreateSessionRequest, { rejectWithValue }) => {
    try {
      const session = await sessionService.createSession(sessionData)
      return session
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create session')
    }
  },
)

// Fetch user's sessions
export const fetchUserSessions = createAsyncThunk('sessions/fetchUserSessions', async (_, { rejectWithValue }) => {
  try {
    const sessions = await sessionService.getUserSessions()
    return sessions
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch sessions')
  }
})

// Fetch a specific session
export const fetchSession = createAsyncThunk(
  'sessions/fetchSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const session = await sessionService.getSession(sessionId)
      return session
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch session')
    }
  },
)

// Update session
export const updateSession = createAsyncThunk(
  'sessions/update',
  async ({ sessionId, updates }: { sessionId: string; updates: UpdateSessionRequest }, { rejectWithValue }) => {
    try {
      const session = await sessionService.updateSession(sessionId, updates)
      return session
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update session')
    }
  },
)

// Cancel session
export const cancelSession = createAsyncThunk('sessions/cancel', async (sessionId: string, { rejectWithValue }) => {
  try {
    const session = await sessionService.cancelSession(sessionId)
    return session
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to cancel session')
  }
})

// Start session
export const startSession = createAsyncThunk('sessions/start', async (sessionId: string, { rejectWithValue }) => {
  try {
    const session = await sessionService.startSession(sessionId)
    return session
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to start session')
  }
})

// Complete session
export const completeSession = createAsyncThunk('sessions/complete', async (sessionId: string, { rejectWithValue }) => {
  try {
    const session = await sessionService.completeSession(sessionId)
    return session
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to complete session')
  }
})

// Process payment for session
export const processSessionPayment = createAsyncThunk(
  'sessions/processPayment',
  async (paymentData: ProcessPaymentRequest, { rejectWithValue }) => {
    try {
      const result = await paymentService.processPayment(paymentData)
      return result
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to process payment')
    }
  },
)

// Fetch upcoming sessions
export const fetchUpcomingSessions = createAsyncThunk('sessions/fetchUpcoming', async (_, { rejectWithValue }) => {
  try {
    const sessions = await sessionService.getUpcomingSessions()
    return sessions
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch upcoming sessions')
  }
})

// Fetch past sessions
export const fetchPastSessions = createAsyncThunk('sessions/fetchPast', async (_, { rejectWithValue }) => {
  try {
    const sessions = await sessionService.getPastSessions()
    return sessions
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch past sessions')
  }
})

// Fetch active sessions
export const fetchActiveSessions = createAsyncThunk('sessions/fetchActive', async (_, { rejectWithValue }) => {
  try {
    const sessions = await sessionService.getActiveSessions()
    return sessions
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch active sessions')
  }
})
