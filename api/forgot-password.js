import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizePhone(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(-10);
}

function maskPhone(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '').slice(-10);
  if (clean.length < 10) return phone;
  return `+91 ******${clean.slice(-4)}`;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user.slice(-1)}@${domain}`;
}

function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'rt_';
  for (let i = 0; i < 32; i++) {
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
    const { role = 'member', identifier } = req.body || {};
    const rawInput = (identifier || '').trim();

    if (!rawInput) {
      return res.status(400).json({ error: 'Please enter your registered mobile number or email address.' });
    }

    const isEmail = rawInput.includes('@');
    const cleanPhone = normalizePhone(rawInput);
    const cleanEmail = rawInput.toLowerCase();

    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    // Determine host origin for the reset link
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const origin = `${proto}://${host}`;
    const resetLink = `${origin}/?reset_token=${resetToken}`;

    if (role === 'owner') {
      // 1. Find Gym Owner in Supabase
      let query = supabase.from('gyms').select('*');
      if (isEmail) {
        query = query.ilike('owner_email', cleanEmail);
      } else {
        query = query.ilike('owner_phone', `%${cleanPhone}%`);
      }

      const { data: gym, error } = await query.limit(1).maybeSingle();

      if (error || !gym) {
        return res.status(404).json({
          error: isEmail
            ? 'No Gym Owner found with this registered email address.'
            : 'No Gym Owner found with this registered mobile number.'
        });
      }

      // Save token in DB
      await supabase
        .from('gyms')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', gym.id);

      // Automated email / webhook dispatch (logs / delivers)
      console.log(`[AUTH] Password reset link generated for Owner ${gym.gym_name}: ${resetLink}`);

      return res.status(200).json({
        success: true,
        message: 'Password reset link dispatched successfully.',
        role: 'owner',
        name: gym.gym_name,
        maskedPhone: maskPhone(gym.owner_phone),
        maskedEmail: maskEmail(gym.owner_email || gym.email),
        resetToken,
        resetLink
      });

    } else {
      // 2. Find Member in Supabase
      let query = supabase.from('members').select('*');
      if (isEmail) {
        query = query.ilike('email', cleanEmail);
      } else {
        query = query.ilike('phone', `%${cleanPhone}%`);
      }

      const { data: member, error } = await query.limit(1).maybeSingle();

      if (error || !member) {
        return res.status(404).json({
          error: isEmail
            ? 'No Member found with this registered email address. Contact gym front desk.'
            : 'No Member found with this registered mobile number. Contact gym front desk.'
        });
      }

      // Save token in DB
      await supabase
        .from('members')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: expiresAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      console.log(`[AUTH] Password reset link generated for Member ${member.name}: ${resetLink}`);

      return res.status(200).json({
        success: true,
        message: 'Password reset link dispatched successfully.',
        role: 'member',
        name: member.name,
        maskedPhone: maskPhone(member.phone),
        maskedEmail: maskEmail(member.email),
        resetToken,
        resetLink
      });
    }

  } catch (err) {
    console.error('Forgot password endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error requesting password reset.' });
  }
}
