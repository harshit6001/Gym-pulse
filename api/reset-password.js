import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizePhone(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(-10);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ── 1. GET: Verify Token Validity ─────────────
  if (req.method === 'GET') {
    try {
      const rawToken = req.query.token;
      const token = (rawToken || '').trim();

      if (!token || token.length < 10) {
        return res.status(400).json({ valid: false, error: 'Invalid reset token format.' });
      }

      const now = new Date().toISOString();

      // Check members
      const { data: member, error: memberErr } = await supabase
        .from('members')
        .select('id, name, phone, email, reset_token_expires_at')
        .eq('reset_token', token)
        .limit(1)
        .maybeSingle();

      if (!memberErr && member) {
        if (member.reset_token_expires_at && member.reset_token_expires_at < now) {
          return res.status(400).json({ valid: false, error: 'This password reset link has expired. Please request a new one.' });
        }
        return res.status(200).json({
          valid: true,
          role: 'member',
          name: member.name,
          email: member.email,
          phone: member.phone
        });
      }

      // Check gyms (owners)
      const { data: gym, error: gymErr } = await supabase
        .from('gyms')
        .select('id, gym_name, owner_name, owner_phone, owner_email, reset_token_expires_at')
        .eq('reset_token', token)
        .limit(1)
        .maybeSingle();

      if (!gymErr && gym) {
        if (gym.reset_token_expires_at && gym.reset_token_expires_at < now) {
          return res.status(400).json({ valid: false, error: 'This password reset link has expired. Please request a new one.' });
        }
        return res.status(200).json({
          valid: true,
          role: 'owner',
          name: gym.gym_name,
          email: gym.owner_email,
          phone: gym.owner_phone
        });
      }

      return res.status(404).json({ valid: false, error: 'Invalid or already used password reset link.' });

    } catch (err) {
      console.error('Verify token error:', err);
      return res.status(500).json({ valid: false, error: 'Error validating reset token.' });
    }
  }

  // ── 2. POST: Complete Password Reset ──────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const { token, newPassword, role, phone } = req.body || {};
    const cleanPass = (newPassword || '').trim();

    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const now = new Date().toISOString();

    // Flow A: Reset via secure Token
    if (token) {
      const cleanToken = token.trim();

      // 1. Try member with token
      const { data: member } = await supabase
        .from('members')
        .select('id, name, phone, email, reset_token_expires_at')
        .eq('reset_token', cleanToken)
        .limit(1)
        .maybeSingle();

      if (member) {
        if (member.reset_token_expires_at && member.reset_token_expires_at < now) {
          return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
        }

        await supabase
          .from('members')
          .update({
            password: cleanPass,
            reset_token: null,
            reset_token_expires_at: null,
            updated_at: now
          })
          .eq('id', member.id);

        return res.status(200).json({
          success: true,
          role: 'member',
          message: 'Password reset successfully! You can now log in with your new password.',
          name: member.name
        });
      }

      // 2. Try owner with token
      const { data: gym } = await supabase
        .from('gyms')
        .select('id, gym_name, owner_name, owner_phone, owner_email, reset_token_expires_at')
        .eq('reset_token', cleanToken)
        .limit(1)
        .maybeSingle();

      if (gym) {
        if (gym.reset_token_expires_at && gym.reset_token_expires_at < now) {
          return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
        }

        await supabase
          .from('gyms')
          .update({
            owner_password: cleanPass,
            temp_password: null,
            reset_token: null,
            reset_token_expires_at: null,
            updated_at: now
          })
          .eq('id', gym.id);

        return res.status(200).json({
          success: true,
          role: 'owner',
          message: 'Gym Owner password reset successfully! You can now log in with your new password.',
          name: gym.gym_name
        });
      }

      return res.status(404).json({ error: 'Invalid or expired password reset link.' });
    }

    // Flow B: Legacy direct reset by phone & role (fallback)
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }

    if (role === 'owner') {
      const { data: gym } = await supabase
        .from('gyms')
        .select('id, gym_name')
        .ilike('owner_phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (!gym) return res.status(404).json({ error: 'Owner account not found.' });

      await supabase
        .from('gyms')
        .update({ owner_password: cleanPass, temp_password: null, updated_at: now })
        .eq('id', gym.id);

      return res.status(200).json({ success: true, message: 'Password reset successfully!' });
    } else {
      const { data: member } = await supabase
        .from('members')
        .select('id, name')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (!member) return res.status(404).json({ error: 'Member not found.' });

      await supabase
        .from('members')
        .update({ password: cleanPass, updated_at: now })
        .eq('id', member.id);

      return res.status(200).json({ success: true, message: 'Password reset successfully!' });
    }

  } catch (err) {
    console.error('Reset endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error completing password reset.' });
  }
}
