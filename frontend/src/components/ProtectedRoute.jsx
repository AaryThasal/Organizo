// ===========================================
// Protected Route Component
// ===========================================
// Handles authentication and role-based access

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingScreen } from '../components/ui/Spinner';

function ProtectedRoute({ children, allowedRoles = [], requireApproved = true }) {
    const location = useLocation();
    const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);

    // Show loading while checking auth
    if (isLoading) {
        return <LoadingScreen />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Skip organization and approval checks if user is already on the join-organization page
    const isJoinOrgPage = location.pathname === '/join-organization';

    // Check if user needs to join an organization (non-admin)
    // Only redirect if not already on the join-organization page
    if (!isJoinOrgPage && !user.organization_id && user.role !== 'admin') {
        return <Navigate to="/join-organization" replace />;
    }

    // Check if user is pending approval (non-admin)
    // Only redirect if not already on the join-organization page
    if (!isJoinOrgPage && requireApproved && user.status === 'pending' && user.role !== 'admin') {
        return <Navigate to="/join-organization" replace />;
    }

    // Check role-based access
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default ProtectedRoute;
