import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock,
  ArrowRight, ShieldAlert, Eye, EyeOff, X, AlertOctagon, HelpCircle
} from 'lucide-react';
import { INITIAL_SETTINGS } from '../data/mockData';
import SecretAdminAuthModal from './SecretAdminAuthModal';
import { loginMember, loginOwner, loginStaff } from '../lib/db';

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
              onClick={() => setForgotModal({ isOpen: false, role: 'member' })}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
              <HelpCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Reset Account Password</h3>
              <p className="text-xs text-slate-400">
                {forgotModal.role === 'owner' ? 'Gym Owner Recovery' : 'Member Password Assistance'}
              </p>
            </div>

            <div className="bg-[#0B0F17] border border-slate-800 rounded-2xl p-4 text-left text-xs text-slate-300 leading-relaxed space-y-2">
              {forgotModal.role === 'owner' ? (
                <>
                  <p className="font-semibold text-amber-400">Owner Credentials Recovery:</p>
                  <p>
                    Please contact the software Super Admin to reset your gym owner password or issue a temporary login key.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Accounts and temporary keys are controlled securely by the platform creator.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-emerald-400">Member Password Help:</p>
                  <p>
                    Please visit or contact your gym reception / front desk manager to update or retrieve your member login password.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Default member password is the last 4 digits of your registered mobile number if unset.
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setForgotModal({ isOpen: false, role: 'member' })}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Close
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

        {/* Brand Header — Gym Pulse by harshit */}
        <div className="text-center space-y-2 mb-6">
          <button
            type="button"
            onClick={handleLogoTap}
            title="Gym Pulse by harshit"
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer"
          >
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
              <Dumbbell className={`w-7 h-7 text-emerald-400 transition-transform ${logoTaps > 1 ? 'scale-125 text-rose-400 rotate-12' : ''}`} />
            </div>
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Gym Pulse by harshit
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
