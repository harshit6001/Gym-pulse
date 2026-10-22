import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TOKEN_SECRET =
  process.env.RESEND_API_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'gympulse_resend_reset_secret_token_2026';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = (req.body?.token || req.query?.token || '').trim();

    if (!token) {
      return res.status(400).json({
        valid: false,
        reason: 'missing',
        error: 'Reset token is required.'
      });
    }

    const now = Date.now();

    // ─────────────────────────────────────────────
    // STRATEGY 1: Cryptographically Signed Token
    // ─────────────────────────────────────────────
    if (token.includes('.')) {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({
          valid: false,
          reason: 'invalid',
          error: 'Invalid password reset link.'
        });
      }

      const [b64Payload, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Payload).digest('base64url');

      if (signature !== expectedSig) {
        return res.status(400).json({
          valid: false,
          reason: 'tampered',
          error: 'Invalid or forged password reset link.'
        });
      }

      let payload = null;
      try {
        payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
      } catch (_) {
        return res.status(400).json({
          valid: false,
          reason: 'corrupt',
          error: 'Corrupted password reset link.'
        });
      }

      if (!payload || !payload.uid || !payload.exp) {
        return res.status(400).json({
          valid: false,
          reason: 'invalid',
          error: 'Incomplete reset token payload.'
        });
      }

      // STRICT 60-MINUTE EXPIRY CHECK
      if (now > payload.exp) {
        const expiredMinutesAgo = Math.max(1, Math.round((now - payload.exp) / 60000));
        return res.status(400).json({
          valid: false,
          reason: 'expired',
          expiredMinutesAgo,
          error: 'This password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.'
        });
      }

      const role = payload.r || 'member';

      if (role === 'owner') {
        const { data: gym, error } = await supabase
          .from('gyms')
          .select('id, gym_name, owner_password, temp_password, settings')
          .eq('id', payload.uid)
          .maybeSingle();

        if (error || !gym) {
          return res.status(404).json({
            valid: false,
            reason: 'not_found',
            error: 'Account associated with this reset link was not found.'
          });
        }

        // STRICT SINGLE-USE CHECK
        const currentPass = gym.owner_password || '';
        const currentHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 16);

        if (payload.ph && payload.ph !== currentHash) {
          return res.status(400).json({
            valid: false,
            reason: 'used',
            error: 'This password reset link has already been used. For your security, reset links can only be used once.'
          });
        }

        const remainingMinutes = Math.max(1, Math.round((payload.exp - now) / 60000));
        return res.status(200).json({
          valid: true,
          role: 'owner',
          name: gym.settings?.ownerName || gym.gym_name,
          remainingMinutes
        });
      } else {
        const { data: member, error } = await supabase
          .from('members')
          .select('id, name, phone, email, password, reset_token')
          .eq('id', payload.uid)
          .maybeSingle();

        if (error || !member) {
          return res.status(404).json({
            valid: false,
            reason: 'not_found',
            error: 'Member account associated with this reset link was not found.'
          });
        }

        // STRICT SINGLE-USE CHECK
        const currentPass = member.password || '';
        const currentHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 16);

        if (payload.ph && payload.ph !== currentHash) {
          return res.status(400).json({
            valid: false,
            reason: 'used',
            error: 'This password reset link has already been used. For your security, reset links can only be used once.'
          });
        }

        const remainingMinutes = Math.max(1, Math.round((payload.exp - now) / 60000));
        return res.status(200).json({
          valid: true,
          role: 'member',
          name: member.name,
          remainingMinutes
        });
      }
    }

    // ─────────────────────────────────────────────
    // STRATEGY 2: Legacy Database Token Check
    // ─────────────────────────────────────────────
    let foundUser = null;
    let foundRole = 'member';

    const { data: member } = await supabase
      .from('members')
      .select('id, name, phone, email, reset_token, reset_token_expires_at')
      .eq('reset_token', token)
      .limit(1)
      .maybeSingle();

    if (member) {
      foundUser = member;
      foundRole = 'member';
    } else {
      const { data: gym } = await supabase
        .from('gyms')
        .select('id, gym_name, owner_password, temp_password, settings')
        .or(`settings->>reset_token.eq.${token},settings->>resetToken.eq.${token}`)
        .limit(1)
        .maybeSingle();

      if (gym) {
        foundUser = {
          ...gym,
          name: gym.settings?.ownerName || gym.gym_name,
          reset_token_expires_at: gym.settings?.reset_token_expires_at || gym.settings?.resetTokenExpiresAt
        };
        foundRole = 'owner';
      }
    }

    if (!foundUser) {
      return res.status(400).json({
        valid: false,
        reason: 'used_or_invalid',
        error: 'This password reset link has already been used or is invalid. Please request a new one.'
      });
    }

    // STRICT EXPIRY CHECK: if no expiration timestamp or timestamp is in the past
    if (!foundUser.reset_token_expires_at) {
      return res.status(400).json({
        valid: false,
        reason: 'expired',
        error: 'This password reset link has expired. Links are strictly valid for 60 minutes only.'
      });
    }

    const expTime = new Date(foundUser.reset_token_expires_at).getTime();
    if (isNaN(expTime) || now > expTime) {
      return res.status(400).json({
        valid: false,
        reason: 'expired',
        error: 'This password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.'
      });
    }

    const remainingMinutes = Math.max(1, Math.round((expTime - now) / 60000));
    return res.status(200).json({
      valid: true,
      role: foundRole,
      name: foundUser.name || foundUser.owner_name || foundUser.gym_name,
      remainingMinutes
    });

  } catch (err) {
    console.error('Verify reset token error:', err);
    return res.status(500).json({
      valid: false,
      reason: 'server_error',
      error: 'Server error verifying reset token.'
    });
  }
}
