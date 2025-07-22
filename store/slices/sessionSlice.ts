import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Session {
    id: string;
    expertId: string;
    shopperId: string;
    startTime: string;
    endTime?: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled';
    amount: number;
    paymentStatus: 'pending' | 'completed' | 'failed';
    transactionHash?: string;
}

interface SessionState {
    currentSession: Session | null;
    sessions: Session[];
    isLoading: boolean;
    error: string | null;
    isInCall: boolean;
}

const initialState: SessionState = {
    currentSession: null,
    sessions: [],
    isLoading: false,
    error: null,
    isInCall: false,
};

const sessionSlice = createSlice({
    name: 'sessions',
    initialState,
    reducers: {
        createSessionStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        createSessionSuccess: (state, action: PayloadAction<Session>) => {
            state.isLoading = false;
            state.currentSession = action.payload;
            state.sessions.push(action.payload);
        },
        createSessionFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
        },
        joinSession: (state, action: PayloadAction<Session>) => {
            state.currentSession = action.payload;
            state.isInCall = true;
        },
        leaveSession: (state) => {
            state.currentSession = null;
            state.isInCall = false;
        },
        updateSessionStatus: (state, action: PayloadAction<{ sessionId: string; status: Session['status'] }>) => {
            const session = state.sessions.find(s => s.id === action.payload.sessionId);
            if (session) {
                session.status = action.payload.status;
            }
            if (state.currentSession?.id === action.payload.sessionId) {
                state.currentSession.status = action.payload.status;
            }
        },
        updatePaymentStatus: (state, action: PayloadAction<{ sessionId: string; paymentStatus: Session['paymentStatus']; transactionHash?: string }>) => {
            const session = state.sessions.find(s => s.id === action.payload.sessionId);
            if (session) {
                session.paymentStatus = action.payload.paymentStatus;
                if (action.payload.transactionHash) {
                    session.transactionHash = action.payload.transactionHash;
                }
            }
        },
        fetchSessionsSuccess: (state, action: PayloadAction<Session[]>) => {
            state.sessions = action.payload;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
});

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
} = sessionSlice.actions;

export default sessionSlice.reducer;