import React from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck, Smartphone, Monitor,
  AlertTriangle, BookOpen, LogOut, User, ChevronDown
} from 'lucide-react';

export default function HeaderNavbar({
  activeRole,
  selectedMemberId,
  setSelectedMemberId,
  members,
  isMobileFrame,
  setIsMobileFrame,
  openDocsModal,
  alertsCount,
  authUser,
  onLogout
}) {
  // Role badge config
  const roleMeta = {
    member: { label: 'Member', color: 'emerald', icon: UserCheck },
    owner: { label: 'Owner Portal', color: 'amber', icon: ShieldCheck },
    frontdesk: { label: 'Front Desk', color: 'cyan', icon: Dumbbell },
    admin: { label: 'Super Admin', color: 'rose', icon: AlertTriangle },
  };
  const meta = roleMeta[activeRole] || roleMeta.member;
  const Icon = meta.icon;

  const colorMap = {
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    amber: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    rose: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  };

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
              Member Retention &amp; Churn Prevention System
            </p>
          </div>
        </div>

        {/* Active Role Badge — read-only, no switcher */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${colorMap[meta.color]}`}>
          <Icon className="w-3.5 h-3.5" />
          <span>{meta.label}</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">

          {/* Member selector — only for members (to simulate different accounts in demo) */}
          {activeRole === 'member' && members.length > 0 && (
            <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-1.5 rounded-xl border border-slate-800">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] text-slate-400 font-medium hidden md:inline">Account:</span>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-emerald-400 focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </div>
          )}

          {/* Device Frame Toggle */}
          <button
            onClick={() => setIsMobileFrame(!isMobileFrame)}
            title="Toggle Mobile Screen Frame Simulation"
            className={`p-2 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
              isMobileFrame
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isMobileFrame
              ? <Smartphone className="w-4 h-4 text-purple-400" />
              : <Monitor className="w-4 h-4 text-slate-300" />}
            <span className="hidden lg:inline">{isMobileFrame ? 'Mobile Frame' : 'Full Screen'}</span>
          </button>

          {/* Specs / Docs */}
          <button
            onClick={openDocsModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Specs</span>
            {alertsCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {alertsCount}
              </span>
            )}
          </button>

          {/* Logout */}
          {authUser && (
            <button
              onClick={onLogout}
              title="Logout of current session"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
