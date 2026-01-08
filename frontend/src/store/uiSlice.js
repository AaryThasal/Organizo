import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    sidebarOpen: true,
    activeModal: null,
    modalData: null,
    toast: null,
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
