-- Add function to get connection group information for players
-- This helps the frontend display connection groups without inference

-- Function to get connection group ID and count for a player
CREATE OR REPLACE FUNCTION get_player_connection_info(
  p_player_id UUID,
  p_group_id UUID
)
RETURNS TABLE (
  connection_group_id UUID,
  connection_count INTEGER,
  connected_player_ids UUID[]
) AS $$
BEGIN
  -- Use BFS to find all connected players
  WITH RECURSIVE connected_players AS (
    -- Start with the target player
    SELECT p_player_id AS player_id, 0 AS depth

    UNION

    -- Find all directly connected players (both directions)
    SELECT
      CASE
        WHEN pc.player_id = cp.player_id THEN pc.connected_to_id
        ELSE pc.player_id
      END AS player_id,
      cp.depth + 1
    FROM connected_players cp
    JOIN player_connections pc ON (
      (pc.player_id = cp.player_id OR pc.connected_to_id = cp.player_id)
      AND pc.group_id = p_group_id
    )
    WHERE cp.depth < 20 -- Prevent infinite loops
  ),
  unique_connected AS (
    SELECT DISTINCT player_id
    FROM connected_players
    WHERE player_id != p_player_id
  ),
  sorted_group AS (
    SELECT array_agg(player_id ORDER BY player_id) AS player_ids
    FROM (
      SELECT p_player_id AS player_id
      UNION
      SELECT player_id FROM unique_connected
    ) all_players
  )
  SELECT
    -- Generate deterministic group ID from sorted player IDs
    md5(array_to_string((SELECT player_ids FROM sorted_group), ','))::uuid AS connection_group_id,
    (SELECT COUNT(*) FROM unique_connected) AS connection_count,
    (SELECT player_ids FROM sorted_group) AS connected_player_ids;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_player_connection_info IS
'Returns connection group ID, count of connections, and array of all player IDs in the connection group (including self)';
