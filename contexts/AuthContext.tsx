import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '../store';
import { connectWalletStart, connectWalletSuccess, connectWalletFailure, logout } from '../store/slices/authSlice';
import { authService } from '../services/authService';

interface User {
    walletAddress: string;
    name: string;
    userType: 'shopper' | 'expert';
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    error: string | null;
    connectWallet: (walletAddress: string, name: string, userType: 'shopper' | 'expert') => Promise<void>;
    logout: () => void;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const dispatch = useDispatch();
    const { isAuthenticated, user, isLoading, error } = useSelector((state: RootState) => state.auth);

    // Check for stored token on app start
    useEffect(() => {
        const checkStoredAuth = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                if (token) {
                    // Try to get current user with stored token
                    const currentUser = await authService.getCurrentUser();
                    dispatch(connectWalletSuccess({ user: currentUser, token }));
                }
            } catch (error) {
                // Token might be invalid, remove it
                await AsyncStorage.removeItem('token');
                console.log('Stored token validation failed:', error);
            }
        };

        checkStoredAuth();
    }, [dispatch]);

    const connectWallet = async (walletAddress: string, name: string, userType: 'shopper' | 'expert') => {
        try {
            dispatch(connectWalletStart());
            const response = await authService.connectWallet(walletAddress, name, userType);
            dispatch(connectWalletSuccess(response));
        } catch (error) {
            dispatch(connectWalletFailure(error instanceof Error ? error.message : 'Failed to connect wallet'));
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        dispatch(logout());
    };

    const clearError = () => {
        // This will be handled by the auth slice
    };

    const value: AuthContextType = {
        isAuthenticated,
        user,
        isLoading,
        error,
        connectWallet,
        logout: handleLogout,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};