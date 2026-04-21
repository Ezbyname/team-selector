-- Team Selector v2 - Production Schema
-- Phase 1: Auth Foundation + Player Management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'sub_admin', 'user');
CREATE TYPE connection_type AS ENUM ('prefer_together', 'prefer_separate');
CREATE TYPE session_type AS ENUM ('permanent_group', 'temporary');
CREATE TYPE session_status AS ENUM ('pending', 'teams_generated', 'completed', 'cancelled');

-- =====================================================
-- AUTH TABLES
-- =====================================================

-- Custom auth_users table (Supabase Auth doesn't support phone+password)
CREATE TABLE auth_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  phone_normalized TEXT UNIQUE NOT NULL,  -- E.164 format: +972501234567
  password_hash TEXT NOT NULL,  -- bcrypt with cost 12
  role user_role NOT NULL DEFAULT 'user',
  phone_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP codes table (for signup verification)
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT NOT NULL,
  code TEXT NOT NULL,  -- 6 digits
  expires_at TIMESTAMPTZ NOT NULL,  -- 5 minutes from creation
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auth sessions table (for refresh tokens)
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYER MANAGEMENT TABLES
-- =====================================================

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_position INTEGER,  -- Basketball: 1=Guard, 2=Forward, 3=Center; Soccer: 1=Forward, 2=Midfielder, 3=Defender, 4=Goalkeeper
  is_star BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth_users(id),
  updated_by UUID REFERENCES auth_users(id),
  internal_rating DECIMAL(3,1) CHECK (internal_rating BETWEEN 1.0 AND 10.0),  -- Hidden, not exposed in MVP
  internal_metadata JSONB,  -- For future use (notes, preferences, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player connections (bidirectional)
CREATE TABLE player_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connection_type connection_type NOT NULL,
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_connection UNIQUE (player_a_id, player_b_id),
  CONSTRAINT different_players CHECK (player_a_id != player_b_id),
  CONSTRAINT ordered_pair CHECK (player_a_id < player_b_id)  -- Ensure A < B to prevent duplicates
);

-- User recent players (for fast field UX)
CREATE TABLE user_recent_players (
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, player_id)
);

-- =====================================================
-- PERMANENT GROUPS TABLES
-- =====================================================

-- Permanent groups
CREATE TABLE permanent_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport_type TEXT NOT NULL CHECK (sport_type IN ('basketball', 'soccer')),
  created_by UUID NOT NULL REFERENCES auth_users(id),
  updated_by UUID REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permanent group members (with roles)
CREATE TABLE permanent_group_members (
  group_id UUID NOT NULL REFERENCES permanent_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- =====================================================
-- GAME SESSIONS TABLES
-- =====================================================

-- Game sessions (unified for both permanent and temporary)
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_type session_type NOT NULL,
  permanent_group_id UUID REFERENCES permanent_groups(id) ON DELETE CASCADE,
  temp_game_name TEXT,
  sport_type TEXT NOT NULL CHECK (sport_type IN ('basketball', 'soccer')),
  target_team_size INTEGER NOT NULL CHECK (target_team_size BETWEEN 2 AND 11),
  status session_status NOT NULL DEFAULT 'pending',
  version INTEGER NOT NULL DEFAULT 0,  -- For optimistic locking
  created_by UUID NOT NULL REFERENCES auth_users(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT temp_game_requires_name CHECK (
    (session_type = 'temporary' AND temp_game_name IS NOT NULL) OR
    (session_type = 'permanent_group')
  ),
  CONSTRAINT permanent_requires_group CHECK (
    (session_type = 'permanent_group' AND permanent_group_id IS NOT NULL) OR
    (session_type = 'temporary')
  )
);

-- Game participants (who's playing this game)
CREATE TABLE game_participants (
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  attendance_status TEXT NOT NULL DEFAULT 'attending' CHECK (attendance_status IN ('attending', 'not_attending', 'maybe')),
  marked_by UUID NOT NULL REFERENCES auth_users(id),
  marked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (session_id, player_id)
);

-- Generated teams (result of team generation)
CREATE TABLE generated_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL CHECK (team_number IN (1, 2)),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_position INTEGER,  -- Actual position in this game (may differ from default)
  generated_by UUID NOT NULL REFERENCES auth_users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  algorithm_version TEXT NOT NULL,  -- e.g., "v1.2.2"
  CONSTRAINT unique_player_per_session UNIQUE (session_id, player_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Auth indexes
CREATE INDEX idx_auth_users_phone_normalized ON auth_users(phone_normalized);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone_normalized, expires_at);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(refresh_token);

-- Player indexes
CREATE INDEX idx_players_created_by ON players(created_by);
CREATE INDEX idx_player_connections_player_a ON player_connections(player_a_id);
CREATE INDEX idx_player_connections_player_b ON player_connections(player_b_id);
CREATE INDEX idx_user_recent_players_user ON user_recent_players(user_id, last_used_at DESC);

-- Group indexes
CREATE INDEX idx_permanent_groups_created_by ON permanent_groups(created_by);
CREATE INDEX idx_permanent_group_members_user ON permanent_group_members(user_id);

-- Session indexes
CREATE INDEX idx_game_sessions_created_by ON game_sessions(created_by);
CREATE INDEX idx_game_sessions_group ON game_sessions(permanent_group_id);
CREATE INDEX idx_game_sessions_expires ON game_sessions(expires_at);
CREATE INDEX idx_game_participants_session ON game_participants(session_id);
CREATE INDEX idx_generated_teams_session ON generated_teams(session_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Helper: Check if session allows attendance changes
CREATE OR REPLACE FUNCTION session_allows_attendance(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT status, expires_at INTO v_status, v_expires_at
  FROM game_sessions
  WHERE id = p_session_id;

  RETURN v_status IN ('pending', 'teams_generated')
    AND v_expires_at > NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recent_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE permanent_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE permanent_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_teams ENABLE ROW LEVEL SECURITY;

-- Auth Users: Only self can read/update
CREATE POLICY "Users can view their own profile"
  ON auth_users FOR SELECT
  USING (id = current_setting('app.user_id', true)::UUID);

CREATE POLICY "Users can update their own profile"
  ON auth_users FOR UPDATE
  USING (id = current_setting('app.user_id', true)::UUID);

-- OTP Codes: Only through API (no direct access)
CREATE POLICY "OTP codes are API-only"
  ON otp_codes FOR ALL
  USING (false);

-- Auth Sessions: Only own sessions
CREATE POLICY "Users can view their own sessions"
  ON auth_sessions FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);

-- Players: Everyone can read, creator/admin can update
CREATE POLICY "Players are viewable by all authenticated users"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Users can create players"
  ON players FOR INSERT
  WITH CHECK (created_by = current_setting('app.user_id', true)::UUID);

CREATE POLICY "Creators and admins can update players"
  ON players FOR UPDATE
  USING (
    created_by = current_setting('app.user_id', true)::UUID OR
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = current_setting('app.user_id', true)::UUID
        AND role = 'admin'
    )
  );

-- Player Connections: All can read, authenticated can create
CREATE POLICY "Connections are viewable by all"
  ON player_connections FOR SELECT
  USING (true);

CREATE POLICY "Users can create connections"
  ON player_connections FOR INSERT
  WITH CHECK (created_by = current_setting('app.user_id', true)::UUID);

-- User Recent Players: Only own recent players
CREATE POLICY "Users can view their own recent players"
  ON user_recent_players FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);

CREATE POLICY "Users can manage their own recent players"
  ON user_recent_players FOR ALL
  USING (user_id = current_setting('app.user_id', true)::UUID);

-- Permanent Groups: Members and admins can view
CREATE POLICY "Group members can view their groups"
  ON permanent_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM permanent_group_members
      WHERE group_id = permanent_groups.id
        AND user_id = current_setting('app.user_id', true)::UUID
    )
  );

CREATE POLICY "Users can create groups"
  ON permanent_groups FOR INSERT
  WITH CHECK (created_by = current_setting('app.user_id', true)::UUID);

CREATE POLICY "Group admins can update groups"
  ON permanent_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM permanent_group_members
      WHERE group_id = permanent_groups.id
        AND user_id = current_setting('app.user_id', true)::UUID
        AND role IN ('admin', 'sub_admin')
    )
  );

-- Game Sessions: Strict validation
CREATE POLICY "Users can view sessions they created or participate in"
  ON game_sessions FOR SELECT
  USING (
    created_by = current_setting('app.user_id', true)::UUID OR
    (session_type = 'permanent_group' AND EXISTS (
      SELECT 1 FROM permanent_group_members
      WHERE group_id = permanent_group_id
        AND user_id = current_setting('app.user_id', true)::UUID
    ))
  );

CREATE POLICY "Users can create sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (created_by = current_setting('app.user_id', true)::UUID);

CREATE POLICY "Session creators can update non-completed sessions"
  ON game_sessions FOR UPDATE
  USING (
    created_by = current_setting('app.user_id', true)::UUID
    AND status NOT IN ('completed', 'cancelled')
    AND expires_at > NOW()
  );

-- Game Participants: Strict attendance validation
CREATE POLICY "Participants can view session participants"
  ON game_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id
        AND (created_by = current_setting('app.user_id', true)::UUID OR
             (session_type = 'permanent_group' AND EXISTS (
               SELECT 1 FROM permanent_group_members
               WHERE group_id = permanent_group_id
                 AND user_id = current_setting('app.user_id', true)::UUID
             )))
    )
  );

CREATE POLICY "Users can mark attendance in pending sessions"
  ON game_participants FOR INSERT
  WITH CHECK (
    marked_by = current_setting('app.user_id', true)::UUID
    AND session_allows_attendance(session_id)
  );

CREATE POLICY "Users can update attendance in pending sessions"
  ON game_participants FOR UPDATE
  USING (session_allows_attendance(session_id));

-- Generated Teams: Read-only after creation
CREATE POLICY "Users can view generated teams"
  ON generated_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_sessions
      WHERE id = session_id
        AND (created_by = current_setting('app.user_id', true)::UUID OR
             (session_type = 'permanent_group' AND EXISTS (
               SELECT 1 FROM permanent_group_members
               WHERE group_id = permanent_group_id
                 AND user_id = current_setting('app.user_id', true)::UUID
             )))
    )
  );

-- =====================================================
-- ATOMIC TEAM GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_teams_atomic(
  p_session_id UUID,
  p_expected_version INTEGER,
  p_generated_by UUID,
  p_algorithm_version TEXT
) RETURNS TABLE (
  success BOOLEAN,
  new_version INTEGER,
  error_code TEXT
) AS $$
DECLARE
  v_current_version INTEGER;
  v_current_status session_status;
BEGIN
  -- Lock the session row (fail fast if locked by another transaction)
  SELECT version, status INTO v_current_version, v_current_status
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE NOWAIT;

  -- Check version (optimistic locking)
  IF v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, v_current_version, 'VERSION_CONFLICT'::TEXT;
    RETURN;
  END IF;

  -- Check status (must be pending or teams_generated)
  IF v_current_status NOT IN ('pending', 'teams_generated') THEN
    RETURN QUERY SELECT false, v_current_version, 'INVALID_STATUS'::TEXT;
    RETURN;
  END IF;

  -- Clear old teams if re-generating
  DELETE FROM generated_teams WHERE session_id = p_session_id;

  -- Update session status and increment version
  UPDATE game_sessions
  SET status = 'teams_generated',
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_session_id;

  -- Return success with new version
  RETURN QUERY SELECT true, v_current_version + 1, NULL::TEXT;

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is processing this session
    RETURN QUERY SELECT false, NULL::INTEGER, 'SESSION_LOCKED'::TEXT;
  WHEN OTHERS THEN
    -- Generic error
    RETURN QUERY SELECT false, NULL::INTEGER, 'INTERNAL_ERROR'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SESSION RESET FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION reset_session_teams(
  p_session_id UUID,
  p_user_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT
) AS $$
DECLARE
  v_status session_status;
  v_created_by UUID;
BEGIN
  -- Lock and validate
  SELECT status, created_by INTO v_status, v_created_by
  FROM game_sessions
  WHERE id = p_session_id
  FOR UPDATE NOWAIT;

  -- Only creator can reset
  IF v_created_by != p_user_id THEN
    RETURN QUERY SELECT false, 'UNAUTHORIZED'::TEXT;
    RETURN;
  END IF;

  -- Cannot reset completed/cancelled sessions
  IF v_status IN ('completed', 'cancelled') THEN
    RETURN QUERY SELECT false, 'SESSION_FINALIZED'::TEXT;
    RETURN;
  END IF;

  -- Clear teams and reset to pending
  DELETE FROM generated_teams WHERE session_id = p_session_id;

  UPDATE game_sessions
  SET status = 'pending',
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_session_id;

  RETURN QUERY SELECT true, NULL::TEXT;

EXCEPTION
  WHEN lock_not_available THEN
    RETURN QUERY SELECT false, 'SESSION_LOCKED'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, 'INTERNAL_ERROR'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CLEANUP FUNCTION (for expired sessions)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM game_sessions
    WHERE expires_at < NOW()
      AND status != 'completed'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL ADMIN USER (placeholder)
-- =====================================================

-- Insert placeholder admin (replace with your actual phone)
-- Password: "admin123" (hashed with bcrypt cost 12)
-- You'll update this with real credentials during deployment
INSERT INTO auth_users (phone, phone_normalized, password_hash, role, phone_verified_at)
VALUES (
  '050-123-4567',
  '+972501234567',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ND/qhc6bGwIq',  -- "admin123"
  'admin',
  NOW()
);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE auth_users IS 'Custom authentication - phone+password with OTP verification at signup';
COMMENT ON TABLE otp_codes IS 'Temporary OTP codes for phone verification (5-minute expiry)';
COMMENT ON TABLE players IS 'Player profiles with internal ratings (hidden in MVP)';
COMMENT ON TABLE player_connections IS 'Bidirectional connections - prefer_together or prefer_separate';
COMMENT ON TABLE game_sessions IS 'Unified table for both permanent group games and temporary games';
COMMENT ON COLUMN game_sessions.version IS 'Optimistic locking - increments on each update';
COMMENT ON FUNCTION generate_teams_atomic IS 'Atomic team generation with version checking and session locking';
