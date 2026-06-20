// Rate Limiting Middleware
// Protects against brute-force attacks on auth endpoints

const rateLimit = require('express-rate-limit');

// Rate limiter for forgot password requests
// Max 5 requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many password reset requests. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for login attempts
// Max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        message: 'Too many login attempts. Please try again after 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for OTP verification
// Max 5 attempts per 15 minutes per IP (prevent brute-forcing OTPs)
const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        message: 'Too many reset attempts. Please request a new code and try again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    forgotPasswordLimiter,
    loginLimiter,
    resetPasswordLimiter,
};
