// ===========================================
// Main Application Component
// ===========================================

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store/store';
import { getCurrentUser } from './store/authSlice';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layouts/DashboardLayout';
import Toast from './components/ui/Toast';
import { LoadingScreen } from './components/ui/Spinner';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JoinOrganizationPage from './pages/auth/JoinOrganizationPage';

// Dashboard Pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import EmployeesPage from './pages/users/EmployeesPage';
import PendingRequestsPage from './pages/admin/PendingRequestsPage';
import MyTasksPage from './pages/tasks/MyTasksPage';
import SettingsPage from './pages/settings/SettingsPage';

// App wrapper that handles initial auth check
function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);

  // Check authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, user]);

  // Show loading screen while checking initial auth
  if (isLoading && localStorage.getItem('token')) {
    return <LoadingScreen message="Loading your account..." />;
  }

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />
        <Route path="/join-organization" element={
          <ProtectedRoute requireApproved={false}>
            <JoinOrganizationPage />
          </ProtectedRoute>
        } />

        {/* Protected Dashboard Routes */}
        <Route element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/employees" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <EmployeesPage />
            </ProtectedRoute>
          } />
          <Route path="/pending-requests" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PendingRequestsPage />
            </ProtectedRoute>
          } />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      {/* Global Toast */}
      <Toast />
    </>
  );
}

// Main App with Redux Provider and Router
function App() {
  return (
    <Provider store={store}>
      <Router>
        <AppContent />
      </Router>
    </Provider>
  );
}

export default App;
