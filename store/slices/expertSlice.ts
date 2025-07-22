import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
    fetchCurrentUserProfile,
    createCurrentUserProfile,
    updateCurrentUserProfile,
    toggleCurrentUserOnlineStatus,
    fetchExperts,
    fetchExpertById,
} from '../thunks/expertThunks';

export interface Expert {
    id: string;
    userId: string;
    specialization: string;
    bio: string | null;
    hourlyRate: number;
    rating: number;
    totalConsultations: number;
    isVerified: boolean;
    isOnline: boolean;
    profileImageUrl?: string | null;
    name?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface ExpertState {
    // List of experts for shoppers to browse
    experts: Expert[];
    selectedExpert: Expert | null;
    isLoading: boolean;
    error: string | null;
    
    // Current user's expert profile (if they are an expert)
    currentUserProfile: Expert | null;
    profileLoading: boolean;
    profileError: string | null;
}

const initialState: ExpertState = {
    experts: [],
    selectedExpert: null,
    isLoading: false,
    error: null,
    currentUserProfile: null,
    profileLoading: false,
    profileError: null,
};

const expertSlice = createSlice({
    name: 'experts',
    initialState,
    reducers: {
        fetchExpertsStart: (state) => {
            state.isLoading = true;
            state.error = null;
        },
        fetchExpertsSuccess: (state, action: PayloadAction<Expert[]>) => {
            state.isLoading = false;
            state.experts = action.payload;
        },
        fetchExpertsFailure: (state, action: PayloadAction<string>) => {
            state.isLoading = false;
            state.error = action.payload;
        },
        selectExpert: (state, action: PayloadAction<Expert>) => {
            state.selectedExpert = action.payload;
        },
        clearSelectedExpert: (state) => {
            state.selectedExpert = null;
        },
        updateExpertStatus: (state, action: PayloadAction<{ expertId: string; isOnline: boolean }>) => {
            const expert = state.experts.find(e => e.id === action.payload.expertId);
            if (expert) {
                expert.isOnline = action.payload.isOnline;
            }
        },
        
        // Current user's expert profile actions
        fetchCurrentUserProfileStart: (state) => {
            state.profileLoading = true;
            state.profileError = null;
        },
        fetchCurrentUserProfileSuccess: (state, action: PayloadAction<Expert>) => {
            state.profileLoading = false;
            state.currentUserProfile = action.payload;
        },
        fetchCurrentUserProfileFailure: (state, action: PayloadAction<string>) => {
            state.profileLoading = false;
            state.profileError = action.payload;
        },
        
        createCurrentUserProfileStart: (state) => {
            state.profileLoading = true;
            state.profileError = null;
        },
        createCurrentUserProfileSuccess: (state, action: PayloadAction<Expert>) => {
            state.profileLoading = false;
            state.currentUserProfile = action.payload;
        },
        createCurrentUserProfileFailure: (state, action: PayloadAction<string>) => {
            state.profileLoading = false;
            state.profileError = action.payload;
        },
        
        updateCurrentUserProfileStart: (state) => {
            state.profileLoading = true;
            state.profileError = null;
        },
        updateCurrentUserProfileSuccess: (state, action: PayloadAction<Expert>) => {
            state.profileLoading = false;
            state.currentUserProfile = action.payload;
        },
        updateCurrentUserProfileFailure: (state, action: PayloadAction<string>) => {
            state.profileLoading = false;
            state.profileError = action.payload;
        },
        
        updateCurrentUserOnlineStatus: (state, action: PayloadAction<boolean>) => {
            if (state.currentUserProfile) {
                state.currentUserProfile.isOnline = action.payload;
            }
        },
        
        clearCurrentUserProfile: (state) => {
            state.currentUserProfile = null;
            state.profileError = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch current user profile
        builder
            .addCase(fetchCurrentUserProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(fetchCurrentUserProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.currentUserProfile = action.payload;
            })
            .addCase(fetchCurrentUserProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = action.payload as string;
            });

        // Create current user profile
        builder
            .addCase(createCurrentUserProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(createCurrentUserProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.currentUserProfile = action.payload;
            })
            .addCase(createCurrentUserProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = action.payload as string;
            });

        // Update current user profile
        builder
            .addCase(updateCurrentUserProfile.pending, (state) => {
                state.profileLoading = true;
                state.profileError = null;
            })
            .addCase(updateCurrentUserProfile.fulfilled, (state, action) => {
                state.profileLoading = false;
                state.currentUserProfile = action.payload;
            })
            .addCase(updateCurrentUserProfile.rejected, (state, action) => {
                state.profileLoading = false;
                state.profileError = action.payload as string;
            });

        // Toggle online status
        builder
            .addCase(toggleCurrentUserOnlineStatus.pending, (state) => {
                // Don't show loading for status toggle
            })
            .addCase(toggleCurrentUserOnlineStatus.fulfilled, (state, action) => {
                state.currentUserProfile = action.payload;
            })
            .addCase(toggleCurrentUserOnlineStatus.rejected, (state, action) => {
                state.profileError = action.payload as string;
            });

        // Fetch experts
        builder
            .addCase(fetchExperts.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchExperts.fulfilled, (state, action) => {
                state.isLoading = false;
                state.experts = action.payload;
            })
            .addCase(fetchExperts.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch expert by ID
        builder
            .addCase(fetchExpertById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchExpertById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedExpert = action.payload;
            })
            .addCase(fetchExpertById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    },
});

export const {
    fetchExpertsStart,
    fetchExpertsSuccess,
    fetchExpertsFailure,
    selectExpert,
    clearSelectedExpert,
    updateExpertStatus,
    fetchCurrentUserProfileStart,
    fetchCurrentUserProfileSuccess,
    fetchCurrentUserProfileFailure,
    createCurrentUserProfileStart,
    createCurrentUserProfileSuccess,
    createCurrentUserProfileFailure,
    updateCurrentUserProfileStart,
    updateCurrentUserProfileSuccess,
    updateCurrentUserProfileFailure,
    updateCurrentUserOnlineStatus,
    clearCurrentUserProfile,
} = expertSlice.actions;

export default expertSlice.reducer;