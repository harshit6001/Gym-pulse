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

    const now = Date.now();
    const nowIso = new Date().toISOString();
    let targetUser = null;
    let targetRole = 'member';

    // ─────────────────────────────────────────────
    // STRATEGY 1: Verify Cryptographically Signed Token
    // ─────────────────────────────────────────────
    if (cleanToken.includes('.')) {
      const parts = cleanToken.split('.');
      if (parts.length !== 2) {
        return res.status(400).json({
          error: 'Invalid password reset link format.'
        });
      }

      const [b64Payload, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Payload).digest('base64url');

      if (signature !== expectedSig) {
        return res.status(400).json({
          error: 'Invalid or forged password reset link.'
        });
      }

      let payload = null;
      try {
        payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
      } catch (_) {
        return res.status(400).json({
          error: 'Corrupted password reset link.'
        });
      }

      if (!payload || !payload.uid || !payload.exp) {
        return res.status(400).json({
          error: 'Incomplete reset token payload.'
        });
      }

      // STRICT 60-MINUTE EXPIRATION ENFORCEMENT
      if (now > payload.exp) {
        return res.status(400).json({
          error: 'This password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.'
        });
      }

      const role = payload.r || 'member';

      if (role === 'owner') {
        const { data: gym, error } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', payload.uid)
          .maybeSingle();

        if (error || !gym) {
          return res.status(404).json({
            error: 'Gym owner account associated with this link was not found.'
          });
        }

        // STRICT SINGLE-USE CHECK
        const currentPass = gym.owner_password || '';
        const currentHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 16);
        if (payload.ph && payload.ph !== currentHash) {
          return res.status(400).json({
            error: 'This password reset link has already been used. For your security, reset links are single-use only.'
          });
        }

        targetUser = gym;
        targetRole = 'owner';
      } else {
        const { data: member, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', payload.uid)
          .maybeSingle();

        if (error || !member) {
          return res.status(404).json({
            error: 'Member account associated with this link was not found.'
          });
        }

        // STRICT SINGLE-USE CHECK
        const currentPass = member.password || '';
        const currentHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 16);
        if (payload.ph && payload.ph !== currentHash) {
          return res.status(400).json({
            error: 'This password reset link has already been used. For your security, reset links are single-use only.'
          });
        }

        targetUser = member;
        targetRole = 'member';
      }
    }

    // ─────────────────────────────────────────────
    // STRATEGY 2: Legacy Database Token Check
    // ─────────────────────────────────────────────
    if (!targetUser) {
      try {
        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('reset_token', cleanToken)
          .limit(1)
          .maybeSingle();

        if (member) {
          targetUser = member;
          targetRole = 'member';
        }
      } catch (_) {}

      if (!targetUser) {
        try {
          const { data: gym } = await supabase
            .from('gyms')
            .select('*')
            .eq('reset_token', cleanToken)
            .limit(1)
            .maybeSingle();

          if (gym) {
            targetUser = gym;
            targetRole = 'owner';
          }
        } catch (_) {}
      }

      if (!targetUser) {
        return res.status(400).json({
          error: 'This password reset link has already been used or is invalid. Please request a new one.'
        });
      }

      // STRICT EXPIRY CHECK: if no expiration timestamp or timestamp is in the past
      if (!targetUser.reset_token_expires_at) {
        return res.status(400).json({
          error: 'This password reset link has expired. Links are strictly valid for 60 minutes only.'
        });
      }

      const expTime = new Date(targetUser.reset_token_expires_at).getTime();
      if (isNaN(expTime) || now > expTime) {
        return res.status(400).json({
          error: 'This password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.'
        });
      }
    }

    // ─────────────────────────────────────────────
    // EXECUTE PASSWORD UPDATE & INVALIDATE TOKEN
    // ─────────────────────────────────────────────
    let updateSuccess = false;
    let lastDbError = null;

    if (targetRole === 'owner') {
      // Step 1: Update owner_password and explicitly clear reset_token
      const res1 = await supabase
        .from('gyms')
        .update({
          owner_password: cleanPass,
          temp_password: null,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: nowIso
        })
        .eq('id', targetUser.id);

      if (!res1.error) {
        updateSuccess = true;
      } else {
        lastDbError = res1.error;
        // Step 2: Try updating owner_password + updated_at
        const res2 = await supabase
          .from('gyms')
          .update({
            owner_password: cleanPass,
            temp_password: null,
            reset_token: null,
            updated_at: nowIso
          })
          .eq('id', targetUser.id);

        if (!res2.error) {
          updateSuccess = true;
        } else {
          lastDbError = res2.error;
          // Step 3: Try updating ONLY owner_password
          const res3 = await supabase
            .from('gyms')
            .update({ owner_password: cleanPass })
            .eq('id', targetUser.id);

          if (!res3.error) {
            updateSuccess = true;
          } else {
            lastDbError = res3.error;
            if (targetUser.owner_phone) {
              const res4 = await supabase
                .from('gyms')
                .update({ owner_password: cleanPass })
                .eq('owner_phone', targetUser.owner_phone);
              if (!res4.error) updateSuccess = true;
              else lastDbError = res4.error;
            }
          }
        }
      }

      if (!updateSuccess) {
        console.error('Owner password update error in Supabase:', lastDbError);
        return res.status(500).json({
          error: lastDbError?.message || 'Failed to update owner password in database.'
        });
      }

      return res.status(200).json({
        success: true,
        role: 'owner',
        phone: targetUser.owner_phone,
        name: targetUser.owner_name || targetUser.gym_name,
        gym: {
          id: targetUser.id,
          gymName: targetUser.gym_name,
          ownerName: targetUser.owner_name,
          ownerPhone: targetUser.owner_phone,
          ownerEmail: targetUser.owner_email || '',
          emailVerified: targetUser.email_verified === true
        },
        message: `Password updated successfully for ${targetUser.gym_name}! Logging you in...`
      });
    } else {
      // Step 1: Update member password and explicitly clear reset_token
      const res1 = await supabase
        .from('members')
        .update({
          password: cleanPass,
          reset_token: null,
          reset_token_expires_at: null,
          updated_at: nowIso
        })
        .eq('id', targetUser.id);

      if (!res1.error) {
        updateSuccess = true;
      } else {
        lastDbError = res1.error;
        // Step 2: Try updating password + updated_at + clear reset_token
        const res2 = await supabase
          .from('members')
          .update({
            password: cleanPass,
            reset_token: null,
            updated_at: nowIso
          })
          .eq('id', targetUser.id);

        if (!res2.error) {
          updateSuccess = true;
        } else {
          lastDbError = res2.error;
          // Step 3: Try updating ONLY password
          const res3 = await supabase
            .from('members')
            .update({
              password: cleanPass
            })
            .eq('id', targetUser.id);

          if (!res3.error) {
            updateSuccess = true;
          } else {
            lastDbError = res3.error;
            if (targetUser.phone) {
              const res4 = await supabase
                .from('members')
                .update({ password: cleanPass })
                .eq('phone', targetUser.phone);
              if (!res4.error) updateSuccess = true;
              else lastDbError = res4.error;
            }
          }
        }
      }

      if (!updateSuccess) {
        console.error('Member password update error in Supabase:', lastDbError);
        return res.status(500).json({
          error: lastDbError?.message || 'Failed to update member password in database.'
        });
      }

      return res.status(200).json({
        success: true,
        role: 'member',
        phone: targetUser.phone,
        name: targetUser.name,
        member: {
          id: targetUser.id,
          gymId: targetUser.gym_id || null,
          name: targetUser.name,
          phone: targetUser.phone,
          email: targetUser.email || '',
          emailVerified: targetUser.email_verified === true,
          avatar: targetUser.avatar || null
        },
        message: `Password updated successfully for ${targetUser.name}! Logging you in...`
      });
    }
  } catch (err) {
    console.error('Reset password API exception:', err);
    return res.status(500).json({ error: err.message || 'Server error updating password.' });
  }
}
