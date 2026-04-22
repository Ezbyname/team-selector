-- Phase 4: Safe Repair Migration for Groups, Players, Sessions
-- This migration can be run safely even if some objects already exist
-- Uses IF NOT EXISTS checks to handle partial deployment state

-- =====================================================
-- 1. GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (safe if exists)
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_sport ON groups(sport);

-- =====================================================
-- 2. PLAYERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  default_rating INTEGER DEFAULT 5 CHECK (default_rating >= 1 AND default_rating <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_group ON players(group_id);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(default_rating);

-- =====================================================
-- 3. GAME SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_by UUID NOT NULL REFERENCES auth_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_group ON game_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON game_sessions(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON game_sessions(status);

-- =====================================================
-- 4. SESSION PLAYERS (SELECTED ROSTER)
-- =====================================================

CREATE TABLE IF NOT EXISTS session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_player ON session_players(player_id);

-- =====================================================
-- 5. UPDATE PLAYER_RATINGS FOR NEW MODEL
-- =====================================================

-- Add player_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE player_ratings ADD COLUMN player_id UUID REFERENCES players(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added player_id column to player_ratings';
  ELSE
    RAISE NOTICE 'player_id column already exists in player_ratings';
  END IF;
END $$;

-- Create index for player_id lookups
CREATE INDEX IF NOT EXISTS idx_player_ratings_player_id ON player_ratings(player_id);

-- Make player_name and sport nullable if not already
DO $$
BEGIN
  -- Check if player_name is still NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings'
      AND column_name = 'player_name'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_ratings ALTER COLUMN player_name DROP NOT NULL;
    RAISE NOTICE 'Made player_name nullable in player_ratings';
  END IF;

  -- Check if sport is still NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings'
      AND column_name = 'sport'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE player_ratings ALTER COLUMN sport DROP NOT NULL;
    RAISE NOTICE 'Made sport nullable in player_ratings';
  END IF;
END $$;

-- Create unique index for player-based ratings (safe if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'player_ratings_player_grader_unique'
  ) THEN
    CREATE UNIQUE INDEX player_ratings_player_grader_unique
      ON player_ratings(player_id, graded_by)
      WHERE player_id IS NOT NULL;
    RAISE NOTICE 'Created unique index for player-based ratings';
  ELSE
    RAISE NOTICE 'Unique index player_ratings_player_grader_unique already exists';
  END IF;
END $$;

-- =====================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- GROUPS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "authenticated_view_groups" ON groups;
CREATE POLICY "authenticated_view_groups" ON groups
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "authenticated_create_groups" ON groups;
CREATE POLICY "authenticated_create_groups" ON groups
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "creator_update_groups" ON groups;
CREATE POLICY "creator_update_groups" ON groups
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_delete_groups" ON groups;
CREATE POLICY "admin_delete_groups" ON groups
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- PLAYERS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_view_players" ON players;
CREATE POLICY "authenticated_view_players" ON players
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "authenticated_manage_players" ON players;
CREATE POLICY "authenticated_manage_players" ON players
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- GAME SESSIONS
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_view_sessions" ON game_sessions;
CREATE POLICY "authenticated_view_sessions" ON game_sessions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "authenticated_create_sessions" ON game_sessions;
CREATE POLICY "authenticated_create_sessions" ON game_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS "authenticated_manage_sessions" ON game_sessions;
CREATE POLICY "authenticated_manage_sessions" ON game_sessions
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- SESSION PLAYERS
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_session_players" ON session_players;
CREATE POLICY "authenticated_manage_session_players" ON session_players
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM auth_users WHERE id = auth.uid())
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to get player's final rating (CREATE OR REPLACE = safe)
CREATE OR REPLACE FUNCTION get_player_final_rating(p_player_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_average NUMERIC;
  v_final INTEGER;
  v_default INTEGER;
BEGIN
  -- Get default rating
  SELECT default_rating INTO v_default
  FROM players
  WHERE id = p_player_id;

  -- Calculate average of all grades for this player
  SELECT AVG(grade)::NUMERIC
  INTO v_average
  FROM player_ratings
  WHERE player_id = p_player_id;

  -- If no grades, return default rating
  IF v_average IS NULL THEN
    RETURN v_default;
  END IF;

  -- Round UP to nearest integer (ceiling)
  v_final := CEIL(v_average);

  RETURN v_final;
END;
$$;

-- Function to get session roster
CREATE OR REPLACE FUNCTION get_session_roster(p_session_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  position TEXT,
  default_rating INTEGER,
  final_rating INTEGER,
  grader_count BIGINT
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
    COUNT(pr.id) AS grader_count
  FROM session_players sp
  JOIN players p ON sp.player_id = p.id
  LEFT JOIN player_ratings pr ON pr.player_id = p.id
  WHERE sp.session_id = p_session_id
  GROUP BY p.id, p.name, p.position, p.default_rating
  ORDER BY p.name;
END;
$$;

-- =====================================================
-- 8. VIEWS
-- =====================================================

-- View: Groups with player counts (CREATE OR REPLACE = safe)
CREATE OR REPLACE VIEW group_stats AS
SELECT
  g.id,
  g.name,
  g.location,
  g.sport,
  g.created_by,
  COUNT(DISTINCT p.id) AS player_count,
  COUNT(DISTINCT gs.id) AS session_count,
  g.created_at,
  g.updated_at
FROM groups g
LEFT JOIN players p ON p.group_id = g.id
LEFT JOIN game_sessions gs ON gs.group_id = g.id
GROUP BY g.id, g.name, g.location, g.sport, g.created_by, g.created_at, g.updated_at;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  -- Check tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groups') THEN
    RAISE NOTICE '✓ SUCCESS: groups table ready';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
    RAISE NOTICE '✓ SUCCESS: players table ready';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_sessions') THEN
    RAISE NOTICE '✓ SUCCESS: game_sessions table ready';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_players') THEN
    RAISE NOTICE '✓ SUCCESS: session_players table ready';
  END IF;

  -- Check column added
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_ratings' AND column_name = 'player_id'
  ) THEN
    RAISE NOTICE '✓ SUCCESS: player_ratings.player_id column ready';
  END IF;

  -- Check functions exist
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_player_final_rating') THEN
    RAISE NOTICE '✓ SUCCESS: get_player_final_rating function ready';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_session_roster') THEN
    RAISE NOTICE '✓ SUCCESS: get_session_roster function ready';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✓✓✓ PHASE 4 MIGRATION COMPLETE ✓✓✓';
  RAISE NOTICE '';
END $$;
