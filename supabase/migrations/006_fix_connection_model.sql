-- Phase 2 Fix: Update Connection Model to Operator-Defined
-- Migration 006
-- Date: 2026-04-23

-- =====================================================
-- 1. DROP OLD BIDIRECTIONAL CONNECTION TABLE
-- =====================================================

DROP TABLE IF EXISTS player_connections CASCADE;

-- =====================================================
-- 2. CREATE NEW OPERATOR-DEFINED CONNECTION TABLE
-- =====================================================

-- Connection type enum (keep for future use, but only use prefer_together for now)
DO $$ BEGIN
  CREATE TYPE connection_type AS ENUM ('prefer_together', 'prefer_separate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- New table: operator defines which players should stay together
-- No mutual consent needed, no bidirectional constraint
CREATE TABLE player_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connected_to_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connection_type connection_type NOT NULL DEFAULT 'prefer_together',
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT different_players CHECK (player_id != connected_to_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_player_connections_group ON player_connections(group_id);
CREATE INDEX idx_player_connections_player ON player_connections(player_id);
CREATE INDEX idx_player_connections_connected_to ON player_connections(connected_to_id);

-- Unique constraint: one player can't have duplicate connections to same player
CREATE UNIQUE INDEX player_connections_unique ON player_connections(player_id, connected_to_id);

COMMENT ON TABLE player_connections IS 'Operator-defined player connections - unidirectional, no mutual consent needed';

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE player_connections ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view connections in their groups
CREATE POLICY "authenticated_view_connections" ON player_connections
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- All authenticated users can create connections
CREATE POLICY "authenticated_create_connections" ON player_connections
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- All authenticated users can delete connections
CREATE POLICY "authenticated_delete_connections" ON player_connections
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- =====================================================
-- 4. HELPER FUNCTION: GET CONNECTIONS FOR SESSION
-- =====================================================

-- Get all connections for players in a session
-- Returns both directions of the connection graph
CREATE OR REPLACE FUNCTION get_session_connections(p_session_id UUID)
RETURNS TABLE (
  player_a_id UUID,
  player_b_id UUID,
  connection_type connection_type
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  -- Get direct connections where both players are in session
  SELECT DISTINCT
    pc.player_id AS player_a_id,
    pc.connected_to_id AS player_b_id,
    pc.connection_type
  FROM player_connections pc
  WHERE EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = pc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = pc.connected_to_id
  )

  UNION

  -- Add reverse direction to make graph bidirectional for balancer
  SELECT DISTINCT
    pc.connected_to_id AS player_a_id,
    pc.player_id AS player_b_id,
    pc.connection_type
  FROM player_connections pc
  WHERE EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id AND sp.player_id = pc.player_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = pc.connected_to_id
  );
END;
$$;

COMMENT ON FUNCTION get_session_connections IS 'Returns bidirectional connection graph for balancer - only includes players in session';

-- =====================================================
-- 5. HELPER FUNCTION: GET CONNECTIONS FOR GROUP
-- =====================================================

CREATE OR REPLACE FUNCTION get_group_connections(p_group_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  connected_to_id UUID,
  connected_to_name TEXT,
  connection_type connection_type
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.player_id,
    p1.name AS player_name,
    pc.connected_to_id,
    p2.name AS connected_to_name,
    pc.connection_type
  FROM player_connections pc
  JOIN players p1 ON pc.player_id = p1.id
  JOIN players p2 ON pc.connected_to_id = p2.id
  WHERE pc.group_id = p_group_id
  ORDER BY p1.name, p2.name;
END;
$$;

COMMENT ON FUNCTION get_group_connections IS 'Returns all connections for a group with player names';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  -- Check player_connections table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_connections') THEN
    RAISE NOTICE 'SUCCESS: player_connections table created';
  END IF;

  -- Check functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_session_connections') THEN
    RAISE NOTICE 'SUCCESS: get_session_connections function updated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_group_connections') THEN
    RAISE NOTICE 'SUCCESS: get_group_connections function updated';
  END IF;
END $$;
