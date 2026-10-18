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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { role = 'member', phone, newPassword } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanPass = (newPassword || '').trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number.' });
    }
    if (!cleanPass || cleanPass.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    if (role === 'owner') {
      const { data: gym, error } = await supabase
        .from('gyms')
        .select('id, gym_name, owner_phone, owner_email')
        .ilike('owner_phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !gym) {
        return res.status(404).json({ error: 'Gym owner account not found for this mobile number.' });
      }

      await supabase
        .from('gyms')
        .update({
          owner_password: cleanPass,
          temp_password: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', gym.id);

      return res.status(200).json({
        success: true,
        message: 'Owner password reset successfully!',
        account: {
          name: gym.gym_name,
          email: gym.owner_email || '',
          phone: cleanPhone
        }
      });
    } else {
      // Member reset
      const { data: member, error } = await supabase
        .from('members')
        .select('id, name, phone, email')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !member) {
        return res.status(404).json({ error: 'Member not found with this mobile number.' });
      }

      await supabase
        .from('members')
        .update({
          password: cleanPass,
          updated_at: new Date().toISOString()
        })
        .eq('id', member.id);

      return res.status(200).json({
        success: true,
        message: 'Member password reset successfully!',
        account: {
          name: member.name,
          email: member.email || '',
          phone: cleanPhone
        }
      });
    }
  } catch (err) {
    console.error('Reset endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
}
