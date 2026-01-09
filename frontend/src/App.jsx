import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './store/store';
import { getCurrentUser } from './store/authSlice';

import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/layouts/DashboardLayout';
import Toast from './components/ui/Toast';
import { LoadingScreen } from './components/ui/Spinner';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JoinOrganizationPage from './pages/auth/JoinOrganizationPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import ProjectsPage from './pages/projects/ProjectsPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import EmployeesPage from './pages/users/EmployeesPage';
import PendingRequestsPage from './pages/admin/PendingRequestsPage';
import MyTasksPage from './pages/tasks/MyTasksPage';
import SettingsPage from './pages/settings/SettingsPage';

// Main app component with routes
function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);

  // Restore auth state on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, user]);

  if (isLoading && localStorage.getItem('token')) {
    return <LoadingScreen message="Loading your account..." />;
  }

  // Redirect authenticated users based on role/status
  const getAuthenticatedRedirect = () => {
    if (!user) return '/dashboard';
    if (user.role === 'admin') return '/dashboard';
    if (!user.organization_id || user.status === 'pending') return '/join-organization';
    return '/dashboard';
  };

  return (
    <>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to={getAuthenticatedRedirect()} replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to={getAuthenticatedRedirect()} replace /> : <RegisterPage />
        } />
        <Route path="/join-organization" element={
          <ProtectedRoute requireApproved={false}>
            <JoinOrganizationPage />
          </ProtectedRoute>
        } />

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

        <Route path="/" element={
          isAuthenticated ? <Navigate to={getAuthenticatedRedirect()} replace /> : <Navigate to="/login" replace />
        } />
        <Route path="*" element={
          isAuthenticated ? <Navigate to={getAuthenticatedRedirect()} replace /> : <Navigate to="/login" replace />
        } />
      </Routes>

      <Toast />
    </>
  );
}

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
