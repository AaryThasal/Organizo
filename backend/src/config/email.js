// Email Configuration - Nodemailer with Gmail SMTP
// Designed to be reusable for future features (email verification, notifications, etc.)

const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');

// ===== CRITICAL: Force IPv4 ONLY (Render doesn't support IPv6) =====

// 1. Set DNS to prefer IPv4
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// 2. Override DNS lookup to ONLY resolve IPv4 addresses
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
    // Force family to 4 (IPv4 only)
    if (typeof options === 'function') {
        callback = options;
        options = { family: 4 };
    } else {
        options = { ...options, family: 4 };
    }
    return originalLookup.call(dns, hostname, options, callback);
};

// 3. Override getaddrinfo to prefer IPv4 at the node level
dns.getaddrinfo = (function(original) {
    return function(hostname, family, callback) {
        // Force IPv4 only
        if (typeof family === 'function') {
            callback = family;
            family = 4;
        }
        family = 4; // Always IPv4 for SMTP
        return original.call(dns, hostname, family, callback);
    };
})(dns.getaddrinfo || (() => {}));

// 4. Create custom lookup for Nodemailer that returns IPv4 address directly
const customLookup = (hostname, options, callback) => {
    // Handle both callback and promise modes
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    // For Gmail, use direct IPv4 addresses instead of DNS lookup
    // This bypasses DNS resolution entirely
    const ipv4Addresses = {
        'smtp.gmail.com': ['108.177.98.109', '142.250.185.109', '142.250.80.109'],
    };

    if (ipv4Addresses[hostname]) {
        const address = ipv4Addresses[hostname][0];
        const result = {
            address,
            family: 4,
        };
        
        if (typeof callback === 'function') {
            process.nextTick(() => callback(null, address, 4));
        }
        return result;
    }

    // Fallback to normal IPv4 DNS resolution for other hosts
    return originalLookup.call(dns, hostname, { ...options, family: 4 }, callback);
};

// Create reusable transporter using Gmail SMTP with aggressive IPv4 forcing
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    family: 4, // Force IPv4
    lookup: customLookup, // Use custom lookup function
    connectionTimeout: 15000, // 15 seconds (increased from 10)
    socketTimeout: 15000,
    pool: {
        maxConnections: 1,
        maxMessages: 5,
        rateDelta: 2000,
        rateLimit: true,
    },
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    logger: true,
    debug: process.env.NODE_ENV === 'development',
});

console.log('📧 Email service initializing with forced IPv4 configuration...');
console.log('   - Host: smtp.gmail.com');
console.log('   - Port: 587 (STARTTLS)');
console.log('   - DNS Mode: IPv4-only (custom lookup)');
console.log('   - Connection Timeout: 15s');
console.log('   - Retry Attempts: 3 with backoff');

// Enhanced transporter verification with retry logic
async function verifyEmailTransporter() {
    const maxRetries = 3;
    let retries = 0;
    
    const attemptVerify = async () => {
        try {
            console.log(`\n🔍 Email service verification (attempt ${retries + 1}/${maxRetries})...`);
            await transporter.verify();
            console.log('✅ Email service connected (Gmail SMTP on Render - IPv4)');
            console.log(`📧 Verified email: ${process.env.EMAIL_USER}`);
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
                const delay = Math.pow(2, retries) * 1000;
                console.log(`⏳ Retrying email verification in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return attemptVerify();
            }
            
            console.warn('\n⚠️  CRITICAL: Email service may not be available.');
            console.warn('   Forgot password feature will not work.');
            console.warn('   See DEPLOYMENT_EMAIL_FIX.md for troubleshooting.');
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

    const maxRetries = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let startTime = Date.now();
        
        try {
            console.log(`\n📧 Sending password reset email to ${to}`);
            console.log(`   Attempt ${attempt}/${maxRetries}...`);
            
            const info = await transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;
            
            console.log(`✅ Password reset email sent successfully!`);
            console.log(`   To: ${to}`);
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Duration: ${duration}ms`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;
            const duration = Date.now() - startTime;
            
            console.error(`\n❌ Email send attempt ${attempt}/${maxRetries} failed:`, {
                to,
                message: error.message,
                code: error.code,
                syscall: error.syscall,
                duration: `${duration}ms`,
            });

            // Don't retry on permanent errors (auth, invalid email, etc.)
            if (error.code === 'EAUTH') {
                console.error('🛑 Authentication error - Gmail credentials may be invalid');
                console.error('   Fix: Check EMAIL_USER and EMAIL_APP_PASSWORD on Render');
                throw new Error('Failed to send email: Invalid Gmail credentials.');
            }

            if (error.message && error.message.includes('Invalid email')) {
                console.error('🛑 Invalid email address');
                throw new Error('Failed to send email: Invalid email address.');
            }

            // Retry on temporary/network errors with increased delay
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1500; // 3s, 6s, 12s, 24s, 48s
                console.log(`⏳ Waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    console.error('\n🔴 FINAL ERROR: All retry attempts failed');
    console.error('   Error:', lastError.message);
    console.error('   Last error code:', lastError.code);
    
    // More helpful error message
    if (lastError.code === 'ETIMEDOUT') {
        throw new Error('Failed to send email: Connection timeout. Gmail SMTP may be unreachable on this network.');
    } else if (lastError.code === 'ENETUNREACH') {
        throw new Error('Failed to send email: Network unreachable. This may be a Render network issue.');
    } else {
        throw new Error(`Failed to send email after ${maxRetries} attempts: ${lastError.message}`);
    }
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

    const maxRetries = 5;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        let startTime = Date.now();
        
        try {
            console.log(`\n📧 Sending temp password email to ${to}`);
            console.log(`   Attempt ${attempt}/${maxRetries}...`);
            
            const info = await transporter.sendMail(mailOptions);
            const duration = Date.now() - startTime;
            
            console.log(`✅ Temp password email sent successfully!`);
            console.log(`   To: ${to}`);
            console.log(`   Message ID: ${info.messageId}`);
            console.log(`   Duration: ${duration}ms`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            lastError = error;
            const duration = Date.now() - startTime;
            
            console.error(`\n❌ Email send attempt ${attempt}/${maxRetries} failed:`, {
                to,
                message: error.message,
                code: error.code,
                syscall: error.syscall,
                duration: `${duration}ms`,
            });

            // Don't retry on permanent errors
            if (error.code === 'EAUTH') {
                console.error('🛑 Authentication error - Gmail credentials may be invalid');
                throw new Error('Failed to send email: Invalid Gmail credentials.');
            }

            if (error.message && error.message.includes('Invalid email')) {
                console.error('🛑 Invalid email address');
                throw new Error('Failed to send email: Invalid email address.');
            }

            // Retry on temporary/network errors
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 1500; // 3s, 6s, 12s, 24s, 48s
                console.log(`⏳ Waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // All retries failed
    console.error('\n🔴 FINAL ERROR: All retry attempts failed');
    console.error('   Error:', lastError.message);
    console.error('   Last error code:', lastError.code);
    
    if (lastError.code === 'ETIMEDOUT') {
        throw new Error('Failed to send email: Connection timeout. Gmail SMTP may be unreachable.');
    } else if (lastError.code === 'ENETUNREACH') {
        throw new Error('Failed to send email: Network unreachable. This may be a Render network issue.');
    } else {
        throw new Error(`Failed to send temp password email after ${maxRetries} attempts: ${lastError.message}`);
    }
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
