// ===========================================
// Notification Controller
// ===========================================
// Handles notification retrieval and marking as read

const db = require('../config/db');

/**
 * Get all notifications for the current user
 * GET /api/notifications
 */
async function getNotifications(req, res) {
    try {
        const userId = req.user.id;
        const { unreadOnly } = req.query;

        let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
        const params = [userId];

        // Filter to unread only if requested
        if (unreadOnly === 'true') {
            query += ' AND is_read = FALSE';
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const result = await db.query(query, params);

        // Also get unread count
        const unreadCount = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            data: {
                notifications: result.rows,
                unreadCount: parseInt(unreadCount.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get notifications.'
        });
    }
}

/**
 * Mark a single notification as read
 * PATCH /api/notifications/:id/read
 */
async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify notification belongs to the user
        const notificationCheck = await db.query(
            'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (notificationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.'
            });
        }

        // Mark as read
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'Notification marked as read.'
        });

    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read.'
        });
    }
}

/**
 * Mark all notifications as read
 * PATCH /api/notifications/read-all
 */
async function markAllAsRead(req, res) {
    try {
        const userId = req.user.id;

        const result = await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
            [userId]
        );

        res.json({
            success: true,
            message: `${result.rowCount} notification(s) marked as read.`
        });

    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notifications as read.'
        });
    }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
async function deleteNotification(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify notification belongs to the user
        const notificationCheck = await db.query(
            'SELECT id FROM notifications WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (notificationCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.'
            });
        }

        // Delete the notification
        await db.query('DELETE FROM notifications WHERE id = $1', [id]);

        res.json({
            success: true,
            message: 'Notification deleted.'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification.'
        });
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};
