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

/**
 * Responsive GymPulse branded HTML email template for password reset
 */
function generateResetEmailHtml({ name, resetLink, role }) {
  const roleName = role === 'owner' ? 'Gym Owner' : 'Gym Member';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your GymPulse Password</title>
</head>
<body style="margin:0;padding:0;background-color:#0B0F17;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0F17;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background-color:#141C2B;border-radius:24px;border:1px solid #1E293B;padding:36px 32px;box-shadow:0 20px 40px rgba(0,0,0,0.6);" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="display:inline-block;padding:12px 20px;background:linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15));border:1px solid rgba(16,185,129,0.3);border-radius:16px;">
                <span style="font-size:22px;font-weight:900;color:#10B981;letter-spacing:1px;">⚡ GymPulse</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:16px;">
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;text-align:center;">Password Reset Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;font-size:14px;line-height:1.6;color:#94A3B8;text-align:left;">
              Hello <strong style="color:#FFFFFF;">${name || 'Valued User'}</strong>,<br><br>
              We received a request to reset your password for your GymPulse <strong>${roleName}</strong> account.
              Click the secure button below to choose a new password:
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <a href="${resetLink}" target="_blank" style="display:inline-block;background-color:#10B981;color:#022C22;font-size:14px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:14px;box-shadow:0 4px 14px rgba(16,185,129,0.4);">
                Set New Password →
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;font-size:12px;line-height:1.5;color:#64748B;background-color:#0B0F17;padding:14px;border-radius:12px;border:1px solid #1E293B;">
              <strong style="color:#F59E0B;">⚠️ Security Notice:</strong> This single-use link is valid for <strong style="color:#E2E8F0;">60 minutes</strong>. If you did not make this request, you can safely ignore this email — your password will remain unchanged.
            </td>
          </tr>
          <tr>
            <td style="font-size:11px;color:#475569;text-align:center;border-top:1px solid #1E293B;padding-top:20px;">
              © ${new Date().getFullYear()} GymPulse Management System. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Multi-provider Email Delivery (Resend -> Brevo -> SendGrid)
 */
async function sendResetEmail({ email, name, resetLink, role }) {
  if (!email || !email.includes('@')) {
    return { sent: false, reason: 'No registered email found.' };
  }

  const html = generateResetEmailHtml({ name, resetLink, role });

  // 1. Try Resend API (Recommended, 3000 free emails/mo)
  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromEmail = process.env.EMAIL_FROM || 'GymPulse Security <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [email],
          subject: 'GymPulse — Password Reset Link',
          html
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[AUTH EMAIL] Successfully sent reset link via Resend to ${email}:`, data.id);
        return { sent: true, provider: 'resend', id: data.id };
      }
      console.warn('[AUTH EMAIL] Resend response error:', data);
      return { sent: false, provider: 'resend', reason: data.message || (data.errors ? JSON.stringify(data.errors) : 'Resend delivery rejected') };
    } catch (err) {
      console.error('[AUTH EMAIL] Resend exception:', err.message);
      return { sent: false, provider: 'resend', reason: err.message };
    }
  }

  // 2. Try Brevo (Sendinblue) API (300 free emails/day)
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'GymPulse Security', email: process.env.EMAIL_FROM || 'security@gympulse.app' },
          to: [{ email, name }],
          subject: 'GymPulse — Password Reset Link',
          htmlContent: html
        })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`[AUTH EMAIL] Successfully sent reset link via Brevo to ${email}:`, data.messageId);
        return { sent: true, provider: 'brevo', id: data.messageId };
      }
      console.warn('[AUTH EMAIL] Brevo response error:', data);
    } catch (err) {
      console.error('[AUTH EMAIL] Brevo exception:', err.message);
    }
  }

  // 3. Try SendGrid API
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (sendgridApiKey) {
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: process.env.EMAIL_FROM || 'security@gympulse.app', name: 'GymPulse Security' },
          subject: 'GymPulse — Password Reset Link',
          content: [{ type: 'text/html', value: html }]
        })
      });
      if (res.ok) {
        console.log(`[AUTH EMAIL] Successfully sent reset link via SendGrid to ${email}`);
        return { sent: true, provider: 'sendgrid' };
      }
    } catch (err) {
      console.error('[AUTH EMAIL] SendGrid exception:', err.message);
    }
  }

  console.warn(`[AUTH EMAIL] No active email provider configured (Set RESEND_API_KEY or BREVO_API_KEY in .env). Generated link for ${email}: ${resetLink}`);
  return { sent: false, reason: 'Email API key not configured yet' };
}

/**
 * Multi-provider SMS Delivery (Fast2SMS for India -> Twilio for Global)
 */
async function sendResetSms({ phone, resetLink }) {
  const clean = normalizePhone(phone);
  if (!clean || clean.length < 10) {
    return { sent: false, reason: 'Invalid mobile number' };
  }

  // 1. Try Fast2SMS (India Bulk SMS)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: `GymPulse: Reset your password using this secure link: ${resetLink} (Valid 60 mins).`,
          language: 'english',
          flash: 0,
          numbers: clean
        })
      });
      const data = await res.json();
      if (data.return) {
        console.log(`[AUTH SMS] Successfully dispatched SMS via Fast2SMS to +91 ${clean}`);
        return { sent: true, provider: 'fast2sms' };
      }
      console.warn('[AUTH SMS] Fast2SMS error:', data);
      return { sent: false, provider: 'fast2sms', reason: data.message || (Array.isArray(data.message) ? data.message.join(', ') : 'Fast2SMS error') };
    } catch (err) {
      console.error('[AUTH SMS] Fast2SMS exception:', err.message);
      return { sent: false, provider: 'fast2sms', reason: err.message };
    }
  }

  // 2. Try Twilio (Global SMS)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: twilioFrom,
          To: `+91${clean.slice(-10)}`,
          Body: `GymPulse: Reset your password using this secure link: ${resetLink} (Valid for 60 mins).`
        })
      });
      if (res.ok) {
        console.log(`[AUTH SMS] Successfully dispatched SMS via Twilio to +91 ${clean}`);
        return { sent: true, provider: 'twilio' };
      }
    } catch (err) {
      console.error('[AUTH SMS] Twilio exception:', err.message);
    }
  }

  console.warn(`[AUTH SMS] No active SMS provider configured (Set FAST2SMS_API_KEY or TWILIO_ACCOUNT_SID in .env). Generated link for +91 ${clean}: ${resetLink}`);
  return { sent: false, reason: 'SMS API key not configured yet' };
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
    const proto = req.headers['x-forwarded-proto'] || 'https';
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

      const recipientEmail = gym.owner_email || gym.email;
      const recipientPhone = gym.owner_phone;
      const recipientName = gym.gym_name || gym.owner_name || 'Gym Owner';

      // Dispatch automated Email and SMS in parallel
      const [emailResult, smsResult] = await Promise.all([
        sendResetEmail({ email: recipientEmail, name: recipientName, resetLink, role: 'owner' }),
        sendResetSms({ phone: recipientPhone, resetLink })
      ]);

      if (!emailResult.sent && !smsResult.sent) {
        return res.status(400).json({
          error: `Delivery failed: ${emailResult.reason || 'Email provider error'}. ${smsResult.reason ? `SMS: ${smsResult.reason}` : ''}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset link sent to your registered email! Please check your Inbox and Spam folder.',
        role: 'owner',
        name: recipientName,
        maskedPhone: maskPhone(recipientPhone),
        maskedEmail: maskEmail(recipientEmail),
        emailDispatched: emailResult.sent,
        smsDispatched: smsResult.sent
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

      const recipientEmail = member.email;
      const recipientPhone = member.phone;
      const recipientName = member.name || 'Gym Member';

      // Dispatch automated Email and SMS in parallel
      const [emailResult, smsResult] = await Promise.all([
        sendResetEmail({ email: recipientEmail, name: recipientName, resetLink, role: 'member' }),
        sendResetSms({ phone: recipientPhone, resetLink })
      ]);

      if (!emailResult.sent && !smsResult.sent) {
        return res.status(400).json({
          error: `Delivery failed: ${emailResult.reason || 'Email provider error'}. ${smsResult.reason ? `SMS: ${smsResult.reason}` : ''}`
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password reset link sent to your registered email! Please check your Inbox and Spam folder.',
        role: 'member',
        name: recipientName,
        maskedPhone: maskPhone(recipientPhone),
        maskedEmail: maskEmail(recipientEmail),
        emailDispatched: emailResult.sent,
        smsDispatched: smsResult.sent
      });
    }

  } catch (err) {
    console.error('Forgot password endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error requesting password reset.' });
  }
}
