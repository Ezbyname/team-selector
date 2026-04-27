/**
 * POST /api/groups/update
 * Update group details
 * Requires: Authenticated user (must be group creator or admin)
 */

import { supabase } from '../supabase.js';
import { requireAuth } from '../permissions.js';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { groupId, name, recurringDay, recurringTime } = req.body;

  // Validation
  if (!groupId) {
    return res.status(400).json({ error: 'groupId is required' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  // Validate recurring day if provided
  const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (recurringDay && !validDays.includes(recurringDay)) {
    return res.status(400).json({ error: 'Invalid recurring day' });
  }

  // Validate recurring time format if provided (HH:MM)
  if (recurringTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(recurringTime)) {
    return res.status(400).json({ error: 'Invalid time format. Use HH:MM (e.g., 18:30)' });
  }

  try {
    // Check if group exists and user has permission
    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('id, created_by')
      .eq('id', groupId)
      .single();

    if (fetchError || !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check permission (creator or admin)
    if (group.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to edit this group' });
    }

    // Update groups table
    const { error: updateError } = await supabase
      .from('groups')
      .update({
        name: name.trim(),
        recurring_day: recurringDay || null,
        recurring_time: recurringTime || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    if (updateError) {
      console.error('Failed to update group:', updateError);
      return res.status(500).json({ error: 'Failed to update group' });
    }

    // Also update permanent_groups
    await supabase
      .from('permanent_groups')
      .update({
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', groupId);

    return res.status(200).json({
      success: true,
      group: {
        id: groupId,
        name: name.trim(),
        recurringDay: recurringDay || null,
        recurringTime: recurringTime || null
      }
    });
  } catch (error) {
    console.error('Update group error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);
