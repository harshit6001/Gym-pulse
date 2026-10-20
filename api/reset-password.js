import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { token, newPassword } = req.body || {};
    const cleanToken = (token || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanToken) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
    }

    const nowIso = new Date().toISOString();
    const nowTime = Date.now();

    // 1. Check in Members table
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, name, email, reset_token, reset_token_expires_at')
      .eq('reset_token', cleanToken)
      .limit(1)
      .maybeSingle();

    if (!memberErr && member) {
      const expires = member.reset_token_expires_at ? new Date(member.reset_token_expires_at).getTime() : 0;
      if (expires && expires < nowTime) {
        return res.status(400).json({ error: 'Password reset link has expired. Please request a new one.' });
      }

      const { error: updateErr } = await supabase
        .from('members')
        .update({
          password: cleanPass,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: nowIso
        })
        .eq('id', member.id);

      if (updateErr) {
        return res.status(500).json({ error: 'Failed to update member password in database.' });
      }

      return res.status(200).json({
        success: true,
        role: 'member',
        name: member.name,
        message: `Password updated successfully for ${member.name}! You can now log in.`
      });
    }

    // 2. Check in Gyms (Owner) table
    const { data: gym, error: gymErr } = await supabase
      .from('gyms')
      .select('id, gym_name, owner_name, reset_token, reset_token_expires_at')
      .eq('reset_token', cleanToken)
      .limit(1)
      .maybeSingle();

    if (!gymErr && gym) {
      const expires = gym.reset_token_expires_at ? new Date(gym.reset_token_expires_at).getTime() : 0;
      if (expires && expires < nowTime) {
        return res.status(400).json({ error: 'Password reset link has expired. Please request a new one.' });
      }

      const { error: updateErr } = await supabase
        .from('gyms')
        .update({
          owner_password: cleanPass,
          temp_password: null,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: nowIso
        })
        .eq('id', gym.id);

      if (updateErr) {
        return res.status(500).json({ error: 'Failed to update owner password in database.' });
      }

      return res.status(200).json({
        success: true,
        role: 'owner',
        name: gym.owner_name || gym.gym_name,
        message: `Password updated successfully for ${gym.gym_name}! You can now log in.`
      });
    }

    return res.status(400).json({
      error: 'Invalid or expired password reset link. Please request a new one.'
    });
  } catch (err) {
    console.error('Reset password API exception:', err);
    return res.status(500).json({ error: 'Server error updating password.' });
  }
}
