import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

// Initial state for tasks
const initialState = {
    tasks: [],
    myTasks: [],
    currentTask: null,
    isLoading: false,
    error: null,
};

// Async thunks for task API calls
export const fetchProjectTasks = createAsyncThunk(
    'tasks/fetchProjectTasks',
    async ({ projectId, filters = {} }, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await api.get(`/projects/${projectId}/tasks${params ? `?${params}` : ''}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch tasks');
        }
    }
);

export const fetchMyTasks = createAsyncThunk(
    'tasks/fetchMyTasks',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await api.get(`/tasks/my-tasks${params ? `?${params}` : ''}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch tasks');
        }
    }
);

export const fetchTaskById = createAsyncThunk(
    'tasks/fetchTaskById',
    async (taskId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/tasks/${taskId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch task');
        }
    }
);

export const createTask = createAsyncThunk(
    'tasks/createTask',
    async ({ projectId, taskData }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/projects/${projectId}/tasks`, taskData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create task');
        }
    }
);

export const updateTask = createAsyncThunk(
    'tasks/updateTask',
    async ({ taskId, taskData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/tasks/${taskId}`, taskData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update task');
        }
    }
);

export const updateTaskStatus = createAsyncThunk(
    'tasks/updateTaskStatus',
    async ({ taskId, status }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/tasks/${taskId}/status`, { status });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update status');
        }
    }
);

export const deleteTask = createAsyncThunk(
    'tasks/deleteTask',
    async (taskId, { rejectWithValue }) => {
        try {
            await api.delete(`/tasks/${taskId}`);
            return taskId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
        }
    }
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        clearTasks: (state) => {
            state.tasks = [];
        },
        clearCurrentTask: (state) => {
            state.currentTask = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProjectTasks.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjectTasks.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tasks = action.payload.data;
            })
            .addCase(fetchProjectTasks.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchMyTasks.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyTasks.fulfilled, (state, action) => {
                state.isLoading = false;
                state.myTasks = action.payload.data;
            })
            .addCase(fetchMyTasks.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchTaskById.fulfilled, (state, action) => {
                state.currentTask = action.payload.data;
            })
            .addCase(createTask.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createTask.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tasks.unshift(action.payload.data);
            })
            .addCase(createTask.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(updateTask.fulfilled, (state, action) => {
                const index = state.tasks.findIndex(t => t.id === action.payload.data.id);
                if (index !== -1) {
                    state.tasks[index] = action.payload.data;
                }
                const myIndex = state.myTasks.findIndex(t => t.id === action.payload.data.id);
                if (myIndex !== -1) {
                    state.myTasks[myIndex] = action.payload.data;
                }
            })
            .addCase(updateTaskStatus.fulfilled, (state, action) => {
                const index = state.tasks.findIndex(t => t.id === action.payload.data.id);
                if (index !== -1) {
                    state.tasks[index] = action.payload.data;
                }
                const myIndex = state.myTasks.findIndex(t => t.id === action.payload.data.id);
                if (myIndex !== -1) {
                    state.myTasks[myIndex] = action.payload.data;
                }
            })
            .addCase(deleteTask.fulfilled, (state, action) => {
                state.tasks = state.tasks.filter(t => t.id !== action.payload);
                state.myTasks = state.myTasks.filter(t => t.id !== action.payload);
            });
    },
});

export const { clearTasks, clearCurrentTask, clearError } = taskSlice.actions;
export default taskSlice.reducer;
