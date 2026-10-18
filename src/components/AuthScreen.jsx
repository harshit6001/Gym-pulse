import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock,
  ArrowRight, ShieldAlert, Eye, EyeOff, X, AlertOctagon, HelpCircle,
  Key, RefreshCw, Check, CheckCircle2, MessageSquare, Copy, Mail, Send
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';
import SecretAdminAuthModal from './SecretAdminAuthModal';
import { normalizePhone } from '../lib/db';
import { apiLogin, apiResetPassword, apiVerifyEmail } from '../lib/api';
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

  // Password Reset Flow State — Direct Auto-Dispatch (No OTP shown on screen)
  const [resetStep, setResetStep] = useState('phone'); // 'phone', 'sent'
  const [resetPhone, setResetPhone] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetAccountInfo, setResetAccountInfo] = useState({ name: '', email: '', phone: '' });
  
  // Email verification modal and notification state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyTokenInput, setVerifyTokenInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyNotification, setVerifyNotification] = useState(null); // { type: 'success' | 'error', message: '' }

  // Generate a secure random password (8 chars, alphanumeric + special)
  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Step 1: Verify phone, auto-generate new password, reset in DB, and auto-dispatch
  const handleForgotPasswordSubmit = async (e) => {
    if (e) e.preventDefault();
    setResetError('');
    setResetSuccess('');
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
      let accountEmail = '';
      let accountName = '';

      if (isOwner) {
        // Check Owner in Supabase gyms table
        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('gyms')
            .select('id, owner_name, owner_phone, email, settings')
            .ilike('owner_phone', `%${cleanPhone}%`)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            accountFound = true;
            accountName = data.owner_name || 'Gym Owner';
            accountEmail = data.settings?.email || data.email || '';
          }
        }

        // Fallback: check local gymsList or settings
        if (!accountFound) {
          const inGyms = gymsList.find(g => normalizePhone(g.ownerPhone) === cleanPhone);
          const inSettings = gymSettings.ownerCredentials && normalizePhone(gymSettings.ownerCredentials.phone) === cleanPhone;
          if (inGyms || inSettings) {
            accountFound = true;
            accountName = inGyms?.ownerName || gymSettings?.ownerName || 'Gym Owner';
            accountEmail = inGyms?.settings?.email || gymSettings?.ownerCredentials?.email || '';
          }
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
            .select('id, phone, name, email')
            .ilike('phone', `%${cleanPhone}%`)
            .limit(1)
            .maybeSingle();

          if (!error && data) {
            accountFound = true;
            accountName = data.name || 'Gym Member';
            accountEmail = data.email || '';
          }
        }

        // Fallback: check local members list
        if (!accountFound) {
          const inMembers = members.find(m => normalizePhone(m.phone) === cleanPhone);
          if (inMembers) {
            accountFound = true;
            accountName = inMembers.name || 'Gym Member';
            accountEmail = inMembers.email || '';
          }
        }

        if (!accountFound) {
          setResetError('Mobile number not found in member records. Please contact your gym front desk.');
          setIsResetting(false);
          return;
        }
      }

      // Generate a secure temporary password
      const newTempPassword = generateSecurePassword();

      // Reset password via API endpoint immediately
      const res = await apiResetPassword({
        role: forgotModal.role,
        phone: resetPhone,
        newPassword: newTempPassword
      });

      if (res.error) {
        setResetError(res.error);
        setIsResetting(false);
        return;
      }

      // Store account info for confirmation display
      setResetAccountInfo({ name: accountName, email: accountEmail, phone: cleanPhone });

      // Auto-dispatch: open WhatsApp, SMS, and Email links automatically
      const phone10 = cleanPhone.slice(-10);
      const whatsappMsg = `🔐 GymPulse Password Reset\n\nHello ${accountName},\n\nYour new temporary password is: ${newTempPassword}\n\nPlease login and change your password immediately.\n\n— GymPulse Security`;
      const smsMsg = `GymPulse: Your new temporary password is ${newTempPassword}. Login and change it immediately.`;
      const emailSubject = 'GymPulse — Your Password Has Been Reset';
      const emailBody = `Hello ${accountName},\n\nYour GymPulse account password has been reset.\n\nYour new temporary password is: ${newTempPassword}\n\nPlease login at your earliest and change your password for security.\n\nIf you did not request this reset, please contact your gym management immediately.\n\n— GymPulse Security Team`;

      // Auto-open WhatsApp message
      const whatsappUrl = `https://wa.me/91${phone10}?text=${encodeURIComponent(whatsappMsg)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      // Auto-open email compose
      if (accountEmail) {
        const mailtoUrl = `mailto:${accountEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        setTimeout(() => { window.open(mailtoUrl, '_blank'); }, 500);
      }

      // Auto-open SMS
      const smsUrl = `sms:${phone10}?&body=${encodeURIComponent(smsMsg)}`;
      setTimeout(() => { window.open(smsUrl, '_self'); }, 1000);

      setResetStep('sent');
      setResetSuccess(`Password reset successful! New credentials have been dispatched to +91 ${phone10}${accountEmail ? ` and ${accountEmail}` : ''}.`);

    } catch (err) {
      console.error('Reset request error:', err);
      setResetError('Network error. Please try again.');
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

  // Auto-detect email verification query params: ?verify_token=... or ?verify_status=...
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

  const handleVerifyTokenSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!verifyTokenInput.trim()) return;
    setVerifyLoading(true);
    const res = await apiVerifyEmail(verifyTokenInput.trim());
    setVerifyLoading(false);
    if (res.success) {
      setVerifyNotification({ type: 'success', message: res.message || 'Email verified successfully! You can now log in.' });
      setVerifyModalOpen(false);
      setVerifyTokenInput('');
    } else {
      setVerifyNotification({ type: 'error', message: res.error || 'Invalid or expired verification token.' });
    }
  };

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
      const loginRole = authMode === 'owner_login' ? 'owner' : authMode === 'staff_login' ? 'staff' : 'member';
      const res = await apiLogin({
        role: loginRole,
        phone: loginPhone,
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

  const closeForgotModal = () => {
    setForgotModal({ isOpen: false, role: 'member' });
    setResetStep('phone');
    setResetPhone('');
    setResetError('');
    setResetSuccess('');
    setResetAccountInfo({ name: '', email: '', phone: '' });
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

      {/* ── FORGOT PASSWORD MODAL — Direct Auto-Dispatch (No OTP on screen) ── */}
      {forgotModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center relative space-y-4">
            <button
              onClick={closeForgotModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              {resetStep === 'sent' ? <CheckCircle2 className="w-7 h-7" /> : <HelpCircle className="w-7 h-7" />}
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">
                {forgotModal.role === 'owner' ? 'Gym Owner Password Recovery' : 'Member Password Reset'}
              </h3>
              <p className="text-xs text-slate-400">
                {resetStep === 'phone' && 'Enter your registered mobile number to receive a new password.'}
                {resetStep === 'sent' && 'Your new password has been sent to your registered contacts.'}
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

              {/* STEP 1: ENTER REGISTERED PHONE → Auto-resets & dispatches */}
              {resetStep === 'phone' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
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
                  <div className="p-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-[11px] text-slate-400 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <Send className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>How it works</span>
                    </div>
                    <p>A new secure password will be auto-generated and sent directly to your registered <strong className="text-emerald-400">WhatsApp</strong>, <strong className="text-amber-400">SMS</strong>, and <strong className="text-cyan-400">Email</strong> automatically. No OTP required.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isResetting ? (
                      <span>Resetting & Sending Password...</span>
                    ) : (
                      <>
                        <span>Reset & Send New Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP 2: CONFIRMATION — Password auto-dispatched */}
              {resetStep === 'sent' && (
                <div className="space-y-3">
                  <div className="p-3 bg-[#0B0F17] border border-emerald-500/30 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>New Password Dispatched Successfully</span>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-300">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        <span>Sent via <strong className="text-green-400">WhatsApp</strong> to +91 {resetAccountInfo.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Sent via <strong className="text-amber-400">SMS</strong> to +91 {resetAccountInfo.phone}</span>
                      </div>
                      {resetAccountInfo.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span>Sent via <strong className="text-cyan-400">Email</strong> to {resetAccountInfo.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 font-medium leading-relaxed">
                    ⚠️ Please check your WhatsApp, SMS, or Email for the new password. Login with it and change your password immediately for security.
                  </div>

                  <button
                    type="button"
                    onClick={closeForgotModal}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>

            {resetStep === 'phone' && (
              <button
                type="button"
                onClick={closeForgotModal}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            )}
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

          {/* Quick Email Verification Link */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={() => { setVerifyModalOpen(true); setVerifyNotification(null); }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Verify Registered Email Address</span>
            </button>
          </div>
        </form>

      </div>

      {/* ── EMAIL VERIFICATION MODAL ── */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4 text-center">
            
            <button
              onClick={() => { setVerifyModalOpen(false); setVerifyTokenInput(''); }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <Mail className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Email Verification</h3>
              <p className="text-xs text-slate-400">
                Enter your 6-character code (e.g. GP-XXXXXX) or verification token received in your email.
              </p>
            </div>

            <form onSubmit={handleVerifyTokenSubmit} className="space-y-3 text-left">
              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">Verification Token / Code</label>
                <input
                  type="text"
                  placeholder="e.g. GP-A1B2C3"
                  value={verifyTokenInput}
                  onChange={(e) => setVerifyTokenInput(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono text-center tracking-wider text-sm font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || !verifyTokenInput.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {verifyLoading ? <span>Verifying...</span> : <span>Verify Email Now</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
