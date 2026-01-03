// ===========================================
// Notification Routes
// ===========================================

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// GET /api/notifications
// Get all notifications for the current user
router.get('/', notificationController.getNotifications);

// PATCH /api/notifications/read-all
// Mark all notifications as read
// Note: This must come before /:id routes to avoid conflict
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read
// Mark a single notification as read
router.patch('/:id/read', notificationController.markAsRead);

// DELETE /api/notifications/:id
// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
