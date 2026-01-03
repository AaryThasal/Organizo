// ===========================================
// Authentication Routes
// ===========================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Public routes (no authentication required)

// POST /api/auth/register/admin
// Register a new admin along with their organization
router.post('/register/admin', authController.registerAdmin);

// POST /api/auth/register/user
// Register a new manager or employee
router.post('/register/user', authController.registerUser);

// POST /api/auth/login
// Login with email and password
router.post('/login', authController.login);

// Protected routes (authentication required)

// POST /api/auth/join-organization
// Submit organization join code
router.post('/join-organization', authenticateToken, authController.joinOrganization);

// GET /api/auth/me
// Get current user profile
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
