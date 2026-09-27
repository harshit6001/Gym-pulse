import React, { useState } from 'react';
import { Dumbbell, ShieldCheck, UserCheck, Phone, Lock, UserPlus, ArrowRight, CheckCircle2, Sparkles, Key, ShieldAlert } from 'lucide-react';
import { PLANS } from '../data/mockData';

export default function AuthScreen({ members, onLogin, onRegisterNewMember, gymStatus, blockReason, onOpenSuperAdmin }) {
  const [authMode, setAuthMode] = useState('member_login'); // member_login, member_register, owner_login, staff_login
  
  // Login form state
  const [loginPhone, setLoginPhone] = useState('9826011111'); // Default Rahul Sharma
  const [loginPin, setLoginPin] = useState('1234');
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPlanId, setRegPlanId] = useState('p-2');

  // Fast preset login handler
  const handleQuickMemberLogin = (m) => {
    onLogin({
      role: 'member',
      memberId: m.id,
      name: m.name,
      phone: m.phone,
      avatar: m.avatar
    });
  };

  const handleFormLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    if (authMode === 'member_login') {
      const foundMember = members.find(m => m.phone.includes(loginPhone.trim()));
      if (foundMember) {
        onLogin({
          role: 'member',
          memberId: foundMember.id,
          name: foundMember.name,
          phone: foundMember.phone,
          avatar: foundMember.avatar
        });
      } else {
        setLoginError('Member mobile number not found! Please register a new account below.');
      }
    } else if (authMode === 'owner_login') {
      if (loginPin === '1234' || loginPhone.includes('98765')) {
        onLogin({
          role: 'owner',
          name: 'FitPulse Gym Owner',
          phone: loginPhone || '9876500000',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
        });
      } else {
        setLoginError('Invalid Owner Passcode. (Default Demo Passcode: 1234)');
      }
    } else if (authMode === 'staff_login') {
      if (loginPin === '0000' || loginPhone.includes('98765')) {
        onLogin({
          role: 'frontdesk',
          name: 'Rohan Verma (Front-Desk)',
          phone: loginPhone || '9876511001',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        });
      } else {
        setLoginError('Invalid Staff PIN. (Default Demo PIN: 0000)');
      }
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!regName || !regPhone) {
      setLoginError('Please enter Full Name and Mobile Phone.');
      return;
    }

    const selectedPlan = PLANS.find(p => p.id === regPlanId) || PLANS[0];
    const todayStr = "2026-09-27";
    
    // Compute end date
    const endObj = new Date("2026-09-27");
    endObj.setMonth(endObj.getMonth() + selectedPlan.durationMonths);
    const endDateStr = endObj.toISOString().split('T')[0];

    const newMemberData = {
      id: `m-${Date.now()}`,
      name: regName,
      phone: regPhone,
      email: regEmail || `${regName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      status: 'active',
      membership: {
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        startDate: todayStr,
        endDate: endDateStr,
        autoRenew: false,
        amountPaid: selectedPlan.finalPrice
      },
      weeklyGoalDays: 4,
      streak: { current: 1, max: 1, restDaysApprovedThisWeek: 0 },
      lastCheckIn: `${todayStr} 08:00 AM (Registered)`,
      absentDaysCount: 0,
      assignedTrainer: 'tr-1',
      communicationConsent: true,
      optedOutWhatsapp: false,
      notes: 'New member registration via web app.'
    };

    onRegisterNewMember(newMemberData, selectedPlan, 'UPI_GPAY');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 rounded-2xl mx-auto shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
              <Dumbbell className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">FitPulse Gym OS</h2>
          <p className="text-xs text-slate-400">Indore Tier-2 Gym Portal & Member App</p>
        </div>

        {/* Gym Blocked Warning Banner */}
        {gymStatus === 'BLOCKED' && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 text-xs text-rose-300 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-rose-400">
              <Lock className="w-5 h-5 animate-bounce" />
              <span>Gym Access Suspended</span>
            </div>
            <p className="text-[11px] opacity-90">{blockReason || 'Gym license or monthly subscription suspended.'}</p>
            <div className="pt-2 border-t border-rose-500/30 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">Contact System Admin to restore.</span>
              <button
                type="button"
                onClick={onOpenSuperAdmin}
                className="text-[11px] font-bold text-rose-400 underline hover:text-rose-300"
              >
                Super Admin Login $\rightarrow$
              </button>
            </div>
          </div>
        )}

        {/* Role Auth Mode Switcher */}
        <div className="flex bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => { setAuthMode('member_login'); setLoginError(''); }}
            disabled={gymStatus === 'BLOCKED'}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              authMode === 'member_login' || authMode === 'member_register'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            } ${gymStatus === 'BLOCKED' ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Member
          </button>

          <button
            onClick={() => { setAuthMode('owner_login'); setLoginError(''); setLoginPhone('9876543210'); }}
            disabled={gymStatus === 'BLOCKED'}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              authMode === 'owner_login'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            } ${gymStatus === 'BLOCKED' ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Owner
          </button>

          <button
            onClick={() => { setAuthMode('staff_login'); setLoginError(''); setLoginPhone('9876511001'); }}
            disabled={gymStatus === 'BLOCKED'}
            className={`flex-1 py-2 rounded-xl transition-colors ${
              authMode === 'staff_login'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            } ${gymStatus === 'BLOCKED' ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            Front Desk
          </button>
        </div>

        {/* MEMBER LOGIN FORM */}
        {authMode === 'member_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Registered Mobile Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Enter 10-digit mobile number..."
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Login to Member App</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Quick 1-Click Demo Logins for testing */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">1-Click Test Demo Logins:</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {members.slice(0, 4).map(m => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => handleQuickMemberLogin(m)}
                    className="p-2 bg-[#0B0F17] border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left truncate transition-colors"
                  >
                    <div className="font-bold text-slate-200 truncate">{m.name}</div>
                    <div className="text-emerald-400 text-[10px] truncate">{m.membership.planName}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('member_register')}
                className="text-xs text-emerald-400 font-bold hover:underline"
              >
                New Member? Create Account Here $\rightarrow$
              </button>
            </div>
          </form>
        )}

        {/* MEMBER REGISTER FORM */}
        {authMode === 'member_register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <h3 className="font-extrabold text-white text-sm">Register New Gym Membership</h3>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Rahul Verma"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Mobile Phone *</label>
              <input
                type="text"
                placeholder="10 Digits (e.g. 9826099888)"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Select Initial Plan</label>
              <select
                value={regPlanId}
                onChange={(e) => setRegPlanId(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-bold focus:outline-none"
              >
                {PLANS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.durationMonths}m) - ₹{p.finalPrice.toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
            >
              Register Account & Start Membership
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setAuthMode('member_login')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Already registered? Back to Login
              </button>
            </div>
          </form>
        )}

        {/* OWNER LOGIN FORM */}
        {authMode === 'owner_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-amber-400">Gym Owner Security PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Enter Security PIN (Demo: 1234)..."
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Default Demo Passcode: <strong className="text-amber-400">1234</strong></p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Login to Owner Portal</span>
              <ShieldCheck className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* STAFF LOGIN FORM */}
        {authMode === 'staff_login' && (
          <form onSubmit={handleFormLogin} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-cyan-400">Front Desk Gate PIN</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Enter Staff Gate PIN (Demo: 0000)..."
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  required
                  className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Default Demo Staff PIN: <strong className="text-cyan-400">0000</strong></p>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Open Front Desk Terminal</span>
              <Dumbbell className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Super Admin Control Access */}
        <div className="pt-3 border-t border-slate-800 text-center text-[11px]">
          <button
            type="button"
            onClick={onOpenSuperAdmin}
            className="text-slate-400 hover:text-rose-400 font-bold transition-colors flex items-center justify-center gap-1.5 mx-auto"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Super Admin Portal (Restrict / Block Gym)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
