/**
 * GymPulse Live API Service Layer
 * Unified endpoints for Login, Password Reset, and Email Verification.
 * Automatically communicates with backend endpoints (/api/login, /api/reset-password, /api/verify-email)
 * with robust offline/client fallback.
 */

import {
  loginMember,
  loginOwner,
  loginStaff,
  resetAccountPassword,
  requestPasswordResetLink,
  verifyResetToken,
  completePasswordResetWithToken,
  maskPhone,
  maskEmail,
  verifyEmailToken,
  generateVerificationToken,
  generateAndSaveVerificationToken,
  markEmailVerified,
  normalizePhone
} from './db';

const API_BASE = '';

/**
 * Helper to execute POST requests to API endpoints
 */
async function postApi(endpoint, payload) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    }
    // Non-JSON response (e.g. static html 404 from SPA router)
    return { ok: false, status: res.status, fallback: true };
  } catch (err) {
    // Network offline or endpoint unreachable
    return { ok: false, error: err.message, fallback: true };
  }
}

/**
 * ─────────────────────────────────────────────
 * POST /api/login
 * Validates member, owner, or staff credentials
 * ─────────────────────────────────────────────
 */
export async function apiLogin({ role = 'member', phone, password, pin }) {
  // 1. Try server endpoint first
  const serverResult = await postApi('/api/login', { role, phone, password, pin });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  // 2. Seamless client / local database fallback
  if (role === 'owner') {
    const res = await loginOwner(phone, password);
    if (res.error) return { error: res.error };
    return {
      success: true,
      role: 'owner',
      gym: res.gym,
      gymStatus: res.gym?.status || 'ACTIVE',
      blockReason: res.gym?.blockReason || '',
      emailVerified: res.gym?.emailVerified === true,
      token: `gp_jwt_owner_${res.gym?.id}_${Date.now()}`
    };
  } else if (role === 'staff') {
    const res = await loginStaff(phone, pin || password);
    if (res.error) return { error: res.error };
    return {
      success: true,
      role: 'staff',
      staff: res.staff,
      gymStatus: res.gymStatus,
      blockReason: res.blockReason,
      token: `gp_jwt_staff_${res.staff?.id}_${Date.now()}`
    };
  } else {
    // Member login
    const res = await loginMember(phone, password);
    if (res.error) return { error: res.error };
    return {
      success: true,
      role: 'member',
      member: res.member,
      gymStatus: res.gymStatus,
      blockReason: res.blockReason,
      gymName: res.gymName,
      emailVerified: res.member?.emailVerified === true,
      token: `gp_jwt_member_${res.member?.id}_${Date.now()}`
    };
  }
}

/**
 * ─────────────────────────────────────────────
 * POST /api/forgot-password
 * Requests a secure password reset link for Member or Owner
 * ─────────────────────────────────────────────
 */
export async function apiForgotPassword({ role = 'member', identifier }) {
  // 1. Try server endpoint first
  const serverResult = await postApi('/api/forgot-password', { role, identifier });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  // 2. Client / database fallback
  return await requestPasswordResetLink({ role, identifier });
}

/**
 * ─────────────────────────────────────────────
 * GET /api/reset-password?token=...
 * Validates reset token
 * ─────────────────────────────────────────────
 */
export async function apiVerifyResetToken(token) {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { valid: false, error: 'Missing password reset token.' };
  }

  try {
    const res = await fetch(`${API_BASE}/api/reset-password?token=${encodeURIComponent(cleanToken)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok) return data;
      return { valid: false, error: data.error || 'Invalid reset token.' };
    }
  } catch (err) {
    // Fallback to client DB
  }

  return await verifyResetToken(cleanToken);
}

/**
 * ─────────────────────────────────────────────
 * POST /api/reset-password
 * Completes reset with token + newPassword
 * ─────────────────────────────────────────────
 */
export async function apiCompleteResetPassword({ token, newPassword }) {
  const serverResult = await postApi('/api/reset-password', { token, newPassword });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  return await completePasswordResetWithToken({ token, newPassword });
}

/**
 * ─────────────────────────────────────────────
 * POST /api/reset-password (Legacy direct phone reset)
 * Resets member or gym owner account password
 * ─────────────────────────────────────────────
 */
export async function apiResetPassword({ role = 'member', phone, newPassword }) {
  // 1. Try server endpoint first
  const serverResult = await postApi('/api/reset-password', { role, phone, newPassword });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  // 2. Client / database fallback
  return await resetAccountPassword({ role, phone, newPassword });
}

/**
 * ─────────────────────────────────────────────
 * POST /api/verify-email
 * Verifies email using verification token or code
 * ─────────────────────────────────────────────
 */
export async function apiVerifyEmail(token) {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return { error: 'Please enter a valid verification code or token.' };
  }

  // 1. Try server endpoint first
  const serverResult = await postApi('/api/verify-email', { token: cleanToken });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  // 2. Client / database fallback
  return await verifyEmailToken(cleanToken);
}

/**
 * ─────────────────────────────────────────────
 * POST /api/send-verification
 * Sends / generates email verification token & link
 * ─────────────────────────────────────────────
 */
export async function apiSendVerification({ memberId, role = 'member', email, phone }) {
  // 1. Try server endpoint first
  const serverResult = await postApi('/api/send-verification', { memberId, role, email, phone });
  if (serverResult && !serverResult.fallback) {
    if (serverResult.ok && serverResult.data?.success) {
      return serverResult.data;
    }
    if (serverResult.data?.error) {
      return { error: serverResult.data.error };
    }
  }

  // 2. Client / database fallback
  return await generateAndSaveVerificationToken({ memberId, role });
}

export {
  verifyEmailToken,
  generateVerificationToken,
  generateAndSaveVerificationToken,
  markEmailVerified,
  maskPhone,
  maskEmail,
  requestPasswordResetLink,
  verifyResetToken,
  completePasswordResetWithToken
};
