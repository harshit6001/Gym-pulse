import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function normalizePhone(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(-10);
}

export default async function handler(req, res) {
  // Set CORS headers
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
    const { role = 'member', phone, password, pin } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanPass = (password || '').trim();
    const cleanPin = (pin || cleanPass).trim();

    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }

    // ── 1. OWNER LOGIN ──────────────────────────────
    if (role === 'owner') {
      if (!cleanPass) {
        return res.status(400).json({ error: 'Please enter your owner password.' });
      }

      const { data: gym, error } = await supabase
        .from('gyms')
        .select('*')
        .ilike('owner_phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (error || !gym) {
        return res.status(401).json({ error: 'Mobile number not registered as gym owner.' });
      }

      const match =
        (gym.owner_password && gym.owner_password === cleanPass) ||
        (gym.temp_password && gym.temp_password === cleanPass) ||
        (gym.settings?.ownerPassword && gym.settings.ownerPassword === cleanPass) ||
        (gym.settings?.tempPassword && gym.settings.tempPassword === cleanPass) ||
        (gym.settings?.ownerCredentials?.password && gym.settings.ownerCredentials.password === cleanPass);

      if (!match) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }

      // Update last login
      await supabase.from('gyms').update({ last_login: new Date().toISOString() }).eq('id', gym.id);

      return res.status(200).json({
        success: true,
        role: 'owner',
        gymStatus: gym.status || 'ACTIVE',
        blockReason: gym.block_reason || '',
        emailVerified: gym.email_verified === true || gym.settings?.emailVerified === true,
        gym: {
          id: gym.id,
          gymName: gym.gym_name,
          ownerName: gym.owner_name || gym.settings?.ownerName || 'Gym Owner',
          ownerPhone: gym.owner_phone,
          ownerEmail: gym.owner_email || gym.settings?.ownerEmail || '',
          emailVerified: gym.email_verified === true || gym.settings?.emailVerified === true,
          status: gym.status || 'ACTIVE',
          blockReason: gym.block_reason || '',
          plan: gym.plan || gym.settings?.plan || 'Standard',
          monthlyFee: Number(gym.monthly_fee) || Number(gym.settings?.monthlyFee) || 4499,
          features: gym.features || gym.settings?.features || null
        },
        token: `gp_jwt_owner_${gym.id}_${Date.now()}`
      });
    }

    // ── 2. STAFF LOGIN ──────────────────────────────
    if (role === 'staff') {
      if (!cleanPin) {
        return res.status(400).json({ error: 'Please enter your staff PIN.' });
      }

      const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .ilike('phone', `%${cleanPhone}%`)
        .eq('pin', cleanPin)
        .eq('status', 'ACTIVE')
        .limit(1)
        .maybeSingle();

      if (error || !staff) {
        return res.status(401).json({ error: 'Invalid staff credentials or account inactive.' });
      }

      let gymStatus = 'ACTIVE';
      let blockReason = '';
      if (staff.gym_id) {
        const { data: gym } = await supabase.from('gyms').select('*').eq('id', staff.gym_id).maybeSingle();
        if (gym) {
          gymStatus = gym.status || 'ACTIVE';
          blockReason = gym.block_reason || '';
        }
      }

      return res.status(200).json({
        success: true,
        role: 'staff',
        gymStatus,
        blockReason,
        staff: {
          id: staff.id,
          gymId: staff.gym_id,
          name: staff.name,
          phone: staff.phone,
          role: staff.role
        },
        token: `gp_jwt_staff_${staff.id}_${Date.now()}`
      });
    }

    // ── 3. MEMBER LOGIN ─────────────────────────────
    if (!cleanPass) {
      return res.status(400).json({ error: 'Please enter your member password.' });
    }

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (error || !member) {
      return res.status(401).json({ error: 'Mobile number not registered. Please contact your gym front desk.' });
    }

    const storedPass = member.password;
    const isMatch = storedPass
      ? (storedPass === cleanPass)
      : (cleanPass === cleanPhone.slice(-4) || cleanPass === cleanPhone);

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect member password.' });
    }

    let gymStatus = 'ACTIVE';
    let blockReason = '';
    let gymName = 'Gym';

    if (member.gym_id) {
      const { data: gymData } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', member.gym_id)
        .limit(1)
        .maybeSingle();
      if (gymData) {
        gymStatus = gymData.status || 'ACTIVE';
        blockReason = gymData.block_reason || '';
        gymName = gymData.gym_name || gymName;
      }
    }

    return res.status(200).json({
      success: true,
      role: 'member',
      gymStatus,
      blockReason,
      gymName,
      emailVerified: member.email_verified === true,
      member: {
        id: member.id,
        gymId: member.gym_id,
        name: member.name,
        phone: member.phone,
        email: member.email || '',
        emailVerified: member.email_verified === true,
        avatar: member.avatar,
        status: member.status || 'active',
        membership: {
          planId: member.plan_id,
          planName: member.plan_name,
          startDate: member.membership_start,
          endDate: member.membership_end,
          autoRenew: member.auto_renew,
          amountPaid: member.amount_paid
        }
      },
      token: `gp_jwt_member_${member.id}_${Date.now()}`
    });

  } catch (err) {
    console.error('Login endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}
