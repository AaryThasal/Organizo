// User Routes

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { requireRole, requireApproved, requireOrganization } = require('../middlewares/roleMiddleware');
const { upload } = require('../config/cloudinary');

router.use(authenticateToken);

// Update current user's profile
router.put('/profile', userController.updateProfile);

// Upload profile image to Cloudinary
router.post(
    '/profile/image',
    upload.single('image'), 
    userController.uploadProfileImage
);

// Remove profile image
router.delete('/profile/image', userController.removeProfileImage);

// Get pending join requests
router.get(
    '/pending',
    requireOrganization,
    requireRole(['admin']),
    userController.getPendingRequests
);

// Get all users in the organization
router.get(
    '/',
    requireOrganization,
    requireApproved,
    requireRole(['admin', 'manager']),
    userController.getUsers
);

// Get a single user by ID
router.get(
    '/:id',
    requireOrganization,
    requireApproved,
    requireRole(['admin', 'manager']),
    userController.getUserById
);

// Approve a user's join request
router.post(
    '/:id/approve',
    requireOrganization,
    requireRole(['admin']),
    userController.approveUser
);

// Reject a user's join request
router.post(
    '/:id/reject',
    requireOrganization,
    requireRole(['admin']),
    userController.rejectUser
);

// Remove a user from the organization
router.delete(
    '/:id',
    requireOrganization,
    requireRole(['admin']),
    userController.removeUser
);

module.exports = router;
