import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LoadingScreen } from '../components/ui/Spinner';

function ProtectedRoute({ children, allowedRoles = [], requireApproved = true }) {
    const location = useLocation();
    const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);

    if (isLoading) {
        return <LoadingScreen />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Admins bypass org/approval checks
    if (user.role === 'admin') {
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
            return <Navigate to="/dashboard" replace />;
        }
        return children;
    }

    const needsOrganization = !user.organization_id;
    const isPending = user.status === 'pending';
    const isApproved = user.status === 'approved';

    if (requireApproved) {
        if (needsOrganization || isPending) {
            return <Navigate to="/join-organization" replace />;
        }
    } else {
        // Already approved users shouldn't be on join-organization
        if (isApproved && user.organization_id) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}

export default ProtectedRoute;
