import React, { useState } from 'react';
import { 
  ShieldAlert, Lock, Unlock, RefreshCw, CheckCircle2, AlertOctagon, 
  Database, Users, DollarSign, X, Dumbbell, UserCheck, Key, Eye, EyeOff, 
  Save, Building, Phone, UserPlus 
} from 'lucide-react';

export default function SuperAdminPanel({
  settings,
  onUpdateGymStatus,
  onRegisterOwner,
  onSeedDemoData,
  onResetAllData,
  auditLogs,
  membersCount,
  onClose
}) {
  const [newStatus, setNewStatus] = useState(settings.gymStatus || 'ACTIVE');
  const [blockReasonText, setBlockReasonText] = useState(settings.blockReason || 'Subscription Unpaid or License Expired.');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Owner Registration / Update Form State
  const [ownerName, setOwnerName] = useState(settings.ownerName || settings.ownerCredentials?.name || 'Vikram Malhotra');
  const [ownerPhone, setOwnerPhone] = useState(settings.ownerCredentials?.phone || '9876543210');
  const [ownerPassword, setOwnerPassword] = useState(settings.ownerCredentials?.password || 'owner123');
  const [gymName, setGymName] = useState(settings.gymName || 'FitPulse Gym & Fitness');
  const [gymLocation, setGymLocation] = useState(settings.location || 'Vijay Nagar, Indore, MP');
  const [showOwnerPass, setShowOwnerPass] = useState(false);
  const [ownerFeedbackMsg, setOwnerFeedbackMsg] = useState('');

  const handleSaveStatus = (e) => {
    e.preventDefault();
    onUpdateGymStatus(newStatus, blockReasonText);
    setFeedbackMsg(`Gym status updated to "${newStatus}"!`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleSaveOwnerAccount = (e) => {
    e.preventDefault();
    if (!ownerPhone || ownerPhone.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number for the owner.');
      return;
    }
    if (!ownerPassword || ownerPassword.trim().length < 4) {
      alert('Password must be at least 4 characters long.');
      return;
    }

    if (onRegisterOwner) {
      onRegisterOwner({
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerPassword: ownerPassword.trim(),
        gymName: gymName.trim(),
        location: gymLocation.trim(),
      });
    }

    setOwnerFeedbackMsg('✅ Owner Account Registered & Credentials Issued Successfully!');
    setTimeout(() => setOwnerFeedbackMsg(''), 4000);
  };

  return (
    <div className={onClose ? "fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" : ""}>
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Super Admin Control Center</h2>
            <p className="text-xs text-slate-400">Software Provider Management • Register Gym Owners & Enforce License</p>
          </div>
        </div>

        {/* Status Guard Indicator */}
        <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
          settings.gymStatus === 'ACTIVE'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-3">
            {settings.gymStatus === 'ACTIVE' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <Lock className="w-6 h-6 text-rose-400 shrink-0 animate-bounce" />
            )}
            <div>
              <div className="font-extrabold text-sm">Gym Access Status: {settings.gymStatus}</div>
              <p className="text-[11px] opacity-80 mt-0.5">
                {settings.gymStatus === 'ACTIVE'
                  ? 'All Member logins, Owner portal, and Front Desk terminals are OPEN and operating.'
                  : `ACCESS RESTRICTED: ${settings.blockReason}`}
              </p>
            </div>
          </div>
        </div>

        {/* ── SECTION: REGISTER / CONFIGURE GYM OWNER ── */}
        <form onSubmit={handleSaveOwnerAccount} className="bg-[#0B0F17] p-5 rounded-2xl border border-amber-500/30 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Gym Owner Account Registration & Credentials</span>
            </div>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/30">
              Admin-Only Provisioning
            </span>
          </div>

          <p className="text-slate-400 text-[11px]">
            Gym owners cannot self-register. You as Super Admin create the account credentials here and provide them to the gym owner.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-300">Owner Full Name *</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Vikram Malhotra"
                required
                className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Owner Mobile / Login ID *</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                  maxLength={10}
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Owner Login Password *</label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showOwnerPass ? 'text' : 'password'}
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="Set owner password"
                  required
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-8 pr-9 py-2.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowOwnerPass(!showOwnerPass)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showOwnerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-300">Gym / Branch Name *</label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="e.g. FitPulse Gym & Fitness"
                  required
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Gym Location / Address</label>
            <input
              type="text"
              value={gymLocation}
              onChange={(e) => setGymLocation(e.target.value)}
              placeholder="e.g. Vijay Nagar, Indore, MP"
              className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {ownerFeedbackMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold">
              {ownerFeedbackMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save &amp; Issue Gym Owner Account</span>
          </button>
        </form>

        {/* Form: Change Gym Access Status */}
        <form onSubmit={handleSaveStatus} className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
          <h3 className="font-extrabold text-white text-sm">Restrict or Block Gym License</h3>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Set Access Permission State:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setNewStatus('ACTIVE')}
                className={`py-2.5 rounded-xl font-bold border transition-all ${
                  newStatus === 'ACTIVE'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                    : 'bg-[#141C2B] text-slate-400 border-slate-800'
                }`}
              >
                ACTIVE (Unblocked)
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('BLOCKED')}
                className={`py-2.5 rounded-xl font-bold border transition-all ${
                  newStatus === 'BLOCKED'
                    ? 'bg-rose-500 text-white border-rose-400 shadow-md'
                    : 'bg-[#141C2B] text-slate-400 border-slate-800'
                }`}
              >
                BLOCKED (Restrict All)
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('MAINTENANCE')}
                className={`py-2.5 rounded-xl font-bold border transition-all ${
                  newStatus === 'MAINTENANCE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                    : 'bg-[#141C2B] text-slate-400 border-slate-800'
                }`}
              >
                MAINTENANCE
              </button>
            </div>
          </div>

          {newStatus === 'BLOCKED' && (
            <div className="space-y-1">
              <label className="font-bold text-rose-400">Custom Suspension Reason Message:</label>
              <input
                type="text"
                value={blockReasonText}
                onChange={(e) => setBlockReasonText(e.target.value)}
                placeholder="e.g. Monthly Software Subscription Pending. Contact Admin."
                required
                className="w-full bg-[#141C2B] border border-rose-500/40 rounded-xl p-2.5 text-xs text-rose-200 focus:outline-none"
              />
            </div>
          )}

          {feedbackMsg && (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold">
              {feedbackMsg}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
          >
            Update System Lock &amp; Enforce Access Controls
          </button>
        </form>

        {/* Database Seed & Reset Controls */}
        <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
          <h3 className="font-extrabold text-white text-sm">Database Maintenance &amp; Testing Tools</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Load demo dataset (sample members & logs)?')) {
                  onSeedDemoData();
                  alert('Demo sample dataset loaded!');
                }
              }}
              className="py-2.5 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Database className="w-4 h-4 text-purple-400" />
              <span>Load 1-Click Demo Sample Data</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('WIPE ALL DATA to fresh clean state?')) {
                  onResetAllData();
                  alert('Database wiped cleanly to production empty state.');
                }
              }}
              className="py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 text-rose-400" />
              <span>Reset to Clean Empty State</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
