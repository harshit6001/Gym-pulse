import React from 'react';
import {
  Dumbbell, ShieldCheck, UserCheck,
  AlertTriangle, BookOpen, LogOut, User
} from 'lucide-react';

export default function HeaderNavbar({
  activeRole,
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
    <header className="bg-[#141C2B]/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-3 sm:px-4 py-3 text-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-emerald-400 bg-clip-text text-transparent">
                FitPulse OS
              </h1>
              <span className="hidden sm:inline text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                Indore
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden md:block truncate">
              Member Retention &amp; Churn Prevention System
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Active Role Badge — desktop only */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold ${colorMap[meta.color]}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{meta.label}</span>
          </div>

          {/* Authenticated User Identity Badge — desktop only */}
          {authUser && (
            <div className="hidden sm:flex items-center gap-1.5 bg-[#0B0F17] px-2.5 py-1.5 rounded-xl border border-slate-800">
              <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-bold text-slate-200 truncate max-w-[100px] sm:max-w-[140px]">
                {authUser.name || authUser.phone}
              </span>
            </div>
          )}

          {/* Mobile: compact role chip */}
          <div className={`flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${colorMap[meta.color]}`}>
            <Icon className="w-3 h-3" />
            <span className="max-w-[60px] truncate">{authUser?.name?.split(' ')[0] || meta.label}</span>
          </div>

          {/* Specs / Docs button */}
          <button
            onClick={openDocsModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 active:bg-slate-700 transition-colors"
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
              title="Logout"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-2 sm:px-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold active:bg-rose-500/30 transition-colors"
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
