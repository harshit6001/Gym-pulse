import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lerfvgzildsljutrjfcm.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_ndowhXp9k6jB-emZkHbbAw_Tn0ZPWHT';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'GP-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function isValidUUID(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
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
    const { memberId, role = 'member', email, phone, name } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);

    const token = generateVerificationCode();
    const nowIso = new Date().toISOString();

    let recipientEmail = cleanEmail;
    let recipientName = name || 'User';
    let targetRecord = null;

    if (role === 'owner') {
      // 1. Try finding gym by UUID id, owner_phone, or settings->>ownerEmail
      let query = supabase.from('gyms').select('*');
      if (isValidUUID(memberId)) {
        query = query.eq('id', memberId);
      } else if (cleanPhone) {
        query = query.ilike('owner_phone', `%${cleanPhone}%`);
      } else if (cleanEmail) {
        query = query.eq('settings->>ownerEmail', cleanEmail);
      } else {
        query = query.limit(1);
      }

      const { data: gym } = await query.limit(1).maybeSingle();
      if (gym) {
        targetRecord = gym;
        recipientEmail = gym.settings?.ownerEmail || cleanEmail;
        recipientName = gym.settings?.ownerName || gym.gym_name || recipientName;

        const updatedSettings = {
          ...(gym.settings || {}),
          verification_token: token,
          verificationToken: token,
          verification_sent_at: nowIso,
          emailVerified: false,
          ownerEmail: recipientEmail
        };

        // Update settings JSONB in gyms table
        await supabase
          .from('gyms')
          .update({
            settings: updatedSettings
          })
          .eq('id', gym.id);
      }
    } else {
      // Member verification
      let query = supabase.from('members').select('*');
      if (isValidUUID(memberId)) {
        query = query.eq('id', memberId);
      } else if (cleanEmail) {
        query = query.ilike('email', cleanEmail);
      } else if (cleanPhone) {
        query = query.eq('phone', cleanPhone);
      } else {
        query = query.limit(1);
      }

      const { data: member } = await query.limit(1).maybeSingle();
      if (member) {
        targetRecord = member;
        recipientEmail = member.email || cleanEmail;
        recipientName = member.name || recipientName;

        const updatedSettings = {
          ...(member.settings || {}),
          verification_token: token,
          verification_sent_at: nowIso,
          emailVerified: false
        };

        const { error: upErr } = await supabase
          .from('members')
          .update({
            verification_token: token,
            email: recipientEmail || undefined,
            settings: updatedSettings,
            updated_at: nowIso
          })
          .eq('id', member.id);

        if (upErr) {
          await supabase
            .from('members')
            .update({
              settings: updatedSettings,
              updated_at: nowIso
            })
            .eq('id', member.id);
        }
      }
    }

    // Attempt email dispatch via Resend if API key is provided
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && recipientEmail && recipientEmail.includes('@')) {
      try {
        const senderEmail = process.env.EMAIL_FROM || 'GymPulse Security <security@harshit.email>';
        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verify Your GymPulse Email</title></head>
<body style="margin:0;padding:0;background-color:#0B0F17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#E2E8F0;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0B0F17;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:480px;background:#141C2B;border:1px solid #1E293B;border-radius:24px;padding:36px;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
        <tr><td align="center" style="padding-bottom:20px;">
          <div style="display:inline-block;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:10px 18px;">
            <span style="font-size:16px;font-weight:900;color:#10B981;">🏋️ GymPulse Official Verification</span>
          </div>
        </td></tr>
        <tr><td style="text-align:left;padding-bottom:16px;">
          <h1 style="margin:0 0 8px 0;font-size:20px;font-weight:800;color:#FFFFFF;">Verify Your Email Address</h1>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#94A3B8;">
            Hi <strong style="color:#FFFFFF;">${recipientName}</strong>,<br>
            Please use the official verification code below to verify your email address on GymPulse:
          </p>
        </td></tr>
        <tr><td align="center" style="padding:20px 0;">
          <div style="display:inline-block;background:#0B0F17;border:2px dashed #10B981;border-radius:16px;padding:14px 28px;letter-spacing:4px;font-size:26px;font-weight:900;color:#10B981;font-family:monospace;">
            ${token}
          </div>
        </td></tr>
        <tr><td style="text-align:center;padding-top:20px;border-top:1px solid #1E293B;color:#64748B;font-size:11px;">
          <p style="margin:0;">Enter this code directly in the verification prompt in GymPulse.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [recipientEmail],
            reply_to: 'security@harshit.email',
            subject: `GymPulse Verification Code: ${token}`,
            html: emailHtml
          })
        });
      } catch (emailErr) {
        console.warn('Resend email dispatch notice:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      token,
      code: token,
      recipient: recipientEmail,
      message: `Verification code ${token} generated for ${recipientName}${recipientEmail ? ` (${recipientEmail})` : ''}.`
    });
  } catch (err) {
    console.error('Send verification endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error generating verification.' });
  }
}
