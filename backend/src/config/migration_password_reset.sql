-- Migration: Password Reset Tokens table + force_password_change flag
-- Run this migration against your Neon PostgreSQL database

-- Table to store password reset OTP tokens
-- Tokens are hashed with bcrypt (never stored in plaintext)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expiry ON password_reset_tokens(expires_at);

-- Add force_password_change flag to users table (for admin-initiated resets)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;

SELECT 'Migration completed! password_reset_tokens table created and force_password_change column added.' as status;
