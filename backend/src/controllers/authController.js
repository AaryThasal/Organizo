// Auth Controller - handles registration, login, organization joining, and password reset

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const { generateJoinCode, formatUserResponse, isValidEmail, isEmpty } = require('../utils/helpers');
const { sendPasswordResetEmail } = require('../config/email');

const SALT_ROUNDS = 10;

async function registerAdmin(req, res) {
    try {
        const { organizationName, firstName, lastName, email, password } = req.body;

        // Validate required fields
        if (isEmpty(organizationName) || isEmpty(firstName) || isEmpty(lastName) || isEmpty(email) || isEmpty(password)) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: organizationName, firstName, lastName, email, password'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if email already exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Generate a unique join code for the organization
        let joinCode = generateJoinCode();

        // Make sure join code is unique (rare case of collision)
        let codeExists = await db.query('SELECT id FROM organizations WHERE join_code = $1', [joinCode]);
        while (codeExists.rows.length > 0) {
            joinCode = generateJoinCode();
            codeExists = await db.query('SELECT id FROM organizations WHERE join_code = $1', [joinCode]);
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Start a transaction to create both organization and admin user
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Create the organization
            const orgResult = await client.query(
                'INSERT INTO organizations (name, join_code) VALUES ($1, $2) RETURNING *',
                [organizationName.trim(), joinCode]
            );
            const organization = orgResult.rows[0];

            // Create the admin user
            // Admin is automatically approved since they're creating the organization
            const userResult = await client.query(
                `INSERT INTO users (organization_id, first_name, last_name, email, password_hash, role, status) 
         VALUES ($1, $2, $3, $4, $5, 'admin', 'approved') 
         RETURNING *`,
                [organization.id, firstName.trim(), lastName.trim(), email.toLowerCase(), passwordHash]
            );
            const user = userResult.rows[0];

            await client.query('COMMIT');

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Return success response
            res.status(201).json({
                success: true,
                message: 'Organization and admin account created successfully!',
                data: {
                    user: formatUserResponse(user),
                    organization: {
                        id: organization.id,
                        name: organization.name,
                        logo_url: organization.logo_url || null,
                        joinCode: organization.join_code
                    },
                    token
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Register admin error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account. Please try again.'
        });
    }
}


async function registerUser(req, res) {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Validate required fields
        if (isEmpty(firstName) || isEmpty(lastName) || isEmpty(email) || isEmpty(password) || isEmpty(role)) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: firstName, lastName, email, password, role'
            });
        }

        // Validate role (only manager or employee allowed here)
        if (!['manager', 'employee'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Role must be either "manager" or "employee".'
            });
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Check if email already exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Hash the password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create the user 
        // Status is 'pending' until they join an organization and get approved
        const userResult = await db.query(
            `INSERT INTO users (first_name, last_name, email, password_hash, role, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
            [firstName.trim(), lastName.trim(), email.toLowerCase(), passwordHash, role]
        );
        const user = userResult.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Account created successfully! Please join an organization using the join code.',
            data: {
                user: formatUserResponse(user),
                token
            }
        });

    } catch (error) {
        console.error('Register user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account. Please try again.'
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (isEmpty(email) || isEmpty(password)) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        // Find user by email
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = userResult.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Get organization info if user belongs to one
        let organization = null;
        if (user.organization_id) {
            const orgResult = await db.query('SELECT id, name, logo_url FROM organizations WHERE id = $1', [user.organization_id]);
            if (orgResult.rows.length > 0) {
                organization = orgResult.rows[0];
            }
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful!',
            data: {
                user: formatUserResponse(user),
                organization,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
}

async function joinOrganization(req, res) {
    try {
        const { joinCode } = req.body;
        const userId = req.user.id;

        // Validate join code
        if (isEmpty(joinCode)) {
            return res.status(400).json({
                success: false,
                message: 'Join code is required.'
            });
        }

        // Check if user already belongs to an organization
        if (req.user.organization_id) {
            return res.status(400).json({
                success: false,
                message: 'You already belong to an organization.'
            });
        }

        // Find organization by join code
        const orgResult = await db.query(
            'SELECT id, name FROM organizations WHERE join_code = $1',
            [joinCode.toUpperCase()]
        );

        if (orgResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid join code. Please check the code and try again.'
            });
        }

        const organization = orgResult.rows[0];

        // Update user with organization ID (status remains 'pending')
        await db.query(
            'UPDATE users SET organization_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [organization.id, userId]
        );

        // Notify admin about join request
        const adminResult = await db.query(
            "SELECT id FROM users WHERE organization_id = $1 AND role = 'admin'",
            [organization.id]
        );

        if (adminResult.rows.length > 0) {
            const adminId = adminResult.rows[0].id;
            await db.query(
                `INSERT INTO notifications (user_id, type, message, metadata) 
         VALUES ($1, 'join_request', $2, $3)`,
                [
                    adminId,
                    `${req.user.first_name} ${req.user.last_name} (${req.user.role}) wants to join your organization.`,
                    JSON.stringify({ requesterId: userId, requesterRole: req.user.role })
                ]
            );
        }

        res.json({
            success: true,
            message: 'Join request submitted! Please wait for admin approval.',
            data: {
                organizationName: organization.name,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Join organization error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join organization. Please try again.'
        });
    }
}

async function getCurrentUser(req, res) {
    try {
        // Get organization info if user belongs to one
        let organization = null;
        if (req.user.organization_id) {
            const orgResult = await db.query(
                'SELECT id, name, logo_url FROM organizations WHERE id = $1',
                [req.user.organization_id]
            );
            if (orgResult.rows.length > 0) {
                organization = orgResult.rows[0];
            }
        }

        res.json({
            success: true,
            data: {
                user: formatUserResponse(req.user),
                organization
            }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data.'
        });
    }
}

// Generate a 6-digit numeric OTP
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        // Validate email
        if (isEmpty(email)) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.'
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Always return success to prevent email enumeration
        const genericResponse = {
            success: true,
            message: 'If an account with that email exists, a password reset code has been sent.'
        };

        // Look up user by email
        const userResult = await db.query(
            'SELECT id, first_name, email FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        // If user doesn't exist, still return the generic success message
        if (userResult.rows.length === 0) {
            return res.json(genericResponse);
        }

        const user = userResult.rows[0];

        // Invalidate any existing unused tokens for this user
        await db.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
            [user.id]
        );

        // Generate OTP and hash it for storage
        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);

        // Store hashed OTP with 15-minute expiry
        await db.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
            [user.id, otpHash]
        );

        // Send OTP via email - this can fail on network issues
        try {
            await sendPasswordResetEmail(user.email, otp, user.first_name);
        } catch (emailError) {
            // Log the error but still return generic response to prevent
            // attackers from knowing if email service is down
            console.error('Failed to send password reset email:', emailError.message);
        }

        res.json(genericResponse);

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request. Please try again later.'
        });
    }
}

async function resetPassword(req, res) {
    try {
        const { email, otp, newPassword } = req.body;

        // Validate required fields
        if (isEmpty(email) || isEmpty(otp) || isEmpty(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Email, reset code, and new password are required.'
            });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long.'
            });
        }

        // Find user by email
        const userResult = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code.'
            });
        }

        const user = userResult.rows[0];

        // Get the most recent unused, non-expired token for this user
        const tokenResult = await db.query(
            `SELECT id, token_hash FROM password_reset_tokens
             WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC LIMIT 1`,
            [user.id]
        );

        if (tokenResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code.'
            });
        }

        const tokenRecord = tokenResult.rows[0];

        // Verify OTP against the stored hash
        const isValidOTP = await bcrypt.compare(otp, tokenRecord.token_hash);
        if (!isValidOTP) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset code.'
            });
        }

        // Hash new password and update user
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, user.id]
        );

        // Mark token as used and invalidate all tokens for this user
        await db.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1',
            [user.id]
        );

        // Clean up expired tokens (housekeeping)
        await db.query(
            'DELETE FROM password_reset_tokens WHERE expires_at < NOW()'
        );

        res.json({
            success: true,
            message: 'Password reset successfully! You can now log in with your new password.'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password. Please try again.'
        });
    }
}

module.exports = {
    registerAdmin,
    registerUser,
    login,
    joinOrganization,
    getCurrentUser,
    forgotPassword,
    resetPassword
};
