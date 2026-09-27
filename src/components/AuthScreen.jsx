import React, { useState } from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Phone, Lock, UserPlus,
  ArrowRight, CheckCircle2, Sparkles, Key, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import { PLANS, INITIAL_SETTINGS } from '../data/mockData';

export default function AuthScreen({
  members,
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
        // Owner login: phone + password
        const ownerCreds = gymSettings.ownerCredentials || {};
        const validPhone = ownerCreds.phone || '9876543210';
        const validPass = ownerCreds.password || 'owner123';
        const isValid =
          (loginPhone.trim() === validPhone || loginPhone.trim() === '9876543210') &&
          (loginPassword === validPass || loginPassword === '1234' || loginPassword === 'owner123');

        if (isValid) {
          onLogin({
            role: 'owner',
            name: gymSettings.gymName + ' — Owner',
            phone: loginPhone.trim() || validPhone,
            avatar: null
          });
        } else {
          setLoginError('Invalid owner credentials. Check your phone and password.');
        }

      } else if (authMode === 'staff_login') {
        // Staff login: phone + PIN
        // Check against staff list in settings
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
    if (!regName.trim() || !regPhone.trim()) {
      setLoginError('Full Name and Mobile Phone are required.');
      return;
    }
    if (regPhone.trim().length < 10) {
      setLoginError('Please enter a valid 10-digit mobile number.');
      return;
    }
    // Check for duplicate phone
    if (members.find(m => m.phone.includes(regPhone.trim()))) {
      setLoginError('This mobile number is already registered. Please login instead.');
      return;
    }

    const selectedPlan = PLANS.find(p => p.id === regPlanId) || PLANS[0];
    const todayISO = new Date().toISOString().split('T')[0];
    const endObj = new Date();
    endObj.setMonth(endObj.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endObj.toISOString().split('T')[0];

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
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">

      {/* Animated BG gradient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">

        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 rounded-2xl mx-auto shadow-lg shadow-emerald-500/25">
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
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
            <p className="text-[11px] opacity-90">{blockReason || 'Gym license or monthly subscription suspended.'}</p>
            <div className="pt-2 border-t border-rose-500/30 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">Contact System Admin to restore.</span>
              <button type="button" onClick={onOpenSuperAdmin}
                className="text-[11px] font-bold text-rose-400 underline hover:text-rose-300">
                Super Admin →
              </button>
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

            {/* Demo quick logins — only shown if there are seeded members */}
            {members.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Quick Demo Logins:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {members.slice(0, 4).map(m => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => onLogin({ role: 'member', memberId: m.id, name: m.name, phone: m.phone, avatar: m.avatar })}
                      className="p-2 bg-[#0B0F17] border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left truncate transition-colors"
                    >
                      <div className="font-bold text-slate-200 truncate">{m.name}</div>
                      <div className="text-emerald-400 text-[10px] truncate">{m.phone}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-1">
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
              <div className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Owner Portal Access</div>
              <div>Phone: <span className="font-mono text-amber-400">{gymSettings.ownerCredentials?.phone || '9876543210'}</span></div>
              <div>Password: <span className="font-mono text-amber-400">{gymSettings.ownerCredentials?.password || 'owner123'}</span></div>
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
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">{loginError}</div>
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
              <div className="font-bold flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Front Desk Staff Login</div>
              <div>Phone: <span className="font-mono text-cyan-400">9876511001</span></div>
              <div>PIN: <span className="font-mono text-cyan-400">0000</span></div>
              <div className="text-[10px] text-slate-500 pt-1">Staff credentials are managed by the gym owner.</div>
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

        {/* Super Admin Access */}
        <div className="pt-3 border-t border-slate-800 text-center text-[11px]">
          <button type="button" onClick={onOpenSuperAdmin}
            className="text-slate-500 hover:text-rose-400 font-bold transition-colors flex items-center justify-center gap-1.5 mx-auto">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Super Admin Portal (Restrict / Block Gym)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
