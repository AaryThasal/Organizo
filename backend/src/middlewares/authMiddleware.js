// ===========================================
// Authentication Middleware
// ===========================================
// Verifies JWT tokens and attaches user data to requests

const jwt = require('jsonwebtoken');
const db = require('../config/db');

/**
 * Middleware to verify JWT token
 * Adds user data to req.user if token is valid
 */
async function authenticateToken(req, res, next) {
    try {
        // Get the Authorization header
        const authHeader = req.headers['authorization'];

        // Token format: "Bearer <token>"
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get fresh user data from database
        // This ensures we have the latest user status and role
        const { rows } = await db.query(
            'SELECT id, organization_id, first_name, last_name, email, role, status, profile_image_url FROM users WHERE id = $1',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.'
            });
        }

        // Attach user data to the request object
        req.user = rows[0];
        next();

    } catch (error) {
        // Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired. Please login again.'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token.'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error.'
        });
    }
}

module.exports = { authenticateToken };
