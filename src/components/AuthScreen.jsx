import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock,
  ArrowRight, ShieldAlert, Eye, EyeOff, X, AlertOctagon, HelpCircle,
  Key, RefreshCw, Check, CheckCircle2, MessageSquare, Copy
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';
import SecretAdminAuthModal from './SecretAdminAuthModal';
import { loginMember, loginOwner, loginStaff, normalizePhone, resetAccountPassword } from '../lib/db';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

  // Forgot Password Modal state (for member & owner only)
  const [forgotModal, setForgotModal] = useState({
    isOpen: false,
    role: 'member'
  });

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

  // Password Reset Flow State (Proper 6-digit OTP Authentication)
  const [resetStep, setResetStep] = useState('phone'); // 'phone', 'verify', 'newpass'
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [generatedOtpCode, setGeneratedOtpCode] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetConfirmPass, setResetConfirmPass] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [copiedOtp, setCopiedOtp] = useState(false);

  // OTP Countdown Timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Step 1: Verify phone and generate 6-digit OTP
  const handleResetStepPhone = async (e) => {
    if (e) e.preventDefault();
    setResetError('');
    setIsResetting(true);
    const cleanPhone = normalizePhone(resetPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setResetError('Please enter a valid 10-digit registered mobile number.');
      setIsResetting(false);
      return;
    }

    try {
      const isOwner = forgotModal.role === 'owner';
      let accountFound = false;

      if (isOwner) {
        // Check Owner in Supabase gyms table
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('gyms')
            .select('id, owner_name, owner_phone')
            .ilike('owner_phone', `%${cleanPhone}%`)
            .limit(1)
            .maybeSingle();

          if (!error && data) accountFound = true;
        }

        // Fallback: check local gymsList or settings
        if (!accountFound) {
          const inGymsList = gymsList.some(g => normalizePhone(g.ownerPhone) === cleanPhone);
          const inSettings = gymSettings.ownerCredentials && normalizePhone(gymSettings.ownerCredentials.phone) === cleanPhone;
          if (inGymsList || inSettings) accountFound = true;
        }

        if (!accountFound) {
          setResetError('No Gym Owner found with this registered mobile number.');
          setIsResetting(false);
          return;
        }

      } else {
        // Check Member in Supabase members table
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('members')
            .select('id, phone, name')
            .ilike('phone', `%${cleanPhone}%`)
            .limit(1)
            .maybeSingle();

          if (!error && data) accountFound = true;
        }

        // Fallback: check local members list
        if (!accountFound) {
          const inMembers = members.some(m => normalizePhone(m.phone) === cleanPhone);
          if (inMembers) accountFound = true;
        }

        if (!accountFound) {
          setResetError('Mobile number not found in member records. Please contact your gym front desk.');
          setIsResetting(false);
          return;
        }
      }

      // Generate a secure 6-digit random OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      setGeneratedOtpCode(otp);
      setOtpTimer(60);
      setResetCode('');
      setResetStep('verify');

    } catch (err) {
      console.error('Reset request error:', err);
      setResetError('Network error. Please try again.');
    }
    setIsResetting(false);
  };

  // Step 2: Validate 6-digit OTP code
  const handleResetStepVerify = (e) => {
    e.preventDefault();
    setResetError('');
    if (!resetCode.trim()) {
      setResetError('Please enter the 6-digit verification OTP.');
      return;
    }
    if (resetCode.trim() !== generatedOtpCode) {
      setResetError('Incorrect verification code. Please check the 6-digit OTP and try again.');
      return;
    }
    setResetStep('newpass');
  };

  // Step 3: Set and confirm new password
  const handleResetStepNewPass = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsResetting(true);

    const newPass = resetNewPass.trim();
    const confirmPass = resetConfirmPass.trim();

    if (newPass.length < 4) {
      setResetError('Password must be at least 4 characters long.');
      setIsResetting(false);
      return;
    }
    if (newPass !== confirmPass) {
      setResetError('Passwords do not match. Please re-enter.');
      setIsResetting(false);
      return;
    }

    try {
      const res = await resetAccountPassword({
        role: forgotModal.role,
        phone: resetPhone,
        newPassword: newPass
      });

      if (res.error) {
        setResetError(res.error);
        setIsResetting(false);
        return;
      }

      setResetSuccess('Password reset successfully! You can now login with your new password.');
      setLoginPassword(newPass);

      setTimeout(() => {
        setForgotModal({ isOpen: false, role: 'member' });
        setResetStep('phone');
        setResetPhone('');
        setResetCode('');
        setGeneratedOtpCode('');
        setResetNewPass('');
        setResetConfirmPass('');
        setResetSuccess('');
      }, 2500);

    } catch (err) {
      console.error('Password reset error:', err);
      setResetError('Network error while updating password. Please try again.');
    }
    setIsResetting(false);
  };

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

  const handleFormLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      if (authMode === 'member_login') {
        const res = await loginMember(loginPhone, loginPassword);
        if (res.error) {
          setLoginError(res.error);
          return;
        }

        // Check if gym access is revoked
        if (res.gymStatus === 'BLOCKED' || res.gymStatus === 'MAINTENANCE') {
          setRevokedModal({
            isOpen: true,
            gymName: res.gymName || 'Gym Center',
            ownerName: 'Gym Management',
            phone: res.member.phone,
            reason: res.blockReason || 'Gym license or monthly subscription suspended by Super Admin.',
            status: res.gymStatus
          });
          return;
        }

        onLogin({
          role: 'member',
          gymId: res.member.gymId || null,
          memberId: res.member.id,
          name: res.member.name,
          phone: res.member.phone,
          avatar: res.member.avatar
        });

      } else if (authMode === 'owner_login') {
        const res = await loginOwner(loginPhone, loginPassword);
        if (res.error) {
          setLoginError(res.error);
          return;
        }

        const foundGym = res.gym;

        // Check if Admin has revoked/blocked this gym
        if (foundGym.status === 'BLOCKED' || foundGym.status === 'MAINTENANCE') {
          setRevokedModal({
            isOpen: true,
            gymName: foundGym.gymName,
            ownerName: foundGym.ownerName || 'Gym Owner',
            phone: foundGym.ownerPhone || loginPhone,
            reason: foundGym.blockReason || 'Monthly software subscription unpaid or license suspended by Super Admin.',
            status: foundGym.status
          });
          return;
        }

        // Successful Live Owner Login
        onLogin({
          role: 'owner',
          gymId: foundGym.id,
          gymName: foundGym.gymName,
          name: `${foundGym.gymName} — ${foundGym.ownerName || 'Owner'}`,
          ownerName: foundGym.ownerName,
          phone: foundGym.ownerPhone,
          avatar: null
        }, foundGym);

      } else if (authMode === 'staff_login') {
        const res = await loginStaff(loginPhone, loginPassword);
        if (res.error) {
          setLoginError(res.error);
          return;
        }

        if (res.gymStatus === 'BLOCKED' || res.gymStatus === 'MAINTENANCE') {
          setRevokedModal({
            isOpen: true,
            gymName: 'Gym Center',
            ownerName: 'Gym Management',
            phone: res.staff.phone,
            reason: res.blockReason || 'Gym license suspended by Super Admin.',
            status: res.gymStatus
          });
          return;
        }

        onLogin({
          role: 'frontdesk',
          gymId: res.staff.gym_id || null,
          name: res.staff.name,
          phone: res.staff.phone,
          avatar: null,
          staffId: res.staff.id
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

      {/* ── FORGOT PASSWORD MODAL (Members and Owners only) ── */}
      {forgotModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative space-y-4">
            <button
              onClick={() => { setForgotModal({ isOpen: false, role: 'member' }); setResetStep('phone'); setResetPhone(''); setResetCode(''); setResetNewPass(''); setResetError(''); setResetSuccess(''); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <HelpCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {forgotModal.role === 'owner' ? 'Gym Owner Password Recovery' : 'Member Password Reset'}
              </h3>
              <p className="text-xs text-slate-400">
                {resetStep === 'phone' && 'Step 1 of 3: Verify Registered Phone'}
                {resetStep === 'verify' && 'Step 2 of 3: Enter 6-digit Verification OTP'}
                {resetStep === 'newpass' && 'Step 3 of 3: Create New Password'}
              </p>
            </div>

            <div className="space-y-3 text-left">
              {resetError && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{resetError}</span>
                </div>
              )}
              {resetSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              {/* STEP 1: ENTER REGISTERED PHONE */}
              {resetStep === 'phone' && (
                <form onSubmit={handleResetStepPhone} className="space-y-3">
                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{forgotModal.role === 'owner' ? 'Owner Registered Mobile' : 'Member Registered Mobile'}</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit registered mobile..."
                      value={resetPhone}
                      onChange={(e) => { setResetPhone(e.target.value); setResetError(''); }}
                      maxLength={13}
                      required
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A 6-digit verification OTP will be generated to securely reset your credentials.
                  </p>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isResetting ? (
                      <span>Verifying account...</span>
                    ) : (
                      <>
                        <span>Send 6-Digit Verification OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: VERIFY 6-DIGIT OTP */}
              {resetStep === 'verify' && (
                <form onSubmit={handleResetStepVerify} className="space-y-3">
                  {/* Generated OTP Showcase Box */}
                  <div className="p-3 bg-[#0B0F17] border border-emerald-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">One-Time Verification OTP:</span>
                      <span className="font-mono text-emerald-400 font-bold">Valid for 10m</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#141C2B] p-2 rounded-xl border border-slate-800">
                      <span className="font-mono text-lg font-black tracking-widest text-amber-400 pl-2">
                        {generatedOtpCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedOtpCode);
                          setCopiedOtp(true);
                          setTimeout(() => setCopiedOtp(false), 2000);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                      >
                        {copiedOtp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Quick WhatsApp / SMS Send Links */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                      <a
                        href={`https://wa.me/91${resetPhone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                          `🔐 Your GymPulse Verification OTP is ${generatedOtpCode}. Valid for 10 minutes. Do not share with anyone.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1.5 px-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-center font-bold flex items-center justify-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Send to WhatsApp</span>
                      </a>

                      <a
                        href={`sms:${resetPhone.replace(/\D/g, '').slice(-10)}?&body=${encodeURIComponent(
                          `Your GymPulse verification OTP is ${generatedOtpCode}`
                        )}`}
                        className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-center font-bold flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Send via SMS</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-300">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={resetCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setResetCode(val);
                        setResetError('');
                      }}
                      maxLength={6}
                      required
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-base text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono tracking-widest text-center font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting || resetCode.length < 6}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    Verify OTP Code
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      disabled={otpTimer > 0}
                      onClick={handleResetStepPhone}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 font-semibold disabled:text-slate-600 transition-colors inline-flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${otpTimer > 0 ? '' : 'text-emerald-400'}`} />
                      <span>{otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : 'Resend OTP Code'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 3: CREATE NEW PASSWORD */}
              {resetStep === 'newpass' && (
                <form onSubmit={handleResetStepNewPass} className="space-y-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 font-medium">
                    ✅ Identity verified for <strong>{resetPhone}</strong>. Set your new secret password below.
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-300">New Password</label>
                    <div className="relative">
                      <input
                        type={showResetPass ? 'text' : 'password'}
                        placeholder="Enter new password (min 4 chars)..."
                        value={resetNewPass}
                        onChange={(e) => { setResetNewPass(e.target.value); setResetError(''); }}
                        minLength={4}
                        required
                        className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 pr-9 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        className="absolute right-2.5 top-3 text-slate-500 hover:text-slate-300"
                      >
                        {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-300">Confirm New Password</label>
                    <input
                      type={showResetPass ? 'text' : 'password'}
                      placeholder="Re-enter new password..."
                      value={resetConfirmPass}
                      onChange={(e) => { setResetConfirmPass(e.target.value); setResetError(''); }}
                      minLength={4}
                      required
                      className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isResetting ? 'Saving New Password...' : 'Save Password & Login'}
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setForgotModal({ isOpen: false, role: 'member' });
                setResetStep('phone');
                setResetPhone('');
                setResetCode('');
                setGeneratedOtpCode('');
                setResetNewPass('');
                setResetConfirmPass('');
                setResetError('');
                setResetSuccess('');
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
              placeholder="Enter 10-digit mobile number..."
              value={loginPhone}
              onChange={(e) => { setLoginPhone(e.target.value); setLoginError(''); }}
              maxLength={13}
              required
              className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-3 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Password Input (Required for Members, Owners, and Staff) */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className={`w-3.5 h-3.5 ${authMode === 'owner_login' ? 'text-amber-400' : authMode === 'staff_login' ? 'text-cyan-400' : 'text-emerald-400'}`} />
                <span>
                  {authMode === 'owner_login' ? 'Owner Password' :
                   authMode === 'staff_login' ? 'Staff PIN' : 'Member Password'}
                </span>
              </label>

              {/* Forgot Password Link (for Members and Owners only) */}
              {(authMode === 'member_login' || authMode === 'owner_login') && (
                <button
                  type="button"
                  onClick={() => setForgotModal({ isOpen: true, role: authMode === 'owner_login' ? 'owner' : 'member' })}
                  className="text-[11px] text-slate-400 hover:text-slate-300 underline font-semibold transition-colors"
                >
                  Forgot Password?
                </button>
              )}
            </div>

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
    </div>
  );
}
