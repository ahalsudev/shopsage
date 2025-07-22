import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
    id: string;
    walletAddress: string;
    name: string;
    userType: 'shopper' | 'expert';
    email?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        connectWalletStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        connectWalletSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.isLoading = false;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.isAuthenticated = true;
        },
        connectWalletFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
});

export const {
    connectWalletStart,
    connectWalletSuccess,
    connectWalletFailure,
    logout,
    clearError,
} = authSlice.actions;

export default authSlice.reducer;