import React from 'react';
import { Dumbbell, ShieldCheck, UserCheck, Smartphone, Monitor, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';

export default function HeaderNavbar({
  activeRole,
  setActiveRole,
  selectedMemberId,
  setSelectedMemberId,
  members,
  isMobileFrame,
  setIsMobileFrame,
  openDocsModal,
  alertsCount
}) {
  const currentMember = members.find(m => m.id === selectedMemberId) || members[0];

  return (
    <header className="bg-[#141C2B]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 py-3 text-slate-100">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                FitPulse OS
              </h1>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Indore Tier-2
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Member Retention & Churn Prevention System
            </p>
          </div>
        </div>

        {/* Role Switcher Pills */}
        <div className="flex items-center bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveRole('member')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRole === 'member'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Member</span>
          </button>

          <button
            onClick={() => setActiveRole('owner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRole === 'owner'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Owner Dashboard</span>
          </button>

          <button
            onClick={() => setActiveRole('frontdesk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeRole === 'frontdesk'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5" />
            <span>Front Desk</span>
          </button>
        </div>

        {/* Member Persona Selector (If role is member) & Controls */}
        <div className="flex items-center gap-2">
          {activeRole === 'member' && (
            <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium hidden md:inline">Logged in as:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <optgroup label="Expiring Soon / Urgent Renewal">
                  <option value="m-2">Priya Verma (Expires in 3d)</option>
                  <option value="m-4">Ananya Roy (Expires in 2d)</option>
                  <option value="m-10">Kavita Jain (Expires in 6d)</option>
                </optgroup>
                <optgroup label="Active & High Streak">
                  <option value="m-1">Rahul Sharma (12-Day Streak)</option>
                  <option value="m-8">Neha Agarwal (18-Day Streak)</option>
                </optgroup>
                <optgroup label="Absent Risk Cases">
                  <option value="m-3">Amit Patel (14 Days Absent)</option>
                  <option value="m-5">Vikramaditya Singh (18 Days Absent)</option>
                </optgroup>
                <optgroup label="Paused Membership">
                  <option value="m-6">Deepa Kulkarni (Approved Pause)</option>
                </optgroup>
                <optgroup label="All Members">
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.membership.planName})</option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {/* Device Frame View Toggle */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            title="Toggle Mobile Screen Frame Simulation"
            className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
              isMobileFrame
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isMobileFrame ? <Smartphone className="w-4 h-4 text-purple-400" /> : <Monitor className="w-4 h-4 text-slate-300" />}
            <span className="hidden lg:inline">{isMobileFrame ? 'Mobile Frame' : 'Full Screen'}</span>
          </button>

          {/* Full System Documentation Modal Button */}
          <button
            onClick={openDocsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Screen Map & Specs</span>
            {alertsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {alertsCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
}
