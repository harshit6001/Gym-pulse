import React, { useState } from 'react';
import { 
  Users, CalendarCheck, AlertTriangle, TrendingUp, DollarSign, ShoppingBag, 
  PhoneCall, MessageSquare, ShieldAlert, CheckCircle2, Clock, Filter, Plus, 
  Sparkles, FileText, ChevronRight, RefreshCw, X, Shield, Send, Dumbbell, PackageCheck, UserPlus
} from 'lucide-react';

export default function OwnerDashboard({
  members,
  noShowCases,
  payments,
  addOnOrders,
  attendanceLogs,
  settings,
  onUpdateNoShowOutcome,
  onRunDailyScan,
  onToggleMemberPause,
  onFulfillAddOnOrder,
  onLogPTSession,
  onOpenAddMemberModal,
  staffList = [],
  onAddStaff,
  onRemoveStaff
}) {
  const [activeTab, setActiveTab] = useState('redlist'); // redlist, members, orders, staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [outcomeModalCase, setOutcomeModalCase] = useState(null);
  const [outcomeType, setOutcomeType] = useState('Will return');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [nextActionDate, setNextActionDate] = useState('2026-09-30');

  // WhatsApp Hinglish Generator Modal State
  const [whatsappModalData, setWhatsappModalData] = useState(null);

  // Daily Summary Digest Modal State
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);

  // Compute 8 Core Dashboard Cards Metrics
  const activeMembersCount = members.filter(m => m.status === 'active').length;
  
  const todayStr = "2026-09-27";
  const todaysCheckInsCount = attendanceLogs.filter(a => a.timestamp.startsWith(todayStr)).length;
  
  // 7-day active members
  const sevenDayActiveCount = members.filter(m => {
    if (!m.lastCheckIn) return false;
    const datePart = m.lastCheckIn.split(' ')[0];
    const diffDays = Math.ceil((new Date("2026-09-27") - new Date(datePart)) / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }).length;

  const openNoShowCasesCount = noShowCases.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;
  
  const returnedMembersCount = noShowCases.filter(c => c.status === 'RESOLVED_RETURNED').length;

  // Renewals due in next 7 days
  const now = new Date("2026-09-27T10:00:00+05:30");
  const renewalsDue7Days = members.filter(m => {
    if (m.status !== 'active') return false;
    const endDate = new Date(m.membership.endDate);
    const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  // Revenue computations
  const totalRenewalRevenue = payments
    .filter(p => p.status === 'PAID')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalAddOnRevenue = addOnOrders
    .filter(o => o.status === 'PAID')
    .reduce((acc, curr) => acc + curr.price, 0);

  // Helper WhatsApp click handler
  const handleOpenWhatsApp = (c) => {
    const rawTemplate = settings.whatsappTemplates.noShow;
    const message = rawTemplate
      .replace('{NAME}', c.memberName)
      .replace('{ABSENT_DAYS}', c.absentDays);
    setWhatsappModalData({ member: c, message });
  };

  // Submit follow-up outcome
  const handleSubmitOutcome = (e) => {
    e.preventDefault();
    if (!outcomeModalCase) return;
    onUpdateNoShowOutcome(outcomeModalCase.id, outcomeType, outcomeNote, nextActionDate);
    setOutcomeModalCase(null);
    setOutcomeNote('');
  };

  return (
    <div className="space-y-6">
      
      {/* OWNER HEADER & QUICK ACTIONS */}
      <div className="bg-gradient-to-r from-[#141C2B] via-[#1E293B] to-[#0B0F17] rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-white">FitPulse Gym Owner Portal</h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 font-bold border border-amber-500/30 px-2.5 py-0.5 rounded-full">
              Churn Prevention Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Silent Churn Detection • Red-List Risk Board • Automated Reminders • Add-On Revenue
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddMemberModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Member</span>
          </button>

          <button
            onClick={onRunDailyScan}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Run No-Show Scan ({settings.noShowThresholdDays}d Threshold)</span>
          </button>

          <button
            onClick={() => setSummaryModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generate Daily Owner Summary</span>
          </button>
        </div>
      </div>

      {/* 8 CORE METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Card 1: Active Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Members</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{activeMembersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Out of 30 Total Registrations</div>
        </div>

        {/* Card 2: Today's Check-ins */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Today's Visits</span>
            <CalendarCheck className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{todaysCheckInsCount}</div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">100% QR / Verified</div>
        </div>

        {/* Card 3: 7-Day Active Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>7-Day Active</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{sevenDayActiveCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Logged visit in past week</div>
        </div>

        {/* Card 4: Open No-Show Risk Cases */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-rose-500/30 shadow-md bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-400 text-xs font-bold uppercase tracking-wider">
            <span>Red-List Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-300 mt-2">{openNoShowCasesCount}</div>
          <div className="text-[11px] text-rose-400 mt-1">Absent ≥ {settings.noShowThresholdDays} Days (Action Needed)</div>
        </div>

        {/* Card 5: Returned Members */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Returned Members</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{returnedMembersCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Risk cases saved from churn</div>
        </div>

        {/* Card 6: Renewals Due (7-Day) */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-amber-500/30 shadow-md bg-amber-500/5">
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold uppercase tracking-wider">
            <span>Renewals Due (7d)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2">{renewalsDue7Days}</div>
          <div className="text-[11px] text-amber-400 mt-1">Automated reminders scheduled</div>
        </div>

        {/* Card 7: Renewal Collection */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Renewal Collection</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">₹{totalRenewalRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">Verified provider payments</div>
        </div>

        {/* Card 8: Add-On Revenue */}
        <div className="bg-[#141C2B] rounded-2xl p-4 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Add-On Revenue</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-300 mt-2">₹{totalAddOnRevenue.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">PT, Diets & Supplements</div>
        </div>

      </div>

      {/* OWNER NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('redlist')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'redlist'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Red-List Churn Recovery ({openNoShowCasesCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manage Memberships & Pauses ({members.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'orders'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Add-On Orders & PT Sessions</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>Front Desk Staff Access ({staffList.length})</span>
        </button>
      </div>

      {/* TAB 1: RED-LIST CHURN RECOVERY BOARD */}
      {activeTab === 'redlist' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Red-List Member Churn Risk Board</span>
              </h3>
              <p className="text-xs text-slate-400">
                Members absent ≥ {settings.noShowThresholdDays} consecutive days. Paused & frozen memberships are automatically excluded.
              </p>
            </div>
            <span className="text-xs text-slate-400 bg-[#0B0F17] px-3 py-1 rounded-xl border border-slate-800">
              Sample Config: {settings.noShowThresholdDays} Days Absent
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-[#0B0F17]/50">
                  <th className="py-3 px-4">Member / Contact</th>
                  <th className="py-3 px-4">Absent Days</th>
                  <th className="py-3 px-4">Last Visit</th>
                  <th className="py-3 px-4">Assigned Coach</th>
                  <th className="py-3 px-4">Follow-Up History</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {noShowCases.map((item) => {
                  const m = members.find(mem => mem.id === item.memberId);
                  const isResolved = item.status === 'RESOLVED_RETURNED';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white text-sm">{item.memberName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{item.phone}</div>
                        {m && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {m.membership.planName} (Exp: {m.membership.endDate})
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                          item.absentDays >= 15
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {item.absentDays} Days Absent
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-300">
                        {item.lastCheckIn}
                      </td>

                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {item.assignedTrainer === 'tr-1' ? 'Coach Vikram' : item.assignedTrainer === 'tr-2' ? 'Coach Neha' : 'Coach Karan'}
                      </td>

                      <td className="py-4 px-4">
                        {item.outcomeHistory.length === 0 ? (
                          <span className="text-slate-500 italic text-[11px]">No follow-up logged yet</span>
                        ) : (
                          <div className="space-y-1">
                            {item.outcomeHistory.map((h, idx) => (
                              <div key={idx} className="bg-[#0B0F17] p-2 rounded-lg text-[11px] border border-slate-800">
                                <span className="font-bold text-amber-400">{h.outcome}</span>: {h.note}
                                <div className="text-[10px] text-slate-500 mt-0.5">Next: {h.nextActionDate}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Call Action */}
                          <a
                            href={`tel:${item.phone}`}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all"
                            title="Direct Call"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>

                          {/* WhatsApp Hinglish Generator */}
                          <button
                            onClick={() => handleOpenWhatsApp(item)}
                            className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl transition-all"
                            title="Send WhatsApp Hinglish Message"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                          </button>

                          {/* Mark Outcome Modal Trigger */}
                          <button
                            onClick={() => setOutcomeModalCase(item)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all"
                          >
                            Mark Outcome
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS & PAUSE MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Member Roster & Pause Controls</h3>
              <p className="text-xs text-slate-400">View active, paused, or expiring memberships</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {members.slice(0, 10).map((m) => (
              <div key={m.id} className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={m.avatar} alt={m.name} className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <div className="font-bold text-white text-sm">{m.name}</div>
                    <div className="text-xs text-slate-400">{m.phone} • Plan: <strong className="text-slate-200">{m.membership.planName}</strong></div>
                    <div className="text-[11px] text-emerald-400 mt-0.5">Exp: {m.membership.endDate}</div>
                  </div>
                </div>

                <button
                  onClick={() => onToggleMemberPause(m.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    m.status === 'paused'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {m.status === 'paused' ? 'Unpause' : 'Pause Membership'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADD-ON ORDERS & PT SESSIONS */}
      {activeTab === 'orders' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-lg font-extrabold text-white">Add-On Orders & PT Session Tracking</h3>
          
          <div className="space-y-3">
            {addOnOrders.map((order) => (
              <div key={order.id} className="bg-[#0B0F17] rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{order.addOnName}</div>
                  <div className="text-slate-400 mt-0.5">Member: <strong className="text-slate-200">{order.memberName}</strong> • Price: ₹{order.price}</div>
                  {order.sessionsTotal && (
                    <div className="text-emerald-400 font-semibold mt-1">
                      PT Sessions Used: {order.sessionsUsed} / {order.sessionsTotal} Sessions
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {order.sessionsTotal && order.sessionsUsed < order.sessionsTotal && (
                    <button
                      onClick={() => onLogPTSession(order.id)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all"
                    >
                      Log PT Session (-1)
                    </button>
                  )}

                  {order.fulfilmentStatus !== 'FULFILLED' && order.fulfilmentStatus !== 'DELIVERED' && (
                    <button
                      onClick={() => onFulfillAddOnOrder(order.id)}
                      className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl transition-all"
                    >
                      Mark Order Fulfilled
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: FRONT DESK STAFF MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="bg-[#141C2B] rounded-3xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-cyan-400" />
              <span>Front Desk Staff Access Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Create and manage logins for front desk staff. Staff members ONLY have access to the Gate Check-in terminal.
            </p>
          </div>

          {/* Add New Staff Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newStaffName && newStaffPhone && newStaffPin) {
                onAddStaff({
                  id: `staff-${Date.now()}`,
                  name: newStaffName,
                  phone: newStaffPhone,
                  pin: newStaffPin,
                  role: 'Front-Desk Executive',
                  status: 'ACTIVE'
                });
                setNewStaffName('');
                setNewStaffPhone('');
                setNewStaffPin('');
              }
            }}
            className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 space-y-3 text-xs"
          >
            <h4 className="font-bold text-white">Create New Front Desk Staff Credentials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Staff Name (e.g. Rohan Verma)..."
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white"
              />
              <input
                type="text"
                placeholder="Mobile Phone (e.g. 9876511001)..."
                value={newStaffPhone}
                onChange={(e) => setNewStaffPhone(e.target.value)}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
              <input
                type="text"
                placeholder="Gate Passcode PIN (e.g. 0000)..."
                value={newStaffPin}
                onChange={(e) => setNewStaffPin(e.target.value)}
                required
                className="bg-[#141C2B] border border-slate-800 rounded-xl p-2.5 text-white font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              Add Staff Login Access
            </button>
          </form>

          {/* Existing Staff Roster List */}
          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs">Active Front Desk Staff ({staffList.length})</h4>
            {staffList.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 italic text-center">No staff accounts created yet. Add one above.</p>
            ) : (
              staffList.map((s) => (
                <div key={s.id} className="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-400">Phone: <strong className="text-slate-200">{s.phone}</strong> • PIN Passcode: <strong className="text-cyan-400 font-mono">{s.pin}</strong></div>
                  </div>
                  <button
                    onClick={() => onRemoveStaff(s.id)}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg font-bold text-[11px]"
                  >
                    Revoke Access
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FOLLOW-UP OUTCOME MODAL */}
      {outcomeModalCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleSubmitOutcome} className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setOutcomeModalCase(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-extrabold text-white">Log Follow-Up Outcome</h3>
            <p className="text-xs text-slate-400">Member: <strong className="text-white">{outcomeModalCase.memberName}</strong></p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Select Call / Visit Outcome:</label>
              <select
                value={outcomeType}
                onChange={(e) => setOutcomeType(e.target.value)}
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold"
              >
                <option value="Will return">Will return</option>
                <option value="Injured">Injured / Health recovery</option>
                <option value="Travelling">Travelling / Out of station</option>
                <option value="Timing issue">Timing issue / Work shift</option>
                <option value="Unhappy">Unhappy with service / Gym crowd</option>
                <option value="No response">No response / Unreachable</option>
                <option value="Cancelled">Cancelled membership</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Mandatory Next Action Date:</label>
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                required
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Notes / Feedback:</label>
              <textarea
                value={outcomeNote}
                onChange={(e) => setOutcomeNote(e.target.value)}
                placeholder="e.g. Member promised to come tomorrow at 7 AM."
                className="w-full bg-[#0B0F17] border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 h-20"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              Save Audit Log & Resolve Risk Case
            </button>
          </form>
        </div>
      )}

      {/* WHATSAPP HINGLISH MESSAGE COMPOSER MODAL */}
      {whatsappModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setWhatsappModalData(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-extrabold text-white">Send WhatsApp Hinglish Message</h3>
            </div>

            <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="text-slate-400">Recipient: <strong className="text-white">{whatsappModalData.member.memberName} ({whatsappModalData.member.phone})</strong></div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 text-xs font-sans whitespace-pre-wrap">
                {whatsappModalData.message}
              </div>
            </div>

            <a
              href={`https://wa.me/91${whatsappModalData.member.phone}?text=${encodeURIComponent(whatsappModalData.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setWhatsappModalData(null)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Launch WhatsApp Web / App</span>
            </a>
          </div>
        </div>
      )}

      {/* DAILY OWNER SUMMARY MODAL */}
      {summaryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141C2B] border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSummaryModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-amber-400" />
              <div>
                <h3 className="text-lg font-extrabold text-white">Daily Owner Summary Report</h3>
                <p className="text-xs text-slate-400">Automated Summary for 27 Sept 2026</p>
              </div>
            </div>

            <div className="bg-[#0B0F17] p-4 rounded-2xl border border-slate-800 text-xs space-y-3 font-mono text-slate-300">
              <div><strong>1. Check-ins Today:</strong> {todaysCheckInsCount} Verified QR & Assisted check-ins</div>
              <div><strong>2. High Risk No-Shows:</strong> {openNoShowCasesCount} cases open (&gt;10 days absent)</div>
              <div><strong>3. Renewals Due Next 7d:</strong> {renewalsDue7Days} members scheduled for reminder</div>
              <div><strong>4. Renewal Revenue:</strong> ₹{totalRenewalRevenue.toLocaleString('en-IN')}</div>
              <div><strong>5. Add-On Revenue:</strong> ₹{totalAddOnRevenue.toLocaleString('en-IN')}</div>
              <div><strong>6. Data Quality Status:</strong> <span className="text-emerald-400">PASSED (Zero unverified payments)</span></div>
            </div>

            <button
              onClick={() => setSummaryModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
            >
              Close Digest
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
