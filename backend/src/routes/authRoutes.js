// Authentication Routes

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { loginLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middlewares/rateLimiter');

router.post('/register/admin', authController.registerAdmin);

router.post('/register/user', authController.registerUser);

router.post('/login', loginLimiter, authController.login);

router.post('/join-organization', authenticateToken, authController.joinOrganization);

router.get('/me', authenticateToken, authController.getCurrentUser);

// Password reset routes (public, rate-limited)
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

module.exports = router;
