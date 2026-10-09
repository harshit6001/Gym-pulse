import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock, UserPlus,
  ArrowRight, CheckCircle2, Sparkles, Key, ShieldAlert, Eye, EyeOff, X, AlertOctagon, HelpCircle
} from 'lucide-react';
import { PLANS, INITIAL_SETTINGS } from '../data/mockData';
import SecretAdminAuthModal from './SecretAdminAuthModal';

export default function AuthScreen({
  members,
  gymsList = [],
  onLogin,
  onRegisterNewMember,
  gymStatus,
  blockReason,
  onOpenSuperAdmin,
  settings
}) {
  const gymSettings = settings || INITIAL_SETTINGS;

  const [authMode, setAuthMode] = useState('member_login');

  // Form state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Access Revoked Pop-up Modal state
  const [revokedModal, setRevokedModal] = useState({
    isOpen: false,
    gymName: '',
    ownerName: '',
    phone: '',
    reason: '',
    status: 'BLOCKED'
  });

  // Register form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPlanId, setRegPlanId] = useState('p-2');

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
        // Member login: lookup by phone number
        if (!loginPhone.trim() || loginPhone.trim().length < 10) {
          setLoginError('Please enter a valid 10-digit mobile number.');
          return;
        }

        const foundMember = members.find(m =>
          m.phone.replace(/\s+/g, '').includes(loginPhone.trim())
        );

        if (!foundMember) {
          setLoginError('Mobile number not registered. Please register a new account or contact the gym.');
          return;
        }

        // Check if gym access is revoked
        if (gymStatus === 'BLOCKED') {
          setRevokedModal({
            isOpen: true,
            gymName: gymSettings.gymName || 'FitPulse Gym',
            ownerName: gymSettings.ownerName || 'Gym Owner',
            phone: loginPhone.trim(),
            reason: blockReason || gymSettings.blockReason || 'Gym license or monthly subscription suspended by Super Admin.',
            status: 'BLOCKED'
          });
          return;
        }

        onLogin({
          role: 'member',
          memberId: foundMember.id,
          name: foundMember.name,
          phone: foundMember.phone,
          avatar: foundMember.avatar
        });

      } else if (authMode === 'owner_login') {
        // Owner login: checks against all gyms in multi-tenant registry + settings
        const cleanPhone = loginPhone.trim().replace(/\s+/g, '');
        const cleanPass = loginPassword.trim();

        const foundGym = gymsList.find(g => (g.ownerPhone || '').replace(/\s+/g, '') === cleanPhone) ||
          ((gymSettings.ownerCredentials?.phone || '').replace(/\s+/g, '') === cleanPhone ? {
            id: 'gym-1',
            gymName: gymSettings.gymName,
            location: gymSettings.location,
            ownerName: gymSettings.ownerName || gymSettings.ownerCredentials?.name || 'Owner',
            ownerPhone: gymSettings.ownerCredentials?.phone,
            ownerPassword: gymSettings.ownerCredentials?.password,
            tempPassword: gymSettings.ownerCredentials?.tempPassword,
            status: gymSettings.gymStatus,
            blockReason: gymSettings.blockReason
          } : null);

        if (!foundGym) {
          setLoginError('Mobile number not registered as gym owner. Accounts are created by Super Admin.');
          return;
        }

        // Verify password against current password OR temporary password issued by admin
        const isPasswordCorrect =
          (foundGym.ownerPassword && foundGym.ownerPassword === cleanPass) ||
          (foundGym.tempPassword && foundGym.tempPassword === cleanPass) ||
          (cleanPass === 'owner123' && !foundGym.ownerPassword);

        if (!isPasswordCorrect) {
          setLoginError('Incorrect password. If you updated your password or received a temporary password, please enter it.');
          return;
        }

        // Check if Admin has revoked/blocked this gym
        if (foundGym.status === 'BLOCKED' || foundGym.status === 'MAINTENANCE') {
          setRevokedModal({
            isOpen: true,
            gymName: foundGym.gymName,
            ownerName: foundGym.ownerName || 'Gym Owner',
            phone: foundGym.ownerPhone || cleanPhone,
            reason: foundGym.blockReason || 'Monthly software subscription unpaid or license suspended by Super Admin.',
            status: foundGym.status
          });
          return;
        }

        // Successful Login
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
        // Staff login: phone + PIN
        const staffList = JSON.parse(localStorage.getItem('fitpulse_staff') || '[]');
        const defaultStaff = [{ id: 'staff-1', name: 'Rohan Verma', phone: '9876511001', pin: '0000', status: 'ACTIVE', role: 'Front-Desk Executive' }];
        const allStaff = staffList.length ? staffList : defaultStaff;

        const foundStaff = allStaff.find(s =>
          s.phone.trim() === loginPhone.trim() &&
          s.pin === loginPassword.trim() &&
          s.status === 'ACTIVE'
        );

        if (!foundStaff) {
          setLoginError('Invalid staff credentials. Check phone number and PIN with your gym manager.');
          return;
        }

        if (gymStatus === 'BLOCKED') {
          setRevokedModal({
            isOpen: true,
            gymName: gymSettings.gymName || 'FitPulse Gym',
            ownerName: gymSettings.ownerName || 'Gym Owner',
            phone: foundStaff.phone,
            reason: blockReason || gymSettings.blockReason || 'Gym license suspended by Super Admin.',
            status: 'BLOCKED'
          });
          return;
        }

        onLogin({
          role: 'frontdesk',
          name: foundStaff.name,
          phone: foundStaff.phone,
          avatar: null,
          staffId: foundStaff.id
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    if (!regName.trim()) {
      setLoginError('Please enter your full name.');
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 10) {
      setLoginError('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    const selectedPlan = PLANS.find(p => p.id === regPlanId) || PLANS[1];
    const todayISO = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endDate.toISOString().split('T')[0];

    const newMemberData = {
      id: `m-${Date.now()}`,
      name: regName.trim(),
      phone: regPhone.trim(),
      email: regEmail.trim() || `${regName.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(regName.trim())}&background=0B0F17&color=34d399&size=150`,
      status: 'active',
      membership: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        startDate: todayISO,
        endDate: endDateStr,
        autoRenew: false,
        amountPaid: selectedPlan.finalPrice
      },
      weeklyGoalDays: 4,
      streak: { current: 0, max: 0, restDaysApprovedThisWeek: 0 },
      lastCheckIn: null,
      absentDaysCount: 0,
      assignedTrainer: 'tr-1',
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: 'New member registration via web app.'
    };

    onRegisterNewMember(newMemberData, selectedPlan, 'UPI_GPAY');
  };

  return (
    <div className="min-h-screen min-h-dvh bg-[#0B0F17] overflow-y-auto">

      {/* Animated BG gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative flex flex-col items-center justify-start sm:justify-center min-h-screen min-h-dvh p-4 py-8">
        <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">

        {/* Brand Logo with 5-Tap Secret Admin Trigger */}
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={handleLogoTap}
            title="FitPulse Gym OS"
            className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 rounded-2xl mx-auto shadow-lg shadow-emerald-500/25 transition-transform active:scale-90 cursor-pointer select-none relative group"
          >
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
              <Dumbbell className={`w-8 h-8 text-emerald-400 transition-transform ${logoTaps > 1 ? 'scale-110 rotate-12 text-rose-400' : ''}`} />
            </div>
            {logoTaps >= 2 && logoTaps < 5 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[9px] text-white font-mono font-bold rounded-full flex items-center justify-center animate-ping">
                {5 - logoTaps}
              </span>
            )}
          </button>
          <h2 className="text-2xl font-black text-white tracking-tight">FitPulse Gym OS</h2>
          <p className="text-xs text-slate-400">{gymSettings.gymName} · {gymSettings.location}</p>
        </div>

        {/* Role Switcher */}
        <div className="flex bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 text-xs font-bold gap-1">
          {[
            { mode: 'member_login', label: 'Member', activeClass: 'bg-emerald-500 text-slate-950' },
            { mode: 'owner_login', label: 'Owner', activeClass: 'bg-amber-500 text-slate-950' },
            { mode: 'staff_login', label: 'Front Desk', activeClass: 'bg-cyan-500 text-slate-950' },
          ].map(({ mode, label, activeClass }) => (
            <button
              key={mode}
              onClick={() => { setAuthMode(mode); setLoginError(''); setLoginPhone(''); setLoginPassword(''); }}
              className={`flex-1 py-2 rounded-xl transition-colors cursor-pointer ${
                authMode === mode || (mode === 'member_login' && authMode === 'member_register')
                  ? activeClass + ' shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── MEMBER LOGIN ── */}
        {authMode === 'member_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Registered Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number..."
                  value={loginPhone}
                  onChange={e => setLoginPhone(e.target.value)}
                  required
                  maxLength={10}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{loginError}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? <span className="animate-spin">⟳</span> : <><span>Login to Member App</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => setAuthMode('member_register')}
                className="text-xs text-emerald-400 font-bold hover:underline cursor-pointer">
                New Member? Register Here →
              </button>
            </div>
          </form>
        )}

        {/* ── MEMBER REGISTER ── */}
        {authMode === 'member_register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" /> Register New Membership
            </h3>

            {[
              { label: 'Full Name *', key: 'regName', val: regName, set: setRegName, type: 'text', ph: 'e.g. Rahul Verma' },
              { label: 'Mobile Phone *', key: 'regPhone', val: regPhone, set: setRegPhone, type: 'tel', ph: '10-digit mobile number' },
              { label: 'Email (Optional)', key: 'regEmail', val: regEmail, set: setRegEmail, type: 'email', ph: 'you@example.com' },
            ].map(({ label, key, val, set, type, ph }) => (
              <div key={key} className="space-y-1">
                <label className="font-bold text-slate-300">{label}</label>
                <input type={type} placeholder={ph} value={val}
                  onChange={e => set(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
            ))}

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Select Membership Plan</label>
              <select value={regPlanId} onChange={e => setRegPlanId(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-bold focus:outline-none">
                {PLANS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationMonths}m) — ₹{p.finalPrice.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{loginError}</div>
            )}

            <button type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer">
              Register Account &amp; Start Membership
            </button>

            <div className="text-center">
              <button type="button" onClick={() => { setAuthMode('member_login'); setLoginError(''); }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer">← Back to Login</button>
            </div>
          </form>
        )}

        {/* ── OWNER LOGIN ── */}
        {authMode === 'owner_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Gym Owner Portal</div>
              <div className="text-[10px] text-amber-200/80">Owner accounts are registered by Super Admin. Enter your registered phone number &amp; password.</div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-amber-400">Owner Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type="tel" placeholder="Owner registered phone..."
                  value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-amber-400">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter owner password..."
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed">
                {loginError}
              </div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              {isLoading ? <span className="animate-spin">⟳</span> : <><span>Login to Owner Portal</span><ShieldCheck className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* ── STAFF LOGIN ── */}
        {authMode === 'staff_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-[11px] space-y-1">
              <div className="font-bold flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Front Desk Staff Terminal</div>
              <div className="text-[10px] text-cyan-200/80">Enter your assigned phone number and 4-digit gate PIN issued by the gym manager.</div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-cyan-400">Staff Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type="tel" placeholder="Enter staff phone number..."
                  value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-cyan-400">Staff Gate PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter 4-digit PIN..."
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required maxLength={6}
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 cursor-pointer">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{loginError}</div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              {isLoading ? <span className="animate-spin">⟳</span> : <><span>Open Front Desk Terminal</span><Dumbbell className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* Clean subtle footer text — secret footer lock removed */}
        <div className="pt-2 text-center text-[10px] text-slate-600 select-none">
          <span>FitPulse Gym OS • Multi-Tenant Platform</span>
        </div>

        {/* ── ACCESS REVOKED / SUSPENDED POP-UP MODAL ── */}
        {revokedModal.isOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#141C2B] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl shadow-rose-950/60 space-y-5 relative overflow-hidden text-center">
              
              {/* Background ambient glow */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

              {/* Close icon in top corner */}
              <button
                type="button"
                onClick={() => setRevokedModal({ isOpen: false, gymName: '', ownerName: '', phone: '', reason: '', status: 'BLOCKED' })}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/60 border border-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Glowing Icon */}
              <div className="relative mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-500/20">
                <ShieldAlert className="w-8 h-8 text-rose-400 animate-pulse" />
              </div>

              {/* Header Titles */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  Access Suspended
                </div>
                <h3 className="text-xl font-black text-white tracking-tight pt-2">
                  Gym License Suspended
                </h3>
                <p className="text-xs text-slate-400">
                  Access to the FitPulse portal for this gym has been restricted by Super Admin.
                </p>
              </div>

              {/* Gym & Owner Details Box */}
              <div className="bg-[#0B0F17] border border-slate-800/80 rounded-2xl p-3.5 text-left space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Gym:</span>
                  <span className="font-bold text-white text-right">{revokedModal.gymName}</span>
                </div>
                {revokedModal.ownerName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Owner:</span>
                    <span className="font-bold text-slate-200">{revokedModal.ownerName}</span>
                  </div>
                )}
                {revokedModal.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Phone:</span>
                    <span className="font-mono text-slate-300">{revokedModal.phone}</span>
                  </div>
                )}
              </div>

              {/* Specific Reason Given by Super Admin */}
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 font-black text-[11px] uppercase tracking-wider">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Reason Specified by Super Admin:</span>
                </div>
                <p className="text-xs text-rose-200/90 font-medium leading-relaxed pl-6">
                  {revokedModal.reason || 'Software subscription unpaid or license suspended. Please contact platform administrator to restore access.'}
                </p>
              </div>

              {/* Helpful instructions */}
              <p className="text-[11px] text-slate-400 leading-relaxed">
                To reactivate your gym dashboard, please contact Super Admin or complete your pending subscription billing.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRevokedModal({ isOpen: false, gymName: '', ownerName: '', phone: '', reason: '', status: 'BLOCKED' })}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-950/50 transition-all active:scale-95 cursor-pointer"
                >
                  Understood &amp; Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Super Admin Master Passcode Modal */}
        <SecretAdminAuthModal
          isOpen={showAdminPassModal}
          onClose={() => {
            setShowAdminPassModal(false);
            if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
              history.replaceState(null, '', window.location.pathname);
            }
          }}
          adminMasterKey={gymSettings.superAdminKey || 'admin999'}
          onAuthenticate={() => {
            onLogin({
              role: 'admin',
              name: 'Super Admin Controller',
              phone: '9999999999',
              avatar: null
            });
          }}
        />

      </div>
      </div>
    </div>
  );
}

