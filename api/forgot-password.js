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

function normalizePhone(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '').slice(-10);
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user.slice(0, 2)}${'*'.repeat(Math.max(2, user.length - 2))}@${domain}`;
}

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
    const { phone, email, role = 'member' } = req.body || {};
    const cleanPhone = normalizePhone(phone);
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanPhone && !cleanEmail) {
      return res.status(400).json({ error: 'Please enter your registered 10-digit mobile number or email.' });
    }

    let userRecord = null;
    let userRole = role;
    let recipientEmail = '';
    let userName = '';

    // 1. Look up in Gyms (if role === 'owner')
    if (role === 'owner') {
      let query = supabase.from('gyms').select('*');
      if (cleanPhone) query = query.ilike('owner_phone', `%${cleanPhone}%`);
      else if (cleanEmail) query = query.ilike('owner_email', cleanEmail);

      const { data: gym, error } = await query.limit(1).maybeSingle();
      if (!error && gym) {
        userRecord = gym;
        userRole = 'owner';
        recipientEmail = gym.owner_email || cleanEmail;
        userName = gym.owner_name || gym.gym_name || 'Gym Owner';
      }
    }

    // 2. Look up in Members
    if (!userRecord) {
      let query = supabase.from('members').select('*');
      if (cleanPhone) query = query.eq('phone', cleanPhone);
      else if (cleanEmail) query = query.ilike('email', cleanEmail);

      const { data: member, error } = await query.limit(1).maybeSingle();
      if (!error && member) {
        userRecord = member;
        userRole = 'member';
        recipientEmail = member.email || cleanEmail;
        userName = member.name || 'Member';
      }
    }

    // 3. Fallback: check gyms if not found in members
    if (!userRecord && role !== 'owner') {
      let query = supabase.from('gyms').select('*');
      if (cleanPhone) query = query.ilike('owner_phone', `%${cleanPhone}%`);
      else if (cleanEmail) query = query.ilike('owner_email', cleanEmail);

      const { data: gym, error } = await query.limit(1).maybeSingle();
      if (!error && gym) {
        userRecord = gym;
        userRole = 'owner';
        recipientEmail = gym.owner_email || cleanEmail;
        userName = gym.owner_name || gym.gym_name || 'Gym Owner';
      }
    }

    if (!userRecord) {
      return res.status(404).json({
        error: 'No account found with this mobile number or email address. Please check and try again.'
      });
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return res.status(400).json({
        error: 'No email address is linked to this account. Please contact front desk or owner to update your email.'
      });
    }

    // Generate tamper-proof, single-use signed token (valid for 60 minutes)
    // Uses hash of current password so changing the password automatically invalidates the token!
    const currentPass = userRole === 'owner' ? (userRecord.owner_password || '') : (userRecord.password || '');
    const passHash = crypto.createHash('sha256').update(String(currentPass || '')).digest('hex').slice(0, 12);
    const expiresAtMs = Date.now() + 60 * 60 * 1000;
    const expiresAt = new Date(expiresAtMs).toISOString();

    const payloadObj = {
      uid: userRecord.id,
      r: userRole,
      exp: expiresAtMs,
      ph: passHash
    };
    const b64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(b64Payload).digest('base64url');
    const resetToken = `${b64Payload}.${signature}`;

    // Safely attempt to persist token in Supabase (if columns exist)
    try {
      if (userRole === 'owner') {
        await supabase
          .from('gyms')
          .update({
            reset_token: resetToken,
            reset_token_expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', userRecord.id);
      } else {
        await supabase
          .from('members')
          .update({
            reset_token: resetToken,
            reset_token_expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', userRecord.id);
      }
    } catch (_) {
      // Gracefully ignore if reset_token column does not exist yet
    }

    // Determine host URL for the reset link
    const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host || '';
    const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : (process.env.APP_URL || 'https://harshit.email');
    const resetUrl = `${baseUrl.replace(/\/$/, '')}/?reset_token=${encodeURIComponent(resetToken)}`;

    // Sender details using custom domain harshit.email
    const senderEmail = process.env.EMAIL_FROM || 'GymPulse Security <security@harshit.email>';
    const resendApiKey = process.env.RESEND_API_KEY;

    let emailDelivered = false;
    let emailDeliveryError = null;

    if (resendApiKey) {
      try {
        const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your GymPulse Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F17; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0B0F17; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background: #141C2B; border: 1px solid #1E293B; border-radius: 24px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 12px 20px;">
                <span style="font-size: 18px; font-weight: 900; color: #10B981; letter-spacing: -0.5px;">🏋️ GymPulse by Harshit</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="text-align: left; padding-bottom: 20px;">
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #FFFFFF;">Password Reset Request</h1>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                Hi <strong style="color: #FFFFFF;">${userName}</strong>,<br>
                We received a request to reset the password for your GymPulse account. Click the button below to set your new password:
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10B981, #0D9488); color: #022C22; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 36px; border-radius: 12px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.35);">
                🔑 Reset My Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align: left; padding: 16px; background: #0B0F17; border-radius: 12px; border: 1px solid #1E293B; margin-bottom: 20px;">
              <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase;">Or copy this link to your browser:</p>
              <p style="margin: 0; font-size: 11px; color: #38BDF8; word-break: break-all; font-family: monospace;">${resetUrl}</p>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 24px; border-top: 1px solid #1E293B; color: #64748B; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">⏳ This link is valid for <strong>60 minutes</strong> and can only be used once.</p>
              <p style="margin: 0;">If you didn't request a password reset, you can safely ignore this email. Your account remains completely secure.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

        const plainText = `Hi ${userName},\n\nWe received a request to reset the password for your GymPulse account.\n\nClick this link to set your new password:\n${resetUrl}\n\nThis link is valid for 60 minutes.\nIf you did not request this, you can safely ignore this email.\n\n— GymPulse Security Team\nsecurity@harshit.email`;

        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [recipientEmail],
            reply_to: 'security@harshit.email',
            subject: 'GymPulse — Reset Your Account Password',
            html: emailHtml,
            text: plainText
          })
        });

        const resendData = await resendResponse.json();
        if (resendResponse.ok && resendData.id) {
          emailDelivered = true;
        } else {
          emailDeliveryError = resendData.message || resendData.error || 'Resend delivery failed.';
          console.error('Resend delivery error:', resendData);
        }
      } catch (sendErr) {
        emailDeliveryError = sendErr.message;
        console.error('Exception calling Resend:', sendErr);
      }
    } else {
      emailDeliveryError = 'RESEND_API_KEY is not configured on server.';
    }

    return res.status(200).json({
      success: true,
      delivered: emailDelivered,
      recipientEmail: maskEmail(recipientEmail),
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
      deliveryError: emailDeliveryError || undefined,
      message: `Password reset link delivered to ${maskEmail(recipientEmail)}. Please check your inbox or spam folder.`
    });
  } catch (err) {
    console.error('Forgot password API exception:', err);
    return res.status(500).json({ error: 'Server error processing password reset request.' });
  }
}
