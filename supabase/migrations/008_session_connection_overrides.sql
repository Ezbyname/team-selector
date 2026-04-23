-- Phase 2 Fix: Session-Level Connection Overrides
-- Migration 008
-- Date: 2026-04-23

-- =====================================================
-- 1. CREATE SESSION_CONNECTIONS TABLE
-- =====================================================

-- Session-specific connection overrides
-- These override group-level defaults for a specific session
CREATE TABLE session_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connected_to_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connection_type connection_type NOT NULL DEFAULT 'prefer_together',
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_players_session CHECK (player_id != connected_to_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_session_connections_session ON session_connections(session_id);
CREATE INDEX idx_session_connections_player ON session_connections(player_id);
CREATE INDEX idx_session_connections_connected_to ON session_connections(connected_to_id);

-- Unique constraint: one player can't have duplicate connections to same player in same session
CREATE UNIQUE INDEX session_connections_unique ON session_connections(session_id, player_id, connected_to_id);

COMMENT ON TABLE session_connections IS 'Session-specific connection overrides - do not affect group defaults';

-- =====================================================
-- 2. RLS POLICIES
-- =====================================================

ALTER TABLE session_connections ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view session connections
CREATE POLICY "authenticated_view_session_connections" ON session_connections
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- All authenticated users can create session connections
CREATE POLICY "authenticated_create_session_connections" ON session_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- All authenticated users can delete session connections
CREATE POLICY "authenticated_delete_session_connections" ON session_connections
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- =====================================================
-- 3. UPDATE get_session_connections TO USE OVERRIDES
-- =====================================================

-- Get connections for a session
-- Priority: session-level overrides > group-level defaults
CREATE OR REPLACE FUNCTION get_session_connections(p_session_id UUID)
RETURNS TABLE (
  player_a_id UUID,
  player_b_id UUID,
  connection_type connection_type,
  source TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- First, get session-specific overrides (highest priority)
  SELECT DISTINCT
    sc.player_id AS player_a_id,
    sc.connected_to_id AS player_b_id,
    sc.connection_type,
    'session'::TEXT AS source
  FROM session_connections sc
  WHERE sc.session_id = p_session_id
  -- Only include if both players are in the session
  AND EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = sc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = sc.connected_to_id
  )

  UNION

  -- Then, get group-level defaults (lower priority)
  -- But EXCLUDE any pairs that have session-specific overrides
  SELECT DISTINCT
    pc.player_id AS player_a_id,
    pc.connected_to_id AS player_b_id,
    pc.connection_type,
    'group'::TEXT AS source
  FROM player_connections pc
  JOIN game_sessions gs ON gs.id = p_session_id
  WHERE pc.group_id = gs.group_id
  -- Only include if both players are in the session
  AND EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = pc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = pc.connected_to_id
  )
  -- Exclude if there's a session-specific override for this pair
  AND NOT EXISTS (
    SELECT 1 FROM session_connections sc
    WHERE sc.session_id = p_session_id
    AND (
      (sc.player_id = pc.player_id AND sc.connected_to_id = pc.connected_to_id)
      OR
      (sc.player_id = pc.connected_to_id AND sc.connected_to_id = pc.player_id)
    )
  )

  UNION

  -- Add reverse direction to make graph bidirectional for balancer
  SELECT DISTINCT
    sc.connected_to_id AS player_a_id,
    sc.player_id AS player_b_id,
    sc.connection_type,
    'session'::TEXT AS source
  FROM session_connections sc
  WHERE sc.session_id = p_session_id
  AND EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = sc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = sc.connected_to_id
  )

  UNION

  SELECT DISTINCT
    pc.connected_to_id AS player_a_id,
    pc.player_id AS player_b_id,
    pc.connection_type,
    'group'::TEXT AS source
  FROM player_connections pc
  JOIN game_sessions gs ON gs.id = p_session_id
  WHERE pc.group_id = gs.group_id
  AND EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = pc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = pc.connected_to_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM session_connections sc
    WHERE sc.session_id = p_session_id
    AND (
      (sc.player_id = pc.player_id AND sc.connected_to_id = pc.connected_to_id)
      OR
      (sc.player_id = pc.connected_to_id AND sc.connected_to_id = pc.player_id)
    )
  );
END;
$$;

COMMENT ON FUNCTION get_session_connections IS 'Returns connection graph with session overrides taking priority over group defaults';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  -- Check session_connections table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_connections') THEN
    RAISE NOTICE 'SUCCESS: session_connections table created';
  END IF;

  -- Check function updated
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_session_connections') THEN
    RAISE NOTICE 'SUCCESS: get_session_connections function updated with override logic';
  END IF;
END $$;
