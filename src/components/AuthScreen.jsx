import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock,
  ArrowRight, ShieldAlert, Eye, EyeOff, X, AlertOctagon,
  CheckCircle2, Mail, Key, Sparkles
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';
import SecretAdminAuthModal from './SecretAdminAuthModal';
import {
  apiLogin,
  apiVerifyEmail,
  apiForgotPassword,
  apiResetPasswordWithToken
} from '../lib/api';

export default function AuthScreen({
  members = [],
  gymsList = [],
  onLogin,
  gymStatus,
  blockReason,
  onOpenSuperAdmin,
  settings
}) {
  const gymSettings = settings || INITIAL_SETTINGS;

  const [authMode, setAuthMode] = useState('member_login'); // member_login, owner_login, staff_login

  // Form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password Modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Reset Password Modal state (Triggered when URL has ?reset_token=...)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Access Revoked Pop-up Modal state
  const [revokedModal, setRevokedModal] = useState({
    isOpen: false,
    gymName: '',
    ownerName: '',
    phone: '',
    reason: '',
    status: 'BLOCKED'
  });

  // Super Admin Secret Passcode Modal state
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Email verification notification state (displayed when verified via email link)
  const [verifyNotification, setVerifyNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  // Auto-detect Password Reset URL query params (?reset_token=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const rToken = params.get('reset_token');
      if (rToken) {
        setResetToken(rToken);
        setShowResetModal(true);
      }
    } catch (_) {}
  }, []);

  // Auto-detect URL Hash: /#admin, /#/admin, ../#admin, etc.
  useEffect(() => {
    const handleHashCheck = () => {
      const h = (window.location.hash || '').toLowerCase();
      if (h === '#admin' || h === '#/admin' || h.includes('admin')) {
        setShowAdminPassModal(true);
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, []);

  // Secret Keyboard Shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowAdminPassModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-detect Email Verification URL query params (?verify_token=... or ?verify_status=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('verify_token');
      const status = params.get('verify_status');

      if (token) {
        setIsLoading(true);
        apiVerifyEmail(token).then((res) => {
          setIsLoading(false);
          if (res.success) {
            setVerifyNotification({ type: 'success', message: res.message || 'Email verified successfully! You can now log in.' });
          } else {
            setVerifyNotification({ type: 'error', message: res.error || 'Failed to verify email token.' });
          }
        });
      } else if (status === 'success') {
        setVerifyNotification({ type: 'success', message: 'Email verified successfully! You can now log in.' });
      } else if (status === 'expired' || status === 'invalid') {
        setVerifyNotification({ type: 'error', message: 'Verification link has expired or is invalid.' });
      }
    } catch {
      // ignore
    }
  }, []);

  // Secret 5-Tap Logo Trigger
  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 800) {
      const nextCount = logoTaps + 1;
      setLogoTaps(nextCount);
      if (nextCount >= 5) {
        setShowAdminPassModal(true);
        setLogoTaps(0);
      }
    } else {
      setLogoTaps(1);
    }
    setLastTapTime(now);
  };

  const handleForgotSubmit = async (e) => {
    if (e) e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const val = (forgotInput || '').trim();
    if (!val) {
      setForgotError('Please enter your registered 10-digit mobile number or email address.');
      return;
    }

    setForgotLoading(true);
    try {
      const isNumeric = /^\d+$/.test(val.replace(/\D/g, '')) && val.replace(/\D/g, '').length === 10;
      const payload = {
        role: authMode === 'owner_login' ? 'owner' : 'member',
        phone: isNumeric ? val.replace(/\D/g, '').slice(-10) : undefined,
        email: !isNumeric ? val.toLowerCase() : undefined
      };

      const res = await apiForgotPassword(payload);
      if (res.success) {
        setForgotSuccess(res.message || 'Password reset link has been delivered to your registered email address.');
      } else {
        setForgotError(res.error || 'Failed to send password reset email. Please try again.');
      }
    } catch (err) {
      setForgotError(err.message || 'Network error sending reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    if (e) e.preventDefault();
    setResetError('');

    if (!newPassword || newPassword.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match. Please verify both fields.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await apiResetPasswordWithToken({ token: resetToken, newPassword });
      if (res.success) {
        setShowResetModal(false);
        setNewPassword('');
        setConfirmPassword('');
        setVerifyNotification({
          type: 'success',
          message: res.message || 'Password updated successfully! You can now log in.'
        });
        try {
          history.replaceState(null, '', window.location.pathname);
        } catch (_) {}
      } else {
        setResetError(res.error || 'Invalid or expired password reset link.');
      }
    } catch (err) {
      setResetError(err.message || 'Network error updating password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleFormLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    const cleanPhone = loginPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setLoginError('Mobile number must be exactly 10 digits.');
      setIsLoading(false);
      return;
    }

    try {
      const loginRole = authMode === 'owner_login' ? 'owner' : authMode === 'staff_login' ? 'staff' : 'member';
      const res = await apiLogin({
        role: loginRole,
        phone: cleanPhone,
        password: loginPassword,
        pin: loginPassword
      });

      if (res.error) {
        setLoginError(res.error);
        setIsLoading(false);
        return;
      }

      // Check revoked / blocked status
      if (res.gymStatus === 'BLOCKED' || res.gymStatus === 'MAINTENANCE') {
        setRevokedModal({
          isOpen: true,
          gymName: res.gymName || res.gym?.gymName || 'Gym Center',
          ownerName: res.gym?.ownerName || 'Gym Management',
          phone: res.member?.phone || res.gym?.ownerPhone || res.staff?.phone || loginPhone,
          reason: res.blockReason || 'Gym license or monthly subscription suspended by Super Admin.',
          status: res.gymStatus
        });
        setIsLoading(false);
        return;
      }

      if (loginRole === 'member') {
        onLogin({
          role: 'member',
          gymId: res.member?.gymId || res.member?.gym_id || null,
          memberId: res.member?.id,
          name: res.member?.name,
          phone: res.member?.phone,
          email: res.member?.email || '',
          emailVerified: res.member?.emailVerified === true,
          avatar: res.member?.avatar
        });
      } else if (loginRole === 'owner') {
        const foundGym = res.gym;
        onLogin({
          role: 'owner',
          gymId: foundGym.id,
          gymName: foundGym.gymName,
          name: `${foundGym.gymName} — ${foundGym.ownerName || 'Owner'}`,
          ownerName: foundGym.ownerName,
          phone: foundGym.ownerPhone,
          ownerEmail: foundGym.ownerEmail || '',
          emailVerified: foundGym.emailVerified === true,
          avatar: null
        }, foundGym);
      } else if (loginRole === 'staff') {
        onLogin({
          role: 'frontdesk',
          gymId: res.staff?.gym_id || res.staff?.gymId || null,
          staffId: res.staff?.id,
          name: res.staff?.name,
          phone: res.staff?.phone,
          avatar: null
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      setLoginError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col items-center justify-center p-4 selection:bg-emerald-500 selection:text-slate-950 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* Secret Super Admin Auth Modal */}
      <SecretAdminAuthModal
        isOpen={showAdminPassModal}
        onClose={() => {
          setShowAdminPassModal(false);
          if (window.location.hash.includes('admin')) {
            try {
              history.replaceState(null, '', window.location.pathname);
            } catch (_) {}
          }
        }}
        adminMasterKey={gymSettings.superAdminKey || 'Admin@2026Master#'}
        onAuthenticate={() => {
          if (onOpenSuperAdmin) onOpenSuperAdmin();
        }}
      />



      {/* ── ACCESS REVOKED MODAL POPUP (Admin Restrict Reason Modal) ── */}
      {revokedModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141C2B] border border-rose-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-rose-950/60 space-y-5 text-center relative animate-in zoom-in-95">
            <button
              onClick={() => setRevokedModal({ isOpen: false, gymName: '', ownerName: '', phone: '', reason: '', status: 'BLOCKED' })}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <AlertOctagon className="w-9 h-9 animate-bounce" />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-extrabold">
                Gym License Suspended
              </div>
              <h3 className="text-xl font-black text-white">Access Temporarily Restricted</h3>
              <p className="text-xs text-slate-400 font-medium">{revokedModal.gymName}</p>
            </div>

            <div className="bg-[#0B0F17] border border-rose-500/30 rounded-2xl p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Notice from System Administrator:</span>
              </div>
              <div className="text-xs text-slate-200 bg-rose-950/30 p-3 rounded-xl border border-rose-500/20 leading-relaxed font-medium">
                "{revokedModal.reason || 'Your gym software access has been placed on hold by the Super Admin.'}"
              </div>
              <div className="text-[11px] text-slate-400 pt-1 space-y-0.5">
                <div>Owner Contact: <span className="text-white font-semibold">{revokedModal.ownerName}</span></div>
                <div>Account Phone: <span className="font-mono text-emerald-400 font-bold">{revokedModal.phone}</span></div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To settle your subscription or restore system access immediately, please reach out to your software platform provider.
            </p>

            <button
              type="button"
              onClick={() => setRevokedModal({ isOpen: false, gymName: '', ownerName: '', phone: '', reason: '', status: 'BLOCKED' })}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-[#141C2B] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header — GymPulse by Harshit */}
        <div className="text-center space-y-2 mb-6">
          <button
            type="button"
            onClick={handleLogoTap}
            title="GymPulse by Harshit"
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
              <Dumbbell className={`w-7 h-7 text-emerald-400 transition-transform ${logoTaps > 1 ? 'scale-125 text-rose-400 rotate-12' : ''}`} />
            </div>
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">
            GymPulse by Harshit
          </h1>
        </div>

        {/* Role Segment Switcher */}
        <div className="grid grid-cols-3 bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setAuthMode('member_login'); setLoginError(''); setLoginPassword(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'member_login'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Member</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('owner_login'); setLoginError(''); setLoginPassword(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'owner_login'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Owner</span>
          </button>

          <button
            type="button"
            onClick={() => { setAuthMode('staff_login'); setLoginError(''); setLoginPassword(''); }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'staff_login'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Staff</span>
          </button>
        </div>

        {/* Verification Notification Banner */}
        {verifyNotification && (
          <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border ${
            verifyNotification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {verifyNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{verifyNotification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setVerifyNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Feedback Banner */}
        {loginError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{loginError}</span>
          </div>
        )}

        {/* ── LOGIN FORM (Member, Owner, Staff) ── */}
        <form onSubmit={handleFormLogin} className="space-y-4">
          
          {/* Phone Input */}
          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Registered Mobile Number</span>
            </label>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              placeholder="Enter 10-digit mobile number..."
              value={loginPhone}
              onChange={(e) => {
                setLoginPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                setLoginError('');
              }}
              maxLength={10}
              minLength={10}
              required
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-3 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors font-mono"
            />
          </div>

          {/* Password Input (Required for Members, Owners, and Staff) */}
          <div className="space-y-1 text-xs">
            <label className="font-bold text-slate-300 flex items-center gap-1.5">
              <Lock className={`w-3.5 h-3.5 ${authMode === 'owner_login' ? 'text-amber-400' : authMode === 'staff_login' ? 'text-cyan-400' : 'text-emerald-400'}`} />
              <span>
                {authMode === 'owner_login' ? 'Owner Password' :
                 authMode === 'staff_login' ? 'Staff PIN' : 'Member Password'}
              </span>
            </label>

            {/* Dark Password Container with Non-Brightening Eye Icon */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={
                  authMode === 'owner_login' ? 'Enter owner password...' :
                  authMode === 'staff_login' ? 'Enter staff PIN...' :
                  'Enter member password...'
                }
                value={loginPassword}
                onChange={(e) => { setLoginPassword(e.target.value); setLoginError(''); }}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-3 pr-10 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-600 focus:outline-none transition-none cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotError('');
                  setForgotSuccess('');
                  setForgotInput(loginPhone || '');
                }}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Clean Submit Button — Simple "Login" */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
              authMode === 'owner_login'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : authMode === 'staff_login'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <span>Login</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotSuccess(''); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Reset Password</h3>
                <p className="text-xs text-slate-400">Receive reset instructions on your registered email</p>
              </div>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>Reset Email Sent!</span>
                  </div>
                  <p className="leading-relaxed text-slate-200">{forgotSuccess}</p>
                  <p className="text-[11px] text-slate-400">Sent via verified domain <strong className="text-emerald-400">harshit.email</strong></p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowForgotModal(false); setForgotError(''); setForgotSuccess(''); }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                {forgotError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Registered Mobile Number or Email *</label>
                  <input
                    type="text"
                    placeholder="Enter 10-digit mobile or email..."
                    value={forgotInput}
                    onChange={(e) => { setForgotInput(e.target.value); setForgotError(''); }}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    We will send a secure 1-click password reset link to the email associated with this account.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForgotModal(false); setForgotError(''); }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <span>Sending Email...</span>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── SET NEW PASSWORD MODAL (From Email Reset Link) ── */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141C2B] border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95">
            <button
              type="button"
              onClick={() => {
                setShowResetModal(false);
                setResetError('');
                try { history.replaceState(null, '', window.location.pathname); } catch (_) {}
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Create New Password</h3>
                <p className="text-xs text-slate-400">Verified reset link via harshit.email</p>
              </div>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
              {resetError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-300">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password (at least 4 characters)..."
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError(''); }}
                    required
                    minLength={4}
                    className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 pr-10 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Confirm New Password *</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password..."
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
                  required
                  minLength={4}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {resetLoading ? (
                  <span>Updating Password...</span>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Save Password &amp; Continue</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
