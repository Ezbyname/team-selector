-- Phase 2 Fix: Remove Star Player Logic Completely
-- Migration 007
-- Date: 2026-04-23

-- =====================================================
-- 1. REMOVE IS_STAR COLUMN FROM PLAYERS
-- =====================================================

ALTER TABLE players DROP COLUMN IF EXISTS is_star;

-- =====================================================
-- 2. UPDATE get_session_roster TO REMOVE IS_STAR
-- =====================================================

CREATE OR REPLACE FUNCTION get_session_roster(p_session_id UUID)
RETURNS TABLE (
  player_id UUID,
  player_name TEXT,
  player_position TEXT,
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

COMMENT ON FUNCTION get_session_roster IS 'Returns session roster with ratings only - star logic removed';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  -- Check is_star column removed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_star'
  ) THEN
    RAISE NOTICE 'SUCCESS: players.is_star column removed';
  END IF;

  -- Check function updated
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_session_roster') THEN
    RAISE NOTICE 'SUCCESS: get_session_roster function updated (no is_star)';
  END IF;
END $$;
