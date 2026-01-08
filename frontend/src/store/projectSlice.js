import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

const initialState = {
    projects: [],
    currentProject: null,
    projectMembers: [],
    isLoading: false,
    error: null,
};

export const fetchProjects = createAsyncThunk(
    'projects/fetchProjects',
    async (filters = {}, { rejectWithValue }) => {
        try {
            const params = new URLSearchParams(filters).toString();
            const response = await api.get(`/projects${params ? `?${params}` : ''}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects');
        }
    }
);

export const fetchProjectById = createAsyncThunk(
    'projects/fetchProjectById',
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/projects/${projectId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch project');
        }
    }
);

export const createProject = createAsyncThunk(
    'projects/createProject',
    async (projectData, { rejectWithValue }) => {
        try {
            const response = await api.post('/projects', projectData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create project');
        }
    }
);

export const updateProject = createAsyncThunk(
    'projects/updateProject',
    async ({ projectId, projectData }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/projects/${projectId}`, projectData);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update project');
        }
    }
);

export const deleteProject = createAsyncThunk(
    'projects/deleteProject',
    async (projectId, { rejectWithValue }) => {
        try {
            await api.delete(`/projects/${projectId}`);
            return projectId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete project');
        }
    }
);

export const fetchProjectMembers = createAsyncThunk(
    'projects/fetchProjectMembers',
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/projects/${projectId}/members`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch members');
        }
    }
);

export const addProjectMember = createAsyncThunk(
    'projects/addProjectMember',
    async ({ projectId, userId, userIds }, { rejectWithValue }) => {
        try {
            const payload = userIds ? { userIds } : { userId };
            const response = await api.post(`/projects/${projectId}/members`, payload);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add member(s)');
        }
    }
);

export const removeProjectMember = createAsyncThunk(
    'projects/removeProjectMember',
    async ({ projectId, userId }, { rejectWithValue }) => {
        try {
            await api.delete(`/projects/${projectId}/members/${userId}`);
            return { projectId, userId };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to remove member');
        }
    }
);

const projectSlice = createSlice({
    name: 'projects',
    initialState,
    reducers: {
        clearCurrentProject: (state) => {
            state.currentProject = null;
            state.projectMembers = [];
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchProjects.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projects = action.payload.data;
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchProjectById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchProjectById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.currentProject = action.payload.data;
                state.projectMembers = action.payload.data.members || [];
            })
            .addCase(fetchProjectById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(createProject.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projects.unshift(action.payload.data);
            })
            .addCase(createProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(updateProject.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateProject.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.projects.findIndex(p => p.id === action.payload.data.id);
                if (index !== -1) {
                    state.projects[index] = action.payload.data;
                }
                if (state.currentProject?.id === action.payload.data.id) {
                    state.currentProject = { ...state.currentProject, ...action.payload.data };
                }
            })
            .addCase(updateProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(deleteProject.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteProject.fulfilled, (state, action) => {
                state.isLoading = false;
                state.projects = state.projects.filter(p => p.id !== action.payload);
                if (state.currentProject?.id === action.payload) {
                    state.currentProject = null;
                }
            })
            .addCase(deleteProject.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchProjectMembers.fulfilled, (state, action) => {
                state.projectMembers = action.payload.data;
            })
            .addCase(addProjectMember.fulfilled, (state) => {
                // Members will be refetched
            })
            .addCase(removeProjectMember.fulfilled, (state, action) => {
                state.projectMembers = state.projectMembers.filter(
                    m => m.id !== action.payload.userId
                );
            });
    },
});

export const { clearCurrentProject, clearError } = projectSlice.actions;
export default projectSlice.reducer;
