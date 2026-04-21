-- Phase 3: Admin/Sub-Admin/Player Grading System
-- Migration 003
-- Date: 2026-04-22

-- =====================================================
-- 1. ADD GRADING PERMISSION TO AUTH_USERS
-- =====================================================

-- Add boolean column for grading permission (NOT JSONB)
ALTER TABLE auth_users
ADD COLUMN can_grade_players BOOLEAN DEFAULT false;

-- Index for permission queries
CREATE INDEX idx_auth_users_can_grade ON auth_users(can_grade_players) WHERE can_grade_players = true;

-- =====================================================
-- 2. PLAYER RATINGS TABLE
-- =====================================================

-- Each grader submits their own rating
-- Final grade is calculated (average + ceiling)
CREATE TABLE player_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  sport TEXT NOT NULL CHECK (sport IN ('basketball', 'soccer')),
  position TEXT,

  -- Single grade field (INTEGER 1-10, no decimals)
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 10),

  -- Grader info
  graded_by UUID NOT NULL REFERENCES auth_users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each grader can only have ONE rating per player/sport
  UNIQUE(player_name, sport, graded_by)
);

-- Indexes
CREATE INDEX idx_player_ratings_player ON player_ratings(player_name, sport);
CREATE INDEX idx_player_ratings_grader ON player_ratings(graded_by);
CREATE INDEX idx_player_ratings_sport ON player_ratings(sport);

-- =====================================================
-- 3. RLS POLICIES FOR PLAYER_RATINGS
-- =====================================================

ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: View ratings
-- Only admin OR users with can_grade_players = true
CREATE POLICY "authorized_view_ratings" ON player_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR can_grade_players = true
      )
    )
  );

-- Policy: Insert/Update ratings
-- Only admin OR users with can_grade_players = true
CREATE POLICY "authorized_manage_ratings" ON player_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR can_grade_players = true
      )
    )
  );

-- =====================================================
-- 4. ADMIN ACTIONS AUDIT LOG
-- =====================================================

CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth_users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'create_sub_admin',
    'revoke_sub_admin',
    'grant_grading_permission',
    'revoke_grading_permission',
    'grade_player'
  )),
  target_user_id UUID REFERENCES auth_users(id),
  target_player_name TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_created ON admin_actions(created_at DESC);

-- RLS: Only admins can view audit log
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_view_audit_log" ON admin_actions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth_users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- 5. HELPER FUNCTION: CALCULATE FINAL GRADE
-- =====================================================

-- Function to calculate final grade for a player
-- Average of all grades, rounded UP (ceiling)
CREATE OR REPLACE FUNCTION calculate_final_grade(
  p_player_name TEXT,
  p_sport TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_average NUMERIC;
  v_final INTEGER;
BEGIN
  -- Calculate average of all grades for this player/sport
  SELECT AVG(grade)::NUMERIC
  INTO v_average
  FROM player_ratings
  WHERE player_name = p_player_name
    AND sport = p_sport;

  -- If no grades, return NULL
  IF v_average IS NULL THEN
    RETURN NULL;
  END IF;

  -- Round UP to nearest integer (ceiling)
  v_final := CEIL(v_average);

  RETURN v_final;
END;
$$;

-- =====================================================
-- 6. VIEW: PLAYER FINAL GRADES
-- =====================================================

-- View showing final calculated grades
CREATE OR REPLACE VIEW player_final_grades AS
SELECT
  player_name,
  sport,
  position,
  calculate_final_grade(player_name, sport) AS final_grade,
  COUNT(DISTINCT graded_by) AS grader_count,
  ARRAY_AGG(grade ORDER BY grade) AS all_grades,
  MAX(updated_at) AS last_updated
FROM player_ratings
GROUP BY player_name, sport, position;

-- Grant select on view to authenticated users with permission
ALTER VIEW player_final_grades OWNER TO postgres;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration
DO $$
BEGIN
  -- Check column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auth_users'
    AND column_name = 'can_grade_players'
  ) THEN
    RAISE NOTICE 'SUCCESS: can_grade_players column added';
  END IF;

  -- Check table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'player_ratings'
  ) THEN
    RAISE NOTICE 'SUCCESS: player_ratings table created';
  END IF;

  -- Check function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'calculate_final_grade'
  ) THEN
    RAISE NOTICE 'SUCCESS: calculate_final_grade function created';
  END IF;
END $$;
