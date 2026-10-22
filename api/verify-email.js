import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawToken = req.method === 'GET' ? req.query.token : (req.body?.token || req.query?.token);
    const token = (rawToken || '').trim().toUpperCase();

    if (!token || token.length < 4) {
      if (req.method === 'GET') {
        return res.redirect('/?verify_status=invalid');
      }
      return res.status(400).json({ error: 'Invalid or missing email verification token.' });
    }

    const candidateTokens = Array.from(new Set([
      token,
      token.startsWith('GP-') ? token.replace(/^GP-/, '') : `GP-${token}`
    ]));

    const nowIso = new Date().toISOString();

    // 1. Check Supabase members table (column check)
    let { data: member } = await supabase
      .from('members')
      .select('*')
      .in('verification_token', candidateTokens)
      .limit(1)
      .maybeSingle();

    // If not found in column, check settings->>verification_token
    if (!member) {
      for (const cand of candidateTokens) {
        const { data: memberInSettings } = await supabase
          .from('members')
          .select('*')
          .eq('settings->>verification_token', cand)
          .limit(1)
          .maybeSingle();
        if (memberInSettings) {
          member = memberInSettings;
          break;
        }
      }
    }

    if (member) {
      const updatedSettings = {
        ...(member.settings || {}),
        emailVerified: true,
        verification_token: null
      };

      await supabase
        .from('members')
        .update({
          email_verified: true,
          verification_token: null,
          settings: updatedSettings,
          updated_at: nowIso
        })
        .eq('id', member.id);

      if (req.method === 'GET') {
        return res.redirect(`/?verify_status=success&user=${encodeURIComponent(member.name)}`);
      }

      return res.status(200).json({
        success: true,
        role: 'member',
        memberId: member.id,
        name: member.name,
        email: member.email,
        message: `Email verified successfully for ${member.name}!`
      });
    }

    // 2. Check Supabase gyms table (owners)
    const gymOrFilter = candidateTokens.map(t => `settings->>verification_token.eq.${t},settings->>verificationToken.eq.${t}`).join(',');
    let { data: gym } = await supabase
      .from('gyms')
      .select('*')
      .or(gymOrFilter)
      .limit(1)
      .maybeSingle();

    if (gym) {
      const updatedSettings = {
        ...(gym.settings || {}),
        emailVerified: true,
        verification_token: null,
        verificationToken: null
      };

      await supabase
        .from('gyms')
        .update({
          settings: updatedSettings
        })
        .eq('id', gym.id);

      if (req.method === 'GET') {
        return res.redirect(`/?verify_status=success&gym=${encodeURIComponent(gym.gym_name)}`);
      }

      return res.status(200).json({
        success: true,
        role: 'owner',
        gymId: gym.id,
        name: gym.settings?.ownerName || gym.gym_name,
        email: gym.settings?.ownerEmail || '',
        message: `Gym owner email verified successfully for ${gym.gym_name}!`
      });
    }

    if (req.method === 'GET') {
      return res.redirect('/?verify_status=expired');
    }
    return res.status(404).json({ error: 'Invalid or expired verification token.' });

  } catch (err) {
    console.error('Verify email endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error during email verification.' });
  }
}
