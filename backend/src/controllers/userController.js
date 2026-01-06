// User Controller - handles user management, approval, and profile updates

const bcrypt = require('bcrypt');
const db = require('../config/db');
const { formatUserResponse, isEmpty, isValidEmail } = require('../utils/helpers');
const { deleteImage, getPublicIdFromUrl } = require('../config/cloudinary');

const SALT_ROUNDS = 10;

// GET /api/users - Get all users in the organization
async function getUsers(req, res) {
    try {
        const organizationId = req.user.organization_id;
        const { status, role } = req.query;

        // Build query based on filters
        let query = `
      SELECT id, organization_id, first_name, last_name, email, role, status, created_at 
      FROM users 
      WHERE organization_id = $1
    `;
        const params = [organizationId];

        // Filter by status if provided
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        // Filter by role if provided
        if (role && ['admin', 'manager', 'employee'].includes(role)) {
            params.push(role);
            query += ` AND role = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows.map(formatUserResponse)
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get users.'
        });
    }
}

/**
 * Get pending join requests
 * GET /api/users/pending
 * Admin only
 */
async function getPendingRequests(req, res) {
    try {
        const organizationId = req.user.organization_id;

        const result = await db.query(
            `SELECT id, first_name, last_name, email, role, created_at 
       FROM users 
       WHERE organization_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
            [organizationId]
        );

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending requests.'
        });
    }
}

/**
 * Approve a user's join request
 * POST /api/users/:id/approve
 * Admin only
 */
async function approveUser(req, res) {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        // Find the user and verify they belong to the same organization
        const userResult = await db.query(
            'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
            [id, organizationId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = userResult.rows[0];

        if (user.status === 'approved') {
            return res.status(400).json({
                success: false,
                message: 'User is already approved.'
            });
        }

        // Update user status to approved
        await db.query(
            "UPDATE users SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );

        // Notify user about approval
        await db.query(
            `INSERT INTO notifications (user_id, type, message) 
       VALUES ($1, 'approval', 'Your request to join the organization has been approved!')`,
            [id]
        );

        res.json({
            success: true,
            message: `${user.first_name} ${user.last_name} has been approved.`
        });

    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve user.'
        });
    }
}

/**
 * Reject a user's join request
 * POST /api/users/:id/reject
 * Admin only
 */
async function rejectUser(req, res) {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        // Find the user and verify they belong to the same organization
        const userResult = await db.query(
            'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
            [id, organizationId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = userResult.rows[0];

        if (user.status === 'rejected') {
            return res.status(400).json({
                success: false,
                message: 'User is already rejected.'
            });
        }

        // Update user status to rejected and remove organization_id
        await db.query(
            "UPDATE users SET status = 'rejected', organization_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );

        // Notify user about rejection
        await db.query(
            `INSERT INTO notifications (user_id, type, message) 
       VALUES ($1, 'rejection', 'Your request to join the organization has been declined.')`,
            [id]
        );

        res.json({
            success: true,
            message: `${user.first_name} ${user.last_name} has been rejected.`
        });

    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject user.'
        });
    }
}

/**
 * Update current user's profile
 * PUT /api/users/profile
 */
async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const { firstName, lastName, email, currentPassword, newPassword } = req.body;

        // Validate at least some fields are provided
        if (isEmpty(firstName) && isEmpty(lastName) && isEmpty(email) && isEmpty(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide at least one field to update.'
            });
        }

        // Get current user data
        const currentUser = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (currentUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = currentUser.rows[0];
        const updates = [];
        const params = [];
        let paramIndex = 1;

        // Update first name if provided
        if (!isEmpty(firstName)) {
            params.push(firstName.trim());
            updates.push(`first_name = $${paramIndex++}`);
        }

        // Update last name if provided
        if (!isEmpty(lastName)) {
            params.push(lastName.trim());
            updates.push(`last_name = $${paramIndex++}`);
        }

        // Update email if provided
        if (!isEmpty(email)) {
            if (!isValidEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid email address.'
                });
            }

            // Check if email is already taken by another user
            const emailCheck = await db.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email.toLowerCase(), userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already taken.'
                });
            }

            params.push(email.toLowerCase());
            updates.push(`email = $${paramIndex++}`);
        }

        // Update password if provided
        if (!isEmpty(newPassword)) {
            // Verify current password first
            if (isEmpty(currentPassword)) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is required to set a new password.'
                });
            }

            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect.'
                });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'New password must be at least 6 characters long.'
                });
            }

            const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
            params.push(newPasswordHash);
            updates.push(`password_hash = $${paramIndex++}`);
        }

        // Add updated_at
        updates.push('updated_at = CURRENT_TIMESTAMP');

        // Build and execute update query
        params.push(userId);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;

        const result = await db.query(query, params);

        res.json({
            success: true,
            message: 'Profile updated successfully!',
            data: formatUserResponse(result.rows[0])
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile.'
        });
    }
}

/**
 * Remove a user from the organization
 * DELETE /api/users/:id
 * Admin only
 */
async function removeUser(req, res) {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;
        const adminId = req.user.id;

        // Prevent admin from removing themselves
        if (id === adminId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot remove yourself from the organization.'
            });
        }

        // Find the user and verify they belong to the same organization
        const userResult = await db.query(
            'SELECT * FROM users WHERE id = $1 AND organization_id = $2',
            [id, organizationId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = userResult.rows[0];

        // Prevent removing another admin
        if (user.role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove another admin from the organization.'
            });
        }

        // Remove user from organization (set organization_id to null, keep account)
        await db.query(
            "UPDATE users SET organization_id = NULL, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
            [id]
        );

        // Remove user from all projects
        await db.query('DELETE FROM project_members WHERE user_id = $1', [id]);

        res.json({
            success: true,
            message: `${user.first_name} ${user.last_name} has been removed from the organization.`
        });

    } catch (error) {
        console.error('Remove user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove user.'
        });
    }
}

/**
 * Get a single user by ID
 * GET /api/users/:id
 */
async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const organizationId = req.user.organization_id;

        const result = await db.query(
            `SELECT id, organization_id, first_name, last_name, email, role, status, created_at 
       FROM users 
       WHERE id = $1 AND organization_id = $2`,
            [id, organizationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        res.json({
            success: true,
            data: formatUserResponse(result.rows[0])
        });

    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user.'
        });
    }
}

// POST /api/users/profile/image - Upload profile image
async function uploadProfileImage(req, res) {
    try {
        const userId = req.user.id;

        // Check if file was uploaded (multer adds req.file)
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided.'
            });
        }

        // Get current user to check if they have an existing image
        const currentUser = await db.query(
            'SELECT profile_image_url FROM users WHERE id = $1',
            [userId]
        );

        // Delete old image from Cloudinary if exists
        if (currentUser.rows[0]?.profile_image_url) {
            const oldPublicId = getPublicIdFromUrl(currentUser.rows[0].profile_image_url);
            await deleteImage(oldPublicId);
        }

        // The image URL is provided by Cloudinary storage in req.file.path
        const imageUrl = req.file.path;

        // Update user's profile_image_url in database
        const result = await db.query(
            `UPDATE users 
             SET profile_image_url = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, first_name, last_name, email, role, status, profile_image_url, organization_id`,
            [imageUrl, userId]
        );

        res.json({
            success: true,
            message: 'Profile image uploaded successfully!',
            data: formatUserResponse(result.rows[0])
        });

    } catch (error) {
        console.error('Upload profile image error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload profile image.'
        });
    }
}

// DELETE /api/users/profile/image - Remove profile image
async function removeProfileImage(req, res) {
    try {
        const userId = req.user.id;

        // Get current image URL
        const currentUser = await db.query(
            'SELECT profile_image_url FROM users WHERE id = $1',
            [userId]
        );

        if (!currentUser.rows[0]?.profile_image_url) {
            return res.status(400).json({
                success: false,
                message: 'No profile image to remove.'
            });
        }

        // Delete from Cloudinary
        const publicId = getPublicIdFromUrl(currentUser.rows[0].profile_image_url);
        await deleteImage(publicId);

        // Remove URL from database
        const result = await db.query(
            `UPDATE users 
             SET profile_image_url = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 
             RETURNING id, first_name, last_name, email, role, status, profile_image_url, organization_id`,
            [userId]
        );

        res.json({
            success: true,
            message: 'Profile image removed successfully!',
            data: formatUserResponse(result.rows[0])
        });

    } catch (error) {
        console.error('Remove profile image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove profile image.'
        });
    }
}

module.exports = {
    getUsers,
    getPendingRequests,
    approveUser,
    rejectUser,
    updateProfile,
    removeUser,
    getUserById,
    uploadProfileImage,
    removeProfileImage
};
