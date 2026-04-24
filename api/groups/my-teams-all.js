/**
 * Get ALL user's teams (no sport filter)
 * GET /api/groups/my-teams-all
 *
 * Used for:
 * - Resume logic (find last team)
 * - Empty state detection
 * - Dashboard overview
 */

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const jwtSecret = process.env.JWT_SECRET;

if (!supabaseUrl || !supabaseKey || !jwtSecret) {
  throw new Error('Missing required environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Get ALL teams where user is the creator (admin)
    const { data: ownedTeams, error: ownedError } = await supabase
      .from('groups')
      .select('id, name, sport, created_at, created_by')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned teams:', ownedError);
      return res.status(500).json({ error: 'Failed to load teams' });
    }

    // Get ALL teams where user is a member
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        joined_at,
        groups:group_id (
          id,
          name,
          sport,
          created_at,
          created_by
        )
      `)
      .eq('user_id', userId);

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
      return res.status(500).json({ error: 'Failed to load teams' });
    }

    // Filter memberships and exclude teams user owns
    const memberTeams = memberships
      .filter(m => m.groups && m.groups.created_by !== userId)
      .map(m => ({
        ...m.groups,
        memberRole: m.role,
        joinedAt: m.joined_at
      }));

    // Combine owned teams (with admin role) and member teams
    const allTeams = [
      ...ownedTeams.map(team => ({
        ...team,
        role: 'admin',
        isOwner: true
      })),
      ...memberTeams.map(team => ({
        ...team,
        role: team.memberRole,
        isOwner: false
      }))
    ];

    // Get member counts and session counts for each team
    const teamsWithStats = await Promise.all(
      allTeams.map(async (team) => {
        // Get member count
        const { count: memberCount } = await supabase
          .from('group_members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', team.id);

        // Get session count
        const { count: sessionCount } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', team.id);

        return {
          id: team.id,
          name: team.name,
          sport: team.sport,
          role: team.role,
          isOwner: team.isOwner,
          memberCount: (memberCount || 0) + 1, // +1 for owner
          sessionCount: sessionCount || 0,
          createdAt: team.created_at
        };
      })
    );

    // Group by sport for easy filtering
    const teamsBySport = {
      basketball: teamsWithStats.filter(t => t.sport === 'basketball'),
      soccer: teamsWithStats.filter(t => t.sport === 'soccer')
    };

    return res.status(200).json({
      success: true,
      totalTeams: teamsWithStats.length,
      teams: teamsWithStats,
      teamsBySport,
      stats: {
        basketball: teamsBySport.basketball.length,
        soccer: teamsBySport.soccer.length
      }
    });

  } catch (error) {
    console.error('Error in my-teams-all:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
