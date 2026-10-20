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

    const nowIso = new Date().toISOString();
    let targetUser = null;
    let targetRole = 'member';

    // ─────────────────────────────────────────────
    // STRATEGY 1: Verify Cryptographically Signed Token
    // ─────────────────────────────────────────────
    if (cleanToken.includes('.')) {
      const parts = cleanToken.split('.');
      if (parts.length === 2) {
        const [b64Payload, signature] = parts;
        const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Payload).digest('base64url');

        if (signature === expectedSig) {
          try {
            const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
            if (payload && payload.uid && payload.exp) {
              if (Date.now() > payload.exp) {
                return res.status(400).json({
                  error: 'Password reset link has expired (links are valid for 60 minutes). Please request a new one.'
                });
              }

              const role = payload.r || 'member';

              if (role === 'owner') {
                const { data: gym } = await supabase
                  .from('gyms')
                  .select('*')
                  .eq('id', payload.uid)
                  .maybeSingle();

                if (gym) {
                  const currentPass = gym.owner_password || '';
                  const expectedHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 12);
                  if (payload.ph && payload.ph !== expectedHash) {
                    return res.status(400).json({
                      error: 'This password reset link has already been used. Please request a new one if needed.'
                    });
                  }
                  targetUser = gym;
                  targetRole = 'owner';
                }
              } else {
                const { data: member } = await supabase
                  .from('members')
                  .select('*')
                  .eq('id', payload.uid)
                  .maybeSingle();

                if (member) {
                  const currentPass = member.password || '';
                  const expectedHash = crypto.createHash('sha256').update(String(currentPass)).digest('hex').slice(0, 12);
                  if (payload.ph && payload.ph !== expectedHash) {
                    return res.status(400).json({
                      error: 'This password reset link has already been used. Please request a new one if needed.'
                    });
                  }
                  targetUser = member;
                  targetRole = 'member';
                }
              }
            }
          } catch (_) {}
        }
      }
    }

    // ─────────────────────────────────────────────
    // STRATEGY 2: Fallback to Database reset_token column
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

      if (targetUser && targetUser.reset_token_expires_at) {
        if (new Date(targetUser.reset_token_expires_at).getTime() < Date.now()) {
          return res.status(400).json({
            error: 'Password reset link has expired. Please request a new one.'
          });
        }
      }
    }

    if (!targetUser) {
      return res.status(400).json({
        error: 'Invalid or expired password reset link. Please request a new one.'
      });
    }

    // ─────────────────────────────────────────────
    // EXECUTE PASSWORD UPDATE IN SUPABASE
    // ─────────────────────────────────────────────
    let updateSuccess = false;
    let lastDbError = null;

    if (targetRole === 'owner') {
      // Step 1: Try full update with reset_token cleanup & updated_at
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
            updated_at: nowIso
          })
          .eq('id', targetUser.id);

        if (!res2.error) {
          updateSuccess = true;
        } else {
          lastDbError = res2.error;
          // Step 3: Try updating ONLY owner_password (no extra columns)
          const res3 = await supabase
            .from('gyms')
            .update({ owner_password: cleanPass })
            .eq('id', targetUser.id);

          if (!res3.error) {
            updateSuccess = true;
          } else {
            lastDbError = res3.error;
            // Step 4: Try match by owner_phone
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
      // Step 1: Try full update with reset_token cleanup & updated_at
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
        // Step 2: Try updating password + updated_at
        const res2 = await supabase
          .from('members')
          .update({
            password: cleanPass,
            updated_at: nowIso
          })
          .eq('id', targetUser.id);

        if (!res2.error) {
          updateSuccess = true;
        } else {
          lastDbError = res2.error;
          // Step 3: Try updating ONLY password (no extra columns)
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
            // Step 4: Try match by phone (if id had type mismatch)
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
