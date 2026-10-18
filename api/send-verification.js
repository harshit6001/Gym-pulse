import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'GP-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export default async function handler(req, res) {
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
    const { memberId, role = 'member', email } = req.body || {};
    if (!memberId) {
      return res.status(400).json({ error: 'Account identifier is required.' });
    }

    const token = generateVerificationCode();
    const nowIso = new Date().toISOString();

    if (role === 'owner') {
      const { data: gym, error } = await supabase
        .from('gyms')
        .update({
          verification_token: token,
          verification_sent_at: nowIso,
          owner_email: email || undefined
        })
        .eq('id', memberId)
        .select()
        .maybeSingle();

      if (error || !gym) {
        return res.status(404).json({ error: 'Gym owner account not found.' });
      }

      return res.status(200).json({
        success: true,
        token,
        recipient: gym.owner_email || email,
        message: `Verification code generated for ${gym.gym_name}.`
      });
    } else {
      const { data: member, error } = await supabase
        .from('members')
        .update({
          verification_token: token,
          verification_sent_at: nowIso,
          email: email || undefined
        })
        .eq('id', memberId)
        .select()
        .maybeSingle();

      if (error || !member) {
        return res.status(404).json({ error: 'Member record not found.' });
      }

      return res.status(200).json({
        success: true,
        token,
        recipient: member.email || email,
        message: `Verification code generated for ${member.name}.`
      });
    }
  } catch (err) {
    console.error('Send verification endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error generating verification.' });
  }
}
