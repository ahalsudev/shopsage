import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  createSession,
  fetchUserSessions,
  fetchSession,
  updateSession,
  cancelSession,
  startSession,
  completeSession,
  processSessionPayment,
  fetchUpcomingSessions,
  fetchPastSessions,
  fetchActiveSessions,
} from '../thunks/sessionThunks'

export interface Session {
  id: string
  expertId: string
  shopperId: string
  startTime: string
  endTime?: string
  status: 'pending' | 'active' | 'completed' | 'cancelled'
  amount: number
  paymentStatus: 'pending' | 'completed' | 'failed'
  transactionHash?: string
}

interface SessionState {
  currentSession: Session | null
  sessions: Session[]
  isLoading: boolean
  error: string | null
  isInCall: boolean
}

const initialState: SessionState = {
  currentSession: null,
  sessions: [],
  isLoading: false,
  error: null,
  isInCall: false,
}

const sessionSlice = createSlice({
  name: 'sessions',
  initialState,
  reducers: {
    createSessionStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    createSessionSuccess: (state, action: PayloadAction<Session>) => {
      state.isLoading = false
      state.currentSession = action.payload
      state.sessions.push(action.payload)
    },
    createSessionFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    joinSession: (state, action: PayloadAction<Session>) => {
      state.currentSession = action.payload
      state.isInCall = true
    },
    leaveSession: (state) => {
      state.currentSession = null
      state.isInCall = false
    },
    updateSessionStatus: (state, action: PayloadAction<{ sessionId: string; status: Session['status'] }>) => {
      const session = state.sessions.find((s) => s.id === action.payload.sessionId)
      if (session) {
        session.status = action.payload.status
      }
      if (state.currentSession?.id === action.payload.sessionId) {
        state.currentSession.status = action.payload.status
      }
    },
    updatePaymentStatus: (
      state,
      action: PayloadAction<{ sessionId: string; paymentStatus: Session['paymentStatus']; transactionHash?: string }>,
    ) => {
      const session = state.sessions.find((s) => s.id === action.payload.sessionId)
      if (session) {
        session.paymentStatus = action.payload.paymentStatus
        if (action.payload.transactionHash) {
          session.transactionHash = action.payload.transactionHash
        }
      }
    },
    fetchSessionsSuccess: (state, action: PayloadAction<Session[]>) => {
      state.sessions = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Create session
    builder
      .addCase(createSession.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.isLoading = false
        // Convert backend response to frontend format
        const session: Session = {
          id: action.payload.id,
          expertId: action.payload.expertId,
          shopperId: action.payload.shopperId,
          startTime: action.payload.createdAt,
          endTime: undefined,
          status: action.payload.status as Session['status'],
          amount: parseFloat(action.payload.amount),
          paymentStatus: 'pending',
          transactionHash: undefined,
        }
        state.currentSession = session
        state.sessions.push(session)
      })
      .addCase(createSession.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Fetch user sessions
    builder
      .addCase(fetchUserSessions.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserSessions.fulfilled, (state, action) => {
        state.isLoading = false
        // Convert backend sessions to frontend format
        state.sessions = action.payload.map((backendSession) => ({
          id: backendSession.id,
          expertId: backendSession.expertId,
          shopperId: backendSession.shopperId,
          startTime: backendSession.startTime,
          endTime: backendSession.endTime,
          status: backendSession.status as Session['status'],
          amount: parseFloat(backendSession.amount),
          paymentStatus: backendSession.paymentStatus as Session['paymentStatus'],
          transactionHash: backendSession.transactionHash,
        }))
      })
      .addCase(fetchUserSessions.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Update session
    builder
      .addCase(updateSession.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateSession.fulfilled, (state, action) => {
        state.isLoading = false
        const updatedSession: Session = {
          id: action.payload.id,
          expertId: action.payload.expertId,
          shopperId: action.payload.shopperId,
          startTime: action.payload.createdAt,
          endTime: undefined,
          status: action.payload.status as Session['status'],
          amount: parseFloat(action.payload.amount),
          paymentStatus: 'pending',
          transactionHash: undefined,
        }

        const index = state.sessions.findIndex((s) => s.id === updatedSession.id)
        if (index !== -1) {
          state.sessions[index] = updatedSession
        }

        if (state.currentSession?.id === updatedSession.id) {
          state.currentSession = updatedSession
        }
      })
      .addCase(updateSession.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Process payment
    builder
      .addCase(processSessionPayment.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(processSessionPayment.fulfilled, (state, action) => {
        state.isLoading = false
        const sessionId = action.payload.session.id

        const session = state.sessions.find((s) => s.id === sessionId)
        if (session) {
          session.paymentStatus = action.payload.session.paymentStatus as Session['paymentStatus']
          session.transactionHash = action.payload.session.transactionHash
        }

        if (state.currentSession?.id === sessionId) {
          state.currentSession.paymentStatus = action.payload.session.paymentStatus as Session['paymentStatus']
          state.currentSession.transactionHash = action.payload.session.transactionHash
        }
      })
      .addCase(processSessionPayment.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })

    // Start session
    builder.addCase(startSession.fulfilled, (state, action) => {
      const sessionId = action.payload.id
      const session = state.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.status = 'active'
      }
      if (state.currentSession?.id === sessionId) {
        state.currentSession.status = 'active'
      }
    })

    // Complete session
    builder.addCase(completeSession.fulfilled, (state, action) => {
      const sessionId = action.payload.id
      const session = state.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.status = 'completed'
      }
      if (state.currentSession?.id === sessionId) {
        state.currentSession.status = 'completed'
        state.isInCall = false
      }
    })

    // Cancel session
    builder.addCase(cancelSession.fulfilled, (state, action) => {
      const sessionId = action.payload.id
      const session = state.sessions.find((s) => s.id === sessionId)
      if (session) {
        session.status = 'cancelled'
      }
      if (state.currentSession?.id === sessionId) {
        state.currentSession.status = 'cancelled'
        state.isInCall = false
      }
    })
  },
})

export const {
  createSessionStart,
  createSessionSuccess,
  createSessionFailure,
  joinSession,
  leaveSession,
  updateSessionStatus,
  updatePaymentStatus,
  fetchSessionsSuccess,
  clearError,
} = sessionSlice.actions

export default sessionSlice.reducer
