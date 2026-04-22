-- Phase 2: Visibility Rules and Player Connections
-- Migration 005
-- Date: 2026-04-23

-- =====================================================
-- 1. ADD IS_STAR COLUMN TO PLAYERS
-- =====================================================

ALTER TABLE players ADD COLUMN IF NOT EXISTS is_star BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_players_is_star ON players(is_star) WHERE is_star = true;

COMMENT ON COLUMN players.is_star IS 'Star player designation - visible only to admin/sub_admin';

-- =====================================================
-- 2. CREATE PLAYER_CONNECTIONS TABLE
-- =====================================================

-- Connection type enum
DO $$ BEGIN
  CREATE TYPE connection_type AS ENUM ('prefer_together', 'prefer_separate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS player_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_b_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  connection_type connection_type NOT NULL DEFAULT 'prefer_together',
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_connection UNIQUE (player_a_id, player_b_id),
  CONSTRAINT different_players CHECK (player_a_id != player_b_id),
  CONSTRAINT ordered_pair CHECK (player_a_id < player_b_id),
  -- Ensure both players are from same group
  CONSTRAINT same_group_connection CHECK (
    (SELECT group_id FROM players WHERE id = player_a_id) =
    (SELECT group_id FROM players WHERE id = player_b_id)
  )
);

CREATE INDEX idx_player_connections_a ON player_connections(player_a_id);
CREATE INDEX idx_player_connections_b ON player_connections(player_b_id);

COMMENT ON TABLE player_connections IS 'Player connection preferences (together/separate) - bidirectional';

-- =====================================================
-- 3. RLS POLICIES FOR PLAYER_CONNECTIONS
-- =====================================================

ALTER TABLE player_connections ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view connections
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

-- All authenticated users can delete connections they created
CREATE POLICY "creator_delete_connections" ON player_connections
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid() AND role IN ('admin', 'sub_admin')
    )
  );

-- =====================================================
-- 4. UPDATE get_session_roster TO INCLUDE IS_STAR
-- =====================================================

CREATE OR REPLACE FUNCTION get_session_roster(p_session_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  player_position TEXT,
  default_rating INTEGER,
  final_rating INTEGER,
  grader_count BIGINT,
  is_star BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.position,
    p.default_rating,
    get_player_final_rating(p.id) AS final_rating,
    COUNT(pr.id) AS grader_count,
    p.is_star
  FROM session_players sp
  JOIN players p ON sp.player_id = p.id
  LEFT JOIN player_ratings pr ON pr.player_id = p.id
  WHERE sp.session_id = p_session_id
  GROUP BY p.id, p.name, p.position, p.default_rating, p.is_star
  ORDER BY p.name;
END;
$$;

-- =====================================================
-- 5. HELPER FUNCTION: GET PLAYER CONNECTIONS
-- =====================================================

-- Get all connections for players in a session
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
  SELECT
    pc.player_a_id,
    pc.player_b_id,
    pc.connection_type
  FROM player_connections pc
  WHERE EXISTS (
    SELECT 1 FROM session_players sp
    WHERE sp.session_id = p_session_id
    AND sp.player_id IN (pc.player_a_id, pc.player_b_id)
  )
  -- Only return connections where BOTH players are in the session
  AND EXISTS (
    SELECT 1 FROM session_players sp1
    WHERE sp1.session_id = p_session_id AND sp1.player_id = pc.player_a_id
  )
  AND EXISTS (
    SELECT 1 FROM session_players sp2
    WHERE sp2.session_id = p_session_id AND sp2.player_id = pc.player_b_id
  );
END;
$$;

-- =====================================================
-- 6. HELPER FUNCTION: GET PLAYER CONNECTIONS BY GROUP
-- =====================================================

CREATE OR REPLACE FUNCTION get_group_connections(p_group_id UUID)
RETURNS TABLE (
  player_a_id UUID,
  player_a_name TEXT,
  player_b_id UUID,
  player_b_name TEXT,
  connection_type connection_type
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.player_a_id,
    pa.name AS player_a_name,
    pc.player_b_id,
    pb.name AS player_b_name,
    pc.connection_type
  FROM player_connections pc
  JOIN players pa ON pc.player_a_id = pa.id
  JOIN players pb ON pc.player_b_id = pb.id
  WHERE pa.group_id = p_group_id;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  -- Check is_star column added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_star'
  ) THEN
    RAISE NOTICE 'SUCCESS: players.is_star column added';
  END IF;

  -- Check player_connections table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_connections') THEN
    RAISE NOTICE 'SUCCESS: player_connections table created';
  END IF;

  -- Check functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_session_connections') THEN
    RAISE NOTICE 'SUCCESS: get_session_connections function created';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_group_connections') THEN
    RAISE NOTICE 'SUCCESS: get_group_connections function created';
  END IF;
END $$;
