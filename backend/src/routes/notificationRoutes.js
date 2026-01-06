// Notification Routes

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get all notifications for the current user
router.get('/', notificationController.getNotifications);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Mark a single notification as read
router.patch('/:id/read', notificationController.markAsRead);

router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
