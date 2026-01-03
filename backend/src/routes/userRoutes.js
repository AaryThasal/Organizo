// ===========================================
// User Routes
// ===========================================

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticateToken);

// PUT /api/users/profile
// Update current user's profile
// Any authenticated user can update their own profile
router.put('/profile', userController.updateProfile);

// GET /api/users/pending
// Get pending join requests
// Admin only
router.get(
    '/pending',
    requireOrganization,
    requireRole(['admin']),
    userController.getPendingRequests
);

// GET /api/users
// Get all users in the organization
// Admin and Manager can access
router.get(
    '/',
    requireOrganization,
    requireApproved,
    requireRole(['admin', 'manager']),
    userController.getUsers
);

// GET /api/users/:id
// Get a single user by ID
// Admin and Manager can access
router.get(
    '/:id',
    requireOrganization,
    requireApproved,
    requireRole(['admin', 'manager']),
    userController.getUserById
);

// POST /api/users/:id/approve
// Approve a user's join request
// Admin only
router.post(
    '/:id/approve',
    requireOrganization,
    requireRole(['admin']),
    userController.approveUser
);

// POST /api/users/:id/reject
// Reject a user's join request
// Admin only
router.post(
    '/:id/reject',
    requireOrganization,
    requireRole(['admin']),
    userController.rejectUser
);

// DELETE /api/users/:id
// Remove a user from the organization
// Admin only
router.delete(
    '/:id',
    requireOrganization,
    requireRole(['admin']),
    userController.removeUser
);

module.exports = router;
