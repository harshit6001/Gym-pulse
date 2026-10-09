import React, { useState, useEffect } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock, UserPlus,
  ArrowRight, CheckCircle2, Sparkles, Key, ShieldAlert, Eye, EyeOff
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

  // Register form
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPlanId, setRegPlanId] = useState('p-2');

  // Super Admin Secret Passcode Modal state
  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Auto-detect URL Hash: /#admin or /#/admin
  useEffect(() => {
    const handleHashCheck = () => {
      const h = (window.location.hash || '').toLowerCase();
      if (h === '#admin' || h === '#/admin') {
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

        // Check if gym access is revoked
        if (gymStatus === 'BLOCKED') {
          setLoginError(`⛔ ACCESS REVOKED: ${blockReason || 'Gym license is suspended by Super Admin.'}`);
          return;
        }

        const foundMember = members.find(m =>
          m.phone.replace(/\s+/g, '').includes(loginPhone.trim())
        );
        if (foundMember) {
          onLogin({
            role: 'member',
            memberId: foundMember.id,
            name: foundMember.name,
            phone: foundMember.phone,
            avatar: foundMember.avatar
          });
        } else {
          setLoginError('Mobile number not registered. Please register a new account or contact the gym.');
        }

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
            status: gymSettings.gymStatus,
            blockReason: gymSettings.blockReason
          } : null);

        if (!foundGym) {
          setLoginError('Mobile number not registered as gym owner. Accounts are created by Super Admin.');
          return;
        }

        // Check if Admin has revoked/blocked this gym
        if (foundGym.status === 'BLOCKED' || foundGym.status === 'MAINTENANCE') {
          setLoginError(`⛔ ACCESS REVOKED for ${foundGym.gymName}: ${foundGym.blockReason || 'Subscription Unpaid or License Expired. Contact Super Admin to restore.'}`);
          return;
        }

        // Verify password against current/updated credentials
        if (foundGym.ownerPassword === cleanPass || (cleanPass === 'owner123' && !foundGym.ownerPassword)) {
          onLogin({
            role: 'owner',
            gymId: foundGym.id,
            gymName: foundGym.gymName,
            name: `${foundGym.gymName} — ${foundGym.ownerName || 'Owner'}`,
            ownerName: foundGym.ownerName,
            phone: foundGym.ownerPhone,
            avatar: null
          }, foundGym);
        } else {
          setLoginError('Incorrect password. If you updated your password, please enter your new password.');
        }

      } else if (authMode === 'staff_login') {
        // Staff login: phone + PIN
        if (gymStatus === 'BLOCKED') {
          setLoginError(`⛔ ACCESS REVOKED: ${blockReason || 'Gym license is suspended by Super Admin.'}`);
          return;
        }

        const staffList = JSON.parse(localStorage.getItem('fitpulse_staff') || '[]');
        const defaultStaff = [{ id: 'staff-1', name: 'Rohan Verma', phone: '9876511001', pin: '0000', status: 'ACTIVE', role: 'Front-Desk Executive' }];
        const allStaff = staffList.length ? staffList : defaultStaff;

        const foundStaff = allStaff.find(s =>
          s.phone.trim() === loginPhone.trim() &&
          s.pin === loginPassword.trim() &&
          s.status === 'ACTIVE'
        );

        if (foundStaff) {
          onLogin({
            role: 'frontdesk',
            name: foundStaff.name,
            phone: foundStaff.phone,
            avatar: null,
            staffId: foundStaff.id
          });
        } else {
          setLoginError('Invalid staff credentials. Check phone number and PIN with your gym manager.');
        }
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

  const isBlocked = gymStatus === 'BLOCKED';

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

        {/* Gym Blocked Banner */}
        {isBlocked && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 text-xs text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-rose-400">
              <Lock className="w-5 h-5 animate-bounce" />
              <span>Gym Access Suspended</span>
            </div>
            <p className="text-[11px] opacity-90">{blockReason || 'Gym license or monthly subscription suspended by Super Admin.'}</p>
            <div className="pt-2 border-t border-rose-500/30 flex justify-between items-center text-[10px] text-slate-400">
              <span>Contact System Admin to restore license.</span>
            </div>
          </div>
        )}

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
              disabled={isBlocked}
              className={`flex-1 py-2 rounded-xl transition-colors ${
                authMode === mode || (mode === 'member_login' && authMode === 'member_register')
                  ? activeClass + ' shadow-md'
                  : 'text-slate-400 hover:text-white'
              } ${isBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
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
              disabled={isLoading || isBlocked}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? <span className="animate-spin">⟳</span> : <><span>Login to Member App</span><ArrowRight className="w-4 h-4" /></>}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => setAuthMode('member_register')}
                className="text-xs text-emerald-400 font-bold hover:underline">
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
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95">
              Register Account &amp; Start Membership
            </button>

            <div className="text-center">
              <button type="button" onClick={() => { setAuthMode('member_login'); setLoginError(''); }}
                className="text-xs text-slate-400 hover:text-white">← Back to Login</button>
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
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
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
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
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
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{loginError}</div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60">
              {isLoading ? <span className="animate-spin">⟳</span> : <><span>Open Front Desk Terminal</span><Dumbbell className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* Clean subtle footer text — secret footer lock removed */}
        <div className="pt-2 text-center text-[10px] text-slate-600 select-none">
          <span>FitPulse Gym OS • Multi-Tenant Platform</span>
        </div>

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
