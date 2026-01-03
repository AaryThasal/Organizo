// ===========================================
// UI Slice
// ===========================================
// Manages UI-related state (modals, sidebar, etc.)

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebarOpen: true,
    activeModal: null, // 'createProject', 'editProject', 'createTask', 'editTask', etc.
    modalData: null, // Data to pass to the modal
    toast: null, // { type: 'success' | 'error' | 'info', message: string }
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action) => {
            state.sidebarOpen = action.payload;
        },
        openModal: (state, action) => {
            state.activeModal = action.payload.modal;
            state.modalData = action.payload.data || null;
        },
        closeModal: (state) => {
            state.activeModal = null;
            state.modalData = null;
        },
        showToast: (state, action) => {
            state.toast = action.payload;
        },
        hideToast: (state) => {
            state.toast = null;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    openModal,
    closeModal,
    showToast,
    hideToast,
} = uiSlice.actions;

export default uiSlice.reducer;
