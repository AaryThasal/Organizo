// Auth Slice - manages user authentication state

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Get user data from localStorage if exists
const storedUser = localStorage.getItem('user');
const storedToken = localStorage.getItem('token');

const initialState = {
    user: storedUser ? JSON.parse(storedUser) : null,
    organization: null,
    token: storedToken || null,
    isAuthenticated: !!storedToken,
    isLoading: false,
    error: null,
};

// Async thunk for admin registration
export const registerAdmin = createAsyncThunk(
    'auth/registerAdmin',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register/admin', userData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

// Async thunk for user registration (manager/employee)
export const registerUser = createAsyncThunk(
    'auth/registerUser',
    async (userData, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/register/user', userData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

// Async thunk for login
export const login = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

// Async thunk for joining organization
export const joinOrganization = createAsyncThunk(
    'auth/joinOrganization',
    async (joinCode, { rejectWithValue }) => {
        try {
            const response = await api.post('/auth/join-organization', { joinCode });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to join organization');
        }
    }
);

// Async thunk for getting current user
export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to get user data');
        }
    }
);

// Silent check for approval status (doesn't trigger loading state)
export const checkApprovalStatus = createAsyncThunk(
    'auth/checkApprovalStatus',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to check status');
        }
    }
);

// Async thunk for updating profile
export const updateProfile = createAsyncThunk(
    'auth/updateProfile',
    async (profileData, { rejectWithValue }) => {
        try {
            const response = await api.put('/users/profile', profileData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Logout action
        logout: (state) => {
            state.user = null;
            state.organization = null;
            state.token = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem('user');
            localStorage.removeItem('token');
        },
        // Clear error
        clearError: (state) => {
            state.error = null;
        },
        // Set organization (after joining)
        setOrganization: (state, action) => {
            state.organization = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Register Admin
            .addCase(registerAdmin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerAdmin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.data.user;
                state.organization = action.payload.data.organization;
                state.token = action.payload.data.token;
                state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(action.payload.data.user));
                localStorage.setItem('token', action.payload.data.token);
            })
            .addCase(registerAdmin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Register User
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.data.user;
                state.token = action.payload.data.token;
                state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(action.payload.data.user));
                localStorage.setItem('token', action.payload.data.token);
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.data.user;
                state.organization = action.payload.data.organization;
                state.token = action.payload.data.token;
                state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(action.payload.data.user));
                localStorage.setItem('token', action.payload.data.token);
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Join Organization
            .addCase(joinOrganization.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(joinOrganization.fulfilled, (state, action) => {
                state.isLoading = false;
                if (state.user) {
                    state.user.status = 'pending';
                    localStorage.setItem('user', JSON.stringify(state.user));
                }
            })
            .addCase(joinOrganization.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Get Current User
            .addCase(getCurrentUser.pending, (state) => {
                // Set loading true to prevent routing before auth check completes
                state.isLoading = true;
                state.error = null;
            })
            .addCase(getCurrentUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.data.user;
                state.organization = action.payload.data.organization;
                state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(action.payload.data.user));
            })
            .addCase(getCurrentUser.rejected, (state, action) => {
                state.isLoading = false;
                // If getting user fails, logout
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            })
            // Update Profile
            .addCase(updateProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload.data;
                localStorage.setItem('user', JSON.stringify(action.payload.data));
            })
            .addCase(updateProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            // Check Approval Status (silent - no loading state)
            .addCase(checkApprovalStatus.fulfilled, (state, action) => {
                state.user = action.payload.data.user;
                state.organization = action.payload.data.organization;
                state.isAuthenticated = true;
                localStorage.setItem('user', JSON.stringify(action.payload.data.user));
            });
    },
});

export const { logout, clearError, setOrganization } = authSlice.actions;
export default authSlice.reducer;
