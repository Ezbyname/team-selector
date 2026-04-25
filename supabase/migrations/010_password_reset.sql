-- Migration 010: Password Reset System (Zero-cost)
-- Adds support for password reset via identity question or admin reset

-- Add password reset fields to auth_users
ALTER TABLE auth_users
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_reset_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_by UUID REFERENCES auth_users(id);

-- Password reset tokens table (short-lived, for identity question flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL, -- 15 minutes from creation
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset attempts (rate limiting)
CREATE TABLE IF NOT EXISTS password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT NOT NULL,
  attempt_type TEXT NOT NULL, -- 'identity_question' or 'admin_request'
  success BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup and rate limiting
CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_reset_attempts_phone_time ON password_reset_attempts(phone_normalized, created_at);

-- Cleanup function for expired reset tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE password_reset_tokens IS 'Short-lived tokens for password reset via identity question';
COMMENT ON TABLE password_reset_attempts IS 'Rate limiting and audit trail for password reset attempts';
COMMENT ON COLUMN auth_users.password_reset_required IS 'Set to true when admin resets user password';
COMMENT ON COLUMN auth_users.password_reset_by IS 'Which admin triggered the password reset';
