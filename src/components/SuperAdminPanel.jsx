import React, { useState } from 'react';
import {
  ShieldAlert, Lock, Unlock, RefreshCw, CheckCircle2, AlertOctagon,
  Database, Users, DollarSign, X, Dumbbell, UserCheck, Key, Eye, EyeOff,
  Save, Building, Phone, UserPlus, Search, Filter, Shield, AlertTriangle,
  Copy, Check, Edit3, Trash2, Globe, Clock, Sparkles, FileText, ChevronRight
} from 'lucide-react';

export default function SuperAdminPanel({
  settings,
  gymsList = [],
  onToggleGymBlock,
  onUpdateGym,
  onAddGym,
  onDeleteGym,
  onUpdateMasterPasscode,
  onSeedDemoData,
  onResetAllData,
  auditLogs = [],
  membersCount = 0,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('gyms'); // gyms, onboard, security, logs, maintenance
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, BLOCKED

  // Passcode Management State
  const [currentMasterKeyInput, setCurrentMasterKeyInput] = useState(settings.superAdminKey || 'admin999');
  const [newMasterKeyInput, setNewMasterKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [masterKeyFeedback, setMasterKeyFeedback] = useState('');

  // Quick Block Modal State
  const [blockModalGym, setBlockModalGym] = useState(null);
  const [selectedBlockReason, setSelectedBlockReason] = useState('Subscription Unpaid (Overdue). Access restricted.');
  const [customReasonText, setCustomReasonText] = useState('');

  // Edit Gym & Owner Modal State
  const [editingGym, setEditingGym] = useState(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Reset Password Modal State (for quick single action)
  const [resetPassModalGym, setResetPassModalGym] = useState(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetFeedbackMsg, setResetFeedbackMsg] = useState('');

  // Onboard New Gym Form State
  const [newGymName, setNewGymName] = useState('');
  const [newGymLocation, setNewGymLocation] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerPassword, setNewOwnerPassword] = useState('');
  const [newGymPlan, setNewGymPlan] = useState('Enterprise Pro Suite');
  const [newMonthlyFee, setNewMonthlyFee] = useState('3999');
  const [onboardFeedback, setOnboardFeedback] = useState('');

  // KPI Computations
  const totalGyms = gymsList.length;
  const activeGyms = gymsList.filter(g => g.status === 'ACTIVE').length;
  const blockedGyms = gymsList.filter(g => g.status === 'BLOCKED').length;
  const totalEstimatedMembers = gymsList.reduce((acc, g) => acc + (g.membersCount || 0), 0);
  const totalMonthlyMRR = gymsList.reduce((acc, g) => acc + (Number(g.monthlyFee) || 0), 0);

  // Filtered Gyms List
  const filteredGyms = gymsList.filter(g => {
    const matchesQuery =
      g.gymName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ownerPhone?.includes(searchQuery);

    const matchesStatus =
      statusFilter === 'ALL' ? true :
      statusFilter === 'ACTIVE' ? g.status === 'ACTIVE' :
      g.status === 'BLOCKED' || g.status === 'MAINTENANCE';

    return matchesQuery && matchesStatus;
  });

  // 1-Click Block / Unblock Quick Handler
  const handleQuickStatusClick = (gym) => {
    if (gym.status === 'ACTIVE') {
      // Open reason picker modal
      setBlockModalGym(gym);
      setSelectedBlockReason('Subscription Unpaid or License Expired. Contact System Admin.');
      setCustomReasonText('');
    } else {
      // 1-Click Instant Unblock
      if (onToggleGymBlock) {
        onToggleGymBlock(gym.id, 'ACTIVE', '');
      }
    }
  };

  const handleConfirmBlock = (e) => {
    e.preventDefault();
    if (!blockModalGym) return;
    const finalReason = selectedBlockReason === 'CUSTOM' ? customReasonText : selectedBlockReason;
    if (onToggleGymBlock) {
      onToggleGymBlock(blockModalGym.id, 'BLOCKED', finalReason || 'Access restricted by Super Admin.');
    }
    setBlockModalGym(null);
  };

  // Onboard New Gym Submit
  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    if (!newGymName.trim() || !newOwnerName.trim() || !newOwnerPhone.trim() || !newOwnerPassword.trim()) {
      alert('Please fill in all mandatory fields.');
      return;
    }
    if (newOwnerPhone.trim().length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const newGymObj = {
      id: `gym-${Date.now()}`,
      gymName: newGymName.trim(),
      location: newGymLocation.trim() || 'Indore, MP',
      ownerName: newOwnerName.trim(),
      ownerPhone: newOwnerPhone.trim(),
      ownerPassword: newOwnerPassword.trim(),
      status: 'ACTIVE',
      blockReason: '',
      plan: newGymPlan,
      monthlyFee: Number(newMonthlyFee) || 3999,
      membersCount: 0,
      activeSince: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };

    if (onAddGym) {
      onAddGym(newGymObj);
    }

    setNewGymName('');
    setNewGymLocation('');
    setNewOwnerName('');
    setNewOwnerPhone('');
    setNewOwnerPassword('');
    setOnboardFeedback('✅ New Gym & Owner Account Onboarded to Database!');
    setTimeout(() => {
      setOnboardFeedback('');
      setActiveTab('gyms');
    }, 2000);
  };

  // Edit Existing Gym Submit
  const handleEditGymSubmit = (e) => {
    e.preventDefault();
    if (!editingGym) return;
    const updated = { ...editingGym };
    if (resetPasswordInput.trim()) {
      updated.ownerPassword = resetPasswordInput.trim();
    }
    if (onUpdateGym) {
      onUpdateGym(updated);
    }
    setEditingGym(null);
    setResetPasswordInput('');
  };

  // Quick Reset Password Submit
  const handleQuickResetPasswordSubmit = (e) => {
    e.preventDefault();
    if (!resetPassModalGym || !newTempPassword.trim()) return;
    const updated = {
      ...resetPassModalGym,
      ownerPassword: newTempPassword.trim()
    };
    if (onUpdateGym) {
      onUpdateGym(updated);
    }
    setResetFeedbackMsg('✅ Temporary password updated! Share this temporary password with the gym owner.');
    setTimeout(() => {
      setResetFeedbackMsg('');
      setResetPassModalGym(null);
      setNewTempPassword('');
    }, 2500);
  };

  // Save Master Passcode
  const handleSaveMasterKey = (e) => {
    e.preventDefault();
    if (!newMasterKeyInput.trim() || newMasterKeyInput.trim().length < 4) {
      setMasterKeyFeedback('❌ Passcode must be at least 4 characters long.');
      return;
    }
    if (onUpdateMasterPasscode) {
      onUpdateMasterPasscode(newMasterKeyInput.trim());
    }
    setCurrentMasterKeyInput(newMasterKeyInput.trim());
    setNewMasterKeyInput('');
    setMasterKeyFeedback('✅ Master Passcode Updated Successfully!');
    setTimeout(() => setMasterKeyFeedback(''), 3000);
  };

  return (
    <div className={onClose ? "fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-2 sm:p-4 overflow-y-auto" : "w-full"}>
      <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-6 relative max-h-[92vh] overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Close Button if Modal */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-rose-500/20 to-amber-500/20 rounded-2xl text-rose-400 border border-rose-500/30 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Super Admin Command Center</h2>
                <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Root Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Tenant Software Provider Hub • 1-Click Gym License Control &amp; Owner Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('onboard')}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Onboard New Gym</span>
            </button>
          </div>
        </div>

        {/* Platform KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#0B0F17] p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold">
              <span>Total Gyms</span>
              <Building className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{totalGyms}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Managed accounts</div>
          </div>

          <div className="bg-[#0B0F17] p-3.5 rounded-2xl border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-400 text-[11px] font-bold">
              <span>Active Gyms</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">{activeGyms}</div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5">Operating normally</div>
          </div>

          <div className="bg-[#0B0F17] p-3.5 rounded-2xl border border-rose-500/20">
            <div className="flex items-center justify-between text-rose-400 text-[11px] font-bold">
              <span>Blocked / Suspended</span>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-black text-rose-400 mt-1">{blockedGyms}</div>
            <div className="text-[10px] text-rose-500/80 mt-0.5">Restricted access</div>
          </div>

          <div className="bg-[#0B0F17] p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-amber-400 text-[11px] font-bold">
              <span>Platform Members</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white mt-1">{totalEstimatedMembers || membersCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Active end users</div>
          </div>

          <div className="bg-[#0B0F17] p-3.5 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-purple-400 text-[11px] font-bold">
              <span>Software MRR</span>
              <DollarSign className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-black text-purple-300 mt-1">₹{totalMonthlyMRR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Monthly SaaS Revenue</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'gyms', label: `All Gyms & Owners (${gymsList.length})`, icon: Building },
            { id: 'onboard', label: 'Onboard New Gym', icon: UserPlus },
            { id: 'security', label: 'Admin Passcode & URL Access', icon: Key },
            { id: 'logs', label: `Audit Log History (${auditLogs.length})`, icon: FileText },
            { id: 'maintenance', label: 'Database & Maintenance', icon: RefreshCw },
          ].map(tab => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: ALL GYMS & OWNERS MASTER DIRECTORY ── */}
        {activeTab === 'gyms' && (
          <div className="space-y-4">
            
            {/* Search & Status Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B0F17] p-3 rounded-2xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by Gym, Owner, Phone or City..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs font-bold">
                {['ALL', 'ACTIVE', 'BLOCKED'].map(filterKey => (
                  <button
                    key={filterKey}
                    onClick={() => setStatusFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-xl transition-colors ${
                      statusFilter === filterKey
                        ? filterKey === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black'
                        : filterKey === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                        : 'bg-slate-700 text-white font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filterKey === 'ALL' ? 'All Gyms' : filterKey === 'ACTIVE' ? '🟢 Active' : '🔴 Blocked'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gyms Roster Cards / Table */}
            {filteredGyms.length === 0 ? (
              <div className="p-10 text-center bg-[#0B0F17] rounded-2xl border border-slate-800 space-y-2">
                <Building className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-bold text-slate-300 text-sm">No gyms matched your filter criteria</div>
                <p className="text-xs text-slate-500">Try clearing the search query or onboard a new gym above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGyms.map((gym) => {
                  const isBlocked = gym.status === 'BLOCKED' || gym.status === 'MAINTENANCE';

                  return (
                    <div
                      key={gym.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isBlocked
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-[#0B0F17] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        
                        {/* Left: Gym & Owner Info */}
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-black text-white text-base truncate">{gym.gymName}</h3>
                            
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isBlocked
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {isBlocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>{gym.status}</span>
                            </span>

                            <span className="text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                              {gym.plan || 'Pro Suite'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-slate-500" />
                              <span>{gym.location}</span>
                            </span>
                            <span>•</span>
                            <span>Fee: <strong className="text-slate-200">₹{(gym.monthlyFee || 3999).toLocaleString('en-IN')}/mo</strong></span>
                            <span>•</span>
                            <span>Members: <strong className="text-emerald-400">{gym.membersCount || 0}</strong></span>
                          </div>

                          {/* Owner Credentials Box — Protected from Admin inspection */}
                          <div className="bg-[#141C2B] p-3 rounded-xl border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-3 mt-2">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                              <div>
                                <span className="text-slate-400 text-[11px]">Owner: </span>
                                <strong className="text-white">{gym.ownerName}</strong>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Login Phone: </span>
                              <strong className="text-slate-200 font-mono">{gym.ownerPhone}</strong>
                            </div>

                            {/* Privacy: Password is encrypted & managed privately by owner */}
                            <div className="flex items-center gap-2">
                              <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-slate-400 text-[11px]">Password: </span>
                              <span className="text-[10px] font-mono text-emerald-400 bg-[#0B0F17] px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                                <Lock className="w-3 h-3 text-emerald-400" />
                                <span>Private &amp; Protected</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetPassModalGym(gym);
                                  setNewTempPassword('');
                                }}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/20 flex items-center gap-1 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Reset Pass</span>
                              </button>
                            </div>
                          </div>

                          {/* Block Reason Warning if blocked */}
                          {isBlocked && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span><strong>Active Suspension Reason:</strong> {gym.blockReason || 'Access suspended by Super Admin.'}</span>
                            </div>
                          )}
                        </div>

                        {/* Right: 1-Click Action Controls */}
                        <div className="flex sm:flex-col items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                          
                          {/* 1-CLICK SINGLE TOGGLE BUTTON */}
                          <button
                            type="button"
                            onClick={() => handleQuickStatusClick(gym)}
                            className={`w-full sm:w-44 py-2.5 px-4 rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                              isBlocked
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 shadow-emerald-950/40'
                                : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white shadow-rose-950/40'
                            }`}
                          >
                            {isBlocked ? (
                              <>
                                <Unlock className="w-4 h-4" />
                                <span>1-Click Unblock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                <span>1-Click Revoke / Block</span>
                              </>
                            )}
                          </button>

                          {/* Edit Details button */}
                          <div className="flex items-center gap-2 w-full">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingGym({ ...gym });
                                setResetPasswordInput('');
                              }}
                              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Details</span>
                            </button>

                            {gymsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete gym "${gym.gymName}"?`)) {
                                    if (onDeleteGym) onDeleteGym(gym.id);
                                  }
                                }}
                                title="Delete Gym Account"
                                className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── TAB 2: ONBOARD NEW GYM & OWNER ── */}
        {activeTab === 'onboard' && (
          <form onSubmit={handleOnboardSubmit} className="bg-[#0B0F17] p-5 sm:p-6 rounded-3xl border border-emerald-500/30 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Onboard &amp; Register New Gym Client</h3>
                  <p className="text-xs text-slate-400">Directly provisions to backend. Owner can immediately login using issued credentials.</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
                Direct Backend Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym / Business Brand Name *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newGymName}
                    onChange={(e) => setNewGymName(e.target.value)}
                    placeholder="e.g. Gold's Gym Palasia"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Gym Location / Address</label>
                <input
                  type="text"
                  value={newGymLocation}
                  onChange={(e) => setNewGymLocation(e.target.value)}
                  placeholder="e.g. Palasia Square, Indore, MP"
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Owner Full Name *</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Rajiv Kapoor"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Owner Mobile / Login Phone *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    placeholder="10-digit phone number"
                    maxLength={10}
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Initial Temporary Password * (Issued on Day 1)</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    placeholder="Set temporary initial password"
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl pl-9 pr-3 py-3 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">The owner can change this password after login. It will remain private to them.</span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">Software Subscription Plan</label>
                <select
                  value={newGymPlan}
                  onChange={(e) => setNewGymPlan(e.target.value)}
                  className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-3 text-xs text-emerald-400 font-bold focus:outline-none"
                >
                  <option value="Enterprise Pro Suite">Enterprise Pro Suite (₹4,999/mo)</option>
                  <option value="Pro Retention Suite">Pro Retention Suite (₹3,999/mo)</option>
                  <option value="Standard Growth Suite">Standard Growth Suite (₹2,999/mo)</option>
                  <option value="Starter Pilot Tier">Starter Pilot Tier (₹1,999/mo)</option>
                </select>
              </div>
            </div>

            {onboardFeedback && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{onboardFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Provision Gym &amp; Issue Initial Credentials</span>
            </button>
          </form>
        )}

        {/* ── TAB 3: ADMIN MASTER PASSCODE & URL ACCESS ── */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <form onSubmit={handleSaveMasterKey} className="bg-[#0B0F17] p-5 sm:p-6 rounded-3xl border border-rose-500/30 space-y-5 text-xs">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Super Admin Master Passcode</h3>
                  <p className="text-xs text-slate-400">Manage the secret key used to access this Super Admin Center.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Current Active Master Key:</label>
                  <div className="p-3 bg-[#141C2B] rounded-xl border border-slate-800 text-amber-400 font-mono font-black text-sm flex items-center justify-between">
                    <span>{showMasterKey ? currentMasterKeyInput : '••••••••'}</span>
                    <button
                      type="button"
                      onClick={() => setShowMasterKey(!showMasterKey)}
                      className="text-slate-400 hover:text-slate-200 text-xs font-sans font-bold"
                    >
                      {showMasterKey ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Set New Master Passcode:</label>
                  <input
                    type="password"
                    value={newMasterKeyInput}
                    onChange={(e) => setNewMasterKeyInput(e.target.value)}
                    placeholder="Enter new secret passcode (min 4 chars)..."
                    required
                    className="w-full bg-[#141C2B] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {masterKeyFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  masterKeyFeedback.includes('✅')
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                }`}>
                  {masterKeyFeedback}
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save New Master Passcode</span>
              </button>
            </form>

            <div className="bg-[#0B0F17] p-5 rounded-2xl border border-slate-800 text-xs space-y-3">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>How to Open Admin Panel:</span>
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  <strong>URL Direct Route:</strong> Add <code className="text-amber-300 bg-slate-800 px-2 py-0.5 rounded font-mono font-bold">/#admin</code> to your website URL (e.g. <span className="text-slate-300">https://your-gym-app.vercel.app/#admin</span>). It will immediately prompt for your master password and open this center!
                </li>
                <li>
                  <strong>Keyboard Shortcut:</strong> Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-amber-300">Ctrl + Shift + A</kbd> (or <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-amber-300">Cmd + Shift + A</kbd>) anywhere.
                </li>
                <li>
                  <strong>Secret 5-Tap Gesture:</strong> Tap the Gym Logo 5 times quickly on the login screen.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ── TAB 4: AUDIT LOGS HISTORY ── */}
        {activeTab === 'logs' && (
          <div className="bg-[#0B0F17] p-5 rounded-3xl border border-slate-800 space-y-3 text-xs">
            <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Real-Time Security &amp; Access Logs</span>
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-slate-500 italic py-4 text-center">No log entries found.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#141C2B] rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-rose-400 font-mono text-[10px] uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {log.action}
                        </span>
                        <strong className="text-white truncate">{log.actor}</strong>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{log.details}</p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap">
                      {typeof log.timestamp === 'string' && log.timestamp.includes('T')
                        ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : log.timestamp}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB 5: DATABASE MAINTENANCE & RESET ── */}
        {activeTab === 'maintenance' && (
          <div className="bg-[#0B0F17] p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-5 text-xs">
            <div>
              <h3 className="font-extrabold text-white text-sm">Database Maintenance &amp; Seeding Tools</h3>
              <p className="text-xs text-slate-400 mt-1">Reset system state or preload demo dataset for client presentations.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#141C2B] rounded-2xl border border-purple-500/30 space-y-3">
                <div className="font-bold text-purple-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" />
                  <span>1-Click Demo Sample Dataset</span>
                </div>
                <p className="text-[11px] text-slate-400">Preloads sample members, check-in history, no-show cases, and payment logs for testing.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Load demo sample dataset into database?')) {
                      if (onSeedDemoData) onSeedDemoData();
                      alert('Demo sample dataset loaded!');
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Demo Sample Data</span>
                </button>
              </div>

              <div className="p-4 bg-[#141C2B] rounded-2xl border border-rose-500/30 space-y-3">
                <div className="font-bold text-rose-300 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span>Wipe All Data to Fresh Clean State</span>
                </div>
                <p className="text-[11px] text-slate-400">Cleans members, check-ins, and orders to an empty production state ready for live customers.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('WARNING: WIPE ALL members and data to fresh empty state?')) {
                      if (onResetAllData) onResetAllData();
                      alert('Database wiped cleanly to production empty state.');
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Database to Clean Empty State</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: 1-CLICK QUICK BLOCK / REVOKE REASON SELECTOR ── */}
        {blockModalGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleConfirmBlock} className="bg-[#141C2B] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
              <button
                type="button"
                onClick={() => setBlockModalGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
                  <Lock className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Revoke Gym License</h3>
                  <p className="text-xs text-slate-400">Gym: <strong className="text-white">{blockModalGym.gymName}</strong></p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <label className="font-bold text-slate-300">Select Suspension Reason (Will be shown to gym users):</label>
                <div className="space-y-1.5">
                  {[
                    'Monthly Subscription Unpaid (Overdue). Contact Administrator to restore.',
                    'Monthly Software License Expired. Renewal pending.',
                    'Scheduled Server Maintenance in progress. Please check back later.',
                    'Terms of Service Policy Violation. Account suspended.',
                    'CUSTOM'
                  ].map((reason) => (
                    <label
                      key={reason}
                      onClick={() => setSelectedBlockReason(reason)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedBlockReason === reason
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-200 font-bold'
                          : 'bg-[#0B0F17] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <input
                        type="radio"
                        name="blockReason"
                        checked={selectedBlockReason === reason}
                        onChange={() => setSelectedBlockReason(reason)}
                        className="accent-rose-500"
                      />
                      <span className="text-[11px]">{reason === 'CUSTOM' ? '✏️ Custom specific message...' : reason}</span>
                    </label>
                  ))}
                </div>

                {selectedBlockReason === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter custom restriction message for this gym..."
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    required
                    className="w-full bg-[#0B0F17] border border-rose-500/40 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBlockModalGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  Revoke &amp; Apply Block
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL: QUICK RESET OWNER PASSWORD ── */}
        {resetPassModalGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleQuickResetPasswordSubmit} className="bg-[#141C2B] border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
              <button
                type="button"
                onClick={() => setResetPassModalGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Reset Owner Password</h3>
                  <p className="text-xs text-slate-400">Gym: <strong className="text-white">{resetPassModalGym.gymName}</strong> • Owner: <strong className="text-amber-400">{resetPassModalGym.ownerName}</strong></p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                As Super Admin, you cannot see the owner's existing password. Set a new temporary password below to give to the owner.
              </p>

              <div className="space-y-1 text-xs">
                <label className="font-bold text-slate-300">New Temporary Password *</label>
                <input
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  placeholder="Enter new temporary password..."
                  required
                  autoFocus
                  className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {resetFeedbackMsg && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 font-bold text-xs">
                  {resetFeedbackMsg}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPassModalGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  Set Temporary Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── MODAL: EDIT GYM DETAILS ── */}
        {editingGym && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={handleEditGymSubmit} className="bg-[#141C2B] border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 relative">
              <button
                type="button"
                onClick={() => setEditingGym(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">Edit Gym &amp; Owner Profile</h3>
                  <p className="text-xs text-slate-400">Modify gym brand name, location, and owner contact</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Gym Name:</label>
                  <input
                    type="text"
                    value={editingGym.gymName}
                    onChange={(e) => setEditingGym({ ...editingGym, gymName: e.target.value })}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Location:</label>
                  <input
                    type="text"
                    value={editingGym.location}
                    onChange={(e) => setEditingGym({ ...editingGym, location: e.target.value })}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Owner Full Name:</label>
                  <input
                    type="text"
                    value={editingGym.ownerName}
                    onChange={(e) => setEditingGym({ ...editingGym, ownerName: e.target.value })}
                    required
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Owner Login Phone:</label>
                  <input
                    type="tel"
                    value={editingGym.ownerPhone}
                    onChange={(e) => setEditingGym({ ...editingGym, ownerPhone: e.target.value })}
                    required
                    maxLength={10}
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-300">Reset Temporary Password (Optional):</label>
                  <input
                    type="text"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Leave blank to keep owner's current password..."
                    className="w-full bg-[#0B0F17] border border-slate-700 rounded-xl p-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Active owner password is hidden for privacy. Fill only if owner requested a reset.</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGym(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
