// Email Configuration - Nodemailer with Gmail SMTP
// Designed to be reusable for future features (email verification, notifications, etc.)

const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4,
    connectionTimeout: 10000,
    socketTimeout: 10000,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

// Verify transporter on startup (non-blocking)
transporter.verify()
    .then(() => {
        console.log('Email service connected successfully');
    })
    .catch((err) => {
        console.error('Email service verification failed:', err.message);
    });

/**
 * Send a password reset OTP email with retry
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

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;

            // Don't retry on permanent errors
            if (error.code === 'EAUTH') {
                throw new Error('Failed to send email: Invalid Gmail credentials.');
            }

            if (error.message && error.message.includes('Invalid email')) {
                throw new Error('Failed to send email: Invalid email address.');
            }

            // Retry once on temporary/network errors
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    throw new Error(`Failed to send email after ${maxAttempts} attempts: ${lastError.message}`);
}

/**
 * Send a temporary password email with retry
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

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const info = await transporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;

            // Don't retry on permanent errors
            if (error.code === 'EAUTH') {
                throw new Error('Failed to send email: Invalid Gmail credentials.');
            }

            if (error.message && error.message.includes('Invalid email')) {
                throw new Error('Failed to send email: Invalid email address.');
            }

            // Retry once on temporary/network errors
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }

    throw new Error(`Failed to send temp password email after ${maxAttempts} attempts: ${lastError.message}`);
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
