// Authentication Routes

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/register/admin', authController.registerAdmin);

router.post('/register/user', authController.registerUser);

router.post('/login', authController.login);

router.post('/join-organization', authenticateToken, authController.joinOrganization);

router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;
