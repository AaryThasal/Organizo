// Controls access based on user roles and approval status

function requireRole(allowedRoles) {
    return (req, res, next) => {
        // Make sure user is authenticated first
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Check if user's role is in the allowed roles list
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.'
            });
        }

        next();
    };
}

function requireApproved(req, res, next) {
    // Make sure user is authenticated first
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    // Admins are always approved (they create the organization)
    if (req.user.role === 'admin') {
        return next();
    }

    // Check if user is approved
    if (req.user.status !== 'approved') {
        return res.status(403).json({
            success: false,
            message: 'Your account is pending approval. Please wait for admin to approve your request.'
        });
    }

    next();
}

function requireOrganization(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (!req.user.organization_id) {
        return res.status(403).json({
            success: false,
            message: 'You must join an organization first.'
        });
    }

    next();
}

module.exports = {
    requireRole,
    requireApproved,
    requireOrganization
};
