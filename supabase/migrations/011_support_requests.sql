-- Migration 011: Support Requests Table
-- In-app support contact system (zero-cost)

CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  user_info JSONB, -- Auto-attached: phone, groups, roles
  context TEXT, -- Failure context (e.g., "password_reset_failed")
  ip_address TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for admin support dashboard
CREATE INDEX IF NOT EXISTS idx_support_status_created ON support_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_user ON support_requests(user_id);

COMMENT ON TABLE support_requests IS 'In-app support contact form submissions';
COMMENT ON COLUMN support_requests.user_info IS 'Auto-attached user context: phone, groups, roles';
COMMENT ON COLUMN support_requests.context IS 'Context from which support was requested (e.g., password_reset_failed)';
