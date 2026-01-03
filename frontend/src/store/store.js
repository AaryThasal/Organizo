// ===========================================
// Redux Store Configuration
// ===========================================

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import projectReducer from './projectSlice';
import taskReducer from './taskSlice';
import notificationReducer from './notificationSlice';
import uiReducer from './uiSlice';

// Create and configure the Redux store
const store = configureStore({
    reducer: {
        auth: authReducer,
        projects: projectReducer,
        tasks: taskReducer,
        notifications: notificationReducer,
        ui: uiReducer,
    },
    // Enable Redux DevTools in development
    devTools: import.meta.env.DEV,
});

export default store;
