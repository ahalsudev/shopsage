import { createAsyncThunk } from '@reduxjs/toolkit'
import { expertService, CreateExpertProfileRequest, UpdateExpertProfileRequest } from '../../services/expertService'

// Thunk for fetching the current user's expert profile
export const fetchCurrentUserProfile = createAsyncThunk(
  'experts/fetchCurrentUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const profile = await expertService.getProfile()
      return profile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch profile')
    }
  },
)

// Thunk for creating the current user's expert profile
export const createCurrentUserProfile = createAsyncThunk(
  'experts/createCurrentUserProfile',
  async (profileData: CreateExpertProfileRequest, { rejectWithValue }) => {
    try {
      const profile = await expertService.createProfile(profileData)
      return profile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to create profile')
    }
  },
)

// Thunk for updating the current user's expert profile
export const updateCurrentUserProfile = createAsyncThunk(
  'experts/updateCurrentUserProfile',
  async (profileData: UpdateExpertProfileRequest, { rejectWithValue }) => {
    try {
      const profile = await expertService.updateProfile(profileData)
      return profile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update profile')
    }
  },
)

// Thunk for toggling online status
export const toggleCurrentUserOnlineStatus = createAsyncThunk(
  'experts/toggleCurrentUserOnlineStatus',
  async (isOnline: boolean, { rejectWithValue }) => {
    try {
      const profile = await expertService.toggleOnlineStatus(isOnline)
      return profile
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update status')
    }
  },
)

// Thunk for fetching all experts (for shoppers)
export const fetchExperts = createAsyncThunk('experts/fetchExperts', async (_, { rejectWithValue }) => {
  try {
    const experts = await expertService.getExperts()
    return experts
  } catch (error) {
    return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch experts')
  }
})

// Thunk for fetching a specific expert by ID
export const fetchExpertById = createAsyncThunk(
  'experts/fetchExpertById',
  async (expertId: string, { rejectWithValue }) => {
    try {
      const expert = await expertService.getExpertById(expertId)
      return expert
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch expert')
    }
  },
)
