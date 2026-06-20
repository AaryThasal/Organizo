// Email Configuration - Nodemailer with Gmail SMTP
// Designed to be reusable for future features (email verification, notifications, etc.)

const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');

// Force IPv4 DNS resolution globally
// This prevents "ENETUNREACH" IPv6 connection errors on hosting platforms like Render
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Override Node.js DNS lookups at module level for extra safety
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
    // Handle both callback and promise-based calls
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    
    // Force IPv4
    const opts = { ...options, family: 4 };
    
    if (typeof callback === 'function') {
        return originalLookup.call(dns, hostname, opts, callback);
    } else {
        return originalLookup.call(dns, hostname, opts);
    }
};

// Create reusable transporter using Gmail SMTP with enhanced configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587, // Use 587 (STARTTLS) instead of 465, as Render often blocks/times out 465
    secure: false, // Must be false for 587. It will automatically upgrade to secure via STARTTLS
    family: 4, // Force IPv4 explicitly
    connectionTimeout: 10000, // 10 seconds timeout for connection
    socketTimeout: 10000, // 10 seconds timeout for socket
    pool: {
        maxConnections: 1,
        maxMessages: 5,
        rateDelta: 2000, // 2 seconds between messages
        rateLimit: true,
    },
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    logger: true, // Enable logging for debugging
    debug: process.env.NODE_ENV === 'development', // Only debug in development
});

// Enhanced transporter verification with retry logic
async function verifyEmailTransporter() {
    const maxRetries = 3;
    let retries = 0;
    
    const attemptVerify = async () => {
        try {
            await transporter.verify();
            console.log('✅ Email service connected (Gmail SMTP on Render)');
            return true;
        } catch (error) {
            retries++;
            console.error(`❌ Email service verification attempt ${retries}/${maxRetries} failed:`, {
                message: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
            });
            
            if (retries < maxRetries) {
                // Exponential backoff: 2s, 4s, 8s
                const delay = Math.pow(2, retries) * 1000;
                console.log(`⏳ Retrying email verification in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return attemptVerify();
            }
            
            console.warn('⚠️ Email service may not be available. Forgot password feature might fail.');
            return false;
        }
    };
    
    return attemptVerify();
}

// Verify on startup (non-blocking)
verifyEmailTransporter().catch(err => {
    console.error('Critical: Email service verification failed:', err);
});

/**
 * Send a password reset OTP email with automatic retry logic
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code (plaintext, for the email body only)
 * @param {string} firstName - User's first name for personalization
 */
async function sendPasswordResetEmail(to, otp, firstName) {
    const mailOptions = {
        from: `"Organizo" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Organizo — Password Reset Code',
        html: getPasswordResetTemplate(otp, firstName),
    };

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Sending password reset email to ${to} (attempt ${attempt}/${maxRetries})...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Password reset email sent to ${to} (ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;
            console.error(`❌ Email send attempt ${attempt}/${maxRetries} failed:`, {
                to,
                message: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
                command: error.command,
            });

            // Don't retry on permanent errors (auth, invalid email, etc.)
            if (error.code === 'EAUTH' || error.message.includes('Invalid email')) {
                console.error('Permanent error - not retrying:', error.message);
                throw new Error('Failed to send password reset email: Invalid credentials or email address.');
            }

            // Retry on temporary/network errors
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    console.error('Final error after all retries:', lastError);
    throw new Error(`Failed to send password reset email after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Send a temporary password email with automatic retry logic
 * @param {string} to - Recipient email address
 * @param {string} tempPassword - The temporary password
 * @param {string} firstName - User's first name for personalization
 */
async function sendTempPasswordEmail(to, tempPassword, firstName) {
    const mailOptions = {
        from: `"Organizo" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Organizo — Your Password Has Been Reset',
        html: getTempPasswordTemplate(tempPassword, firstName),
    };

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Sending temp password email to ${to} (attempt ${attempt}/${maxRetries})...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ Temp password email sent to ${to} (ID: ${info.messageId})`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;
            console.error(`❌ Email send attempt ${attempt}/${maxRetries} failed:`, {
                to,
                message: error.message,
                code: error.code,
                errno: error.errno,
                syscall: error.syscall,
            });

            // Don't retry on permanent errors
            if (error.code === 'EAUTH' || error.message.includes('Invalid email')) {
                console.error('Permanent error - not retrying:', error.message);
                throw new Error('Failed to send temp password email: Invalid credentials or email address.');
            }

            // Retry on temporary/network errors
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    console.error('Final error after all retries:', lastError);
    throw new Error(`Failed to send temp password email after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * HTML template for password reset OTP email
 */
function getPasswordResetTemplate(otp, firstName) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f1117; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1117; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color: #1a1d27; border-radius: 16px; border: 1px solid #2a2d3a; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2d3a;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #818cf8;">Organizo</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #e2e8f0;">Password Reset</h2>
                                <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                                    Hi ${firstName}, we received a request to reset your password. Use the code below to proceed:
                                </p>
                                <!-- OTP Code -->
                                <div style="background-color: #0f1117; border: 2px solid #818cf8; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                    <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', monospace;">${otp}</span>
                                </div>
                                <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                    ⏱ This code expires in <strong style="color: #e2e8f0;">15 minutes</strong>.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                    If you didn't request this, you can safely ignore this email. Your password will not be changed.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 32px; border-top: 1px solid #2a2d3a; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #64748b;">
                                    &copy; ${new Date().getFullYear()} Organizo. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

/**
 * HTML template for admin-initiated temp password email
 */
function getTempPasswordTemplate(tempPassword, firstName) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #0f1117; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f1117; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="480" cellpadding="0" cellspacing="0" style="background-color: #1a1d27; border-radius: 16px; border: 1px solid #2a2d3a; overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #2a2d3a;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #818cf8;">Organizo</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 32px;">
                                <h2 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #e2e8f0;">Password Reset by Admin</h2>
                                <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                                    Hi ${firstName}, your organization admin has reset your password. Use the temporary password below to log in:
                                </p>
                                <!-- Temp Password -->
                                <div style="background-color: #0f1117; border: 2px solid #f59e0b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                    <span style="font-size: 24px; font-weight: 700; letter-spacing: 4px; color: #f59e0b; font-family: 'Courier New', monospace;">${tempPassword}</span>
                                </div>
                                <p style="margin: 0 0 8px; font-size: 13px; color: #94a3b8;">
                                    ⚠️ <strong style="color: #f59e0b;">You will be required to change this password</strong> after logging in.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                                    If you did not expect this, please contact your organization admin immediately.
                                </p>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 20px 32px; border-top: 1px solid #2a2d3a; text-align: center;">
                                <p style="margin: 0; font-size: 12px; color: #64748b;">
                                    &copy; ${new Date().getFullYear()} Organizo. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

module.exports = {
    sendPasswordResetEmail,
    sendTempPasswordEmail,
};
