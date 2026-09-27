import React, { useState, useEffect } from 'react';
import HeaderNavbar from './components/HeaderNavbar';
import MemberView from './components/MemberView';
import OwnerDashboard from './components/OwnerDashboard';
import FrontDeskView from './components/FrontDeskView';
import AutomationsAndAuditView from './components/AutomationsAndAuditView';
import PaymentModal from './components/PaymentModal';
import DocumentationModal from './components/DocumentationModal';
import AddMemberModal from './components/AddMemberModal';
import AuthScreen from './components/AuthScreen';
import SuperAdminPanel from './components/SuperAdminPanel';

import { 
  INITIAL_MEMBERS, 
  INITIAL_NO_SHOW_CASES, 
  INITIAL_ATTENDANCE_LOGS, 
  INITIAL_PAYMENTS, 
  INITIAL_ADDON_ORDERS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_SETTINGS, 
  INITIAL_STAFF,
  SAMPLE_DEMO_SEED,
  PLANS, 
  ADD_ONS 
} from './data/mockData';

export default function App() {
  // Authentication State
  const [authUser, setAuthUser] = useState(() => {
    const saved = localStorage.getItem('fitpulse_auth_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Primary Application State
  const [activeRole, setActiveRole] = useState(() => {
    const saved = localStorage.getItem('fitpulse_auth_user');
    return saved ? JSON.parse(saved).role : 'member';
  });

  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    const saved = localStorage.getItem('fitpulse_auth_user');
    const userObj = saved ? JSON.parse(saved) : null;
    return userObj && userObj.memberId ? userObj.memberId : 'm-2';
  });

  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState('app'); // 'app', 'engine'

  // Domain State with LocalStorage Persistence
  const [members, setMembers] = useState(() => {
    const saved = localStorage.getItem('fitpulse_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [noShowCases, setNoShowCases] = useState(() => {
    const saved = localStorage.getItem('fitpulse_noshow');
    return saved ? JSON.parse(saved) : INITIAL_NO_SHOW_CASES;
  });

  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    const saved = localStorage.getItem('fitpulse_attendance');
    return saved ? JSON.parse(saved) : INITIAL_ATTENDANCE_LOGS;
  });

  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('fitpulse_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [addOnOrders, setAddOnOrders] = useState(() => {
    const saved = localStorage.getItem('fitpulse_addon_orders');
    return saved ? JSON.parse(saved) : INITIAL_ADDON_ORDERS;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('fitpulse_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [staffList, setStaffList] = useState(() => {
    const saved = localStorage.getItem('fitpulse_staff');
    return saved ? JSON.parse(saved) : INITIAL_STAFF;
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('fitpulse_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  // Sync to localStorage
  useEffect(() => { localStorage.setItem('fitpulse_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('fitpulse_noshow', JSON.stringify(noShowCases)); }, [noShowCases]);
  useEffect(() => { localStorage.setItem('fitpulse_attendance', JSON.stringify(attendanceLogs)); }, [attendanceLogs]);
  useEffect(() => { localStorage.setItem('fitpulse_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('fitpulse_addon_orders', JSON.stringify(addOnOrders)); }, [addOnOrders]);
  useEffect(() => { localStorage.setItem('fitpulse_audit', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('fitpulse_staff', JSON.stringify(staffList)); }, [staffList]);
  useEffect(() => { localStorage.setItem('fitpulse_settings', JSON.stringify(settings)); }, [settings]);

  // Admin & Staff Handlers
  const handleUpdateGymStatus = (newStatus, blockReason) => {
    setSettings(prev => ({ ...prev, gymStatus: newStatus, blockReason }));
  };

  const handleAddStaff = (newStaff) => {
    setStaffList(prev => [...prev, newStaff]);
  };

  const handleRemoveStaff = (staffId) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
  };

  const handleSeedDemoData = () => {
    setMembers(SAMPLE_DEMO_SEED.members);
    setNoShowCases(SAMPLE_DEMO_SEED.noShowCases);
    setAttendanceLogs(SAMPLE_DEMO_SEED.attendanceLogs);
    setPayments(SAMPLE_DEMO_SEED.payments);
    setSelectedMemberId('m-1');
  };

  const handleResetAllData = () => {
    setMembers([]);
    setNoShowCases([]);
    setAttendanceLogs([]);
    setPayments([]);
    setAddOnOrders([]);
    setAuditLogs([{ id: `log-${Date.now()}`, timestamp: "2026-09-27 10:00 AM", actor: "Super Admin", action: "DATABASE_RESET", target: "All Tables", details: "Wiped to clean empty state." }]);
  };

  // Authentication Handlers
  const handleLogin = (userObj) => {
    setAuthUser(userObj);
    localStorage.setItem('fitpulse_auth_user', JSON.stringify(userObj));
    setActiveRole(userObj.role);
    if (userObj.memberId) {
      setSelectedMemberId(userObj.memberId);
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    localStorage.removeItem('fitpulse_auth_user');
  };

  // Payment Modal State
  const [paymentModalData, setPaymentModalData] = useState(null);

  // Active Member object
  const activeMember = members.find(m => m.id === selectedMemberId) || members[0];

  // Helper date adder
  const addMonthsToDateStr = (dateStr, months) => {
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  };

  // 1. HANDLER: Perform Check-in (QR or Assisted)
  const handlePerformCheckIn = (memberId, method, reason = '') => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return { status: 'ERROR', message: 'Member not found.' };

    const todayStr = "2026-09-27";

    // Validation: Duplicate scan check (within 60 mins / same day test)
    const existingLog = attendanceLogs.find(a => a.memberId === memberId && a.timestamp.startsWith(todayStr));
    if (existingLog && method === 'QR_SELF') {
      return {
        status: 'DUPLICATE_SCAN',
        message: `Duplicate check-in blocked! ${targetMember.name} already checked in today at ${existingLog.timestamp.split(' ')[1]}.`
      };
    }

    // Validation: Expired membership check
    const now = new Date("2026-09-27T10:00:00+05:30");
    const endDate = new Date(targetMember.membership.endDate);
    if (endDate < now || targetMember.status === 'expired') {
      return {
        status: 'EXPIRED_MEMBERSHIP',
        message: `Check-in blocked! Membership for ${targetMember.name} expired on ${targetMember.membership.endDate}.`
      };
    }

    // Success check-in logic
    const timeNowStr = "2026-09-27 10:15 AM";
    const newLog = {
      id: `att-${Date.now()}`,
      memberId,
      memberName: targetMember.name,
      timestamp: timeNowStr,
      method,
      reason,
      status: 'SUCCESS',
      device: method === 'QR_SELF' ? 'Member Mobile App' : 'Front-Desk Terminal'
    };

    setAttendanceLogs(prev => [newLog, ...prev]);

    // Update member streak & clear absent count
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const newStreak = m.streak.current + 1;
        return {
          ...m,
          streak: {
            ...m.streak,
            current: newStreak,
            max: Math.max(m.streak.max, newStreak)
          },
          lastCheckIn: timeNowStr,
          absentDaysCount: 0
        };
      }
      return m;
    }));

    // Auto-resolve any open no-show risk case for this member
    setNoShowCases(prev => prev.map(c => {
      if (c.memberId === memberId && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')) {
        return { ...c, status: 'RESOLVED_RETURNED', resolvedAt: timeNowStr };
      }
      return c;
    }));

    // Record Audit Log
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: timeNowStr,
      actor: method === 'QR_SELF' ? `${targetMember.name} (Member)` : 'Rohan Verma (Front-Desk)',
      action: method === 'QR_SELF' ? 'QR_SELF_CHECKIN' : 'ASSISTED_CHECKIN',
      target: `${targetMember.name} (${memberId})`,
      details: reason ? `Reason: ${reason}` : 'Verified Gate QR Scan'
    }, ...prev]);

    return {
      status: 'SUCCESS',
      message: `Check-in Verified! Welcome ${targetMember.name}. Streak is now ${targetMember.streak.current + 1} days! 🔥`
    };
  };

  // 2. HANDLER: Single-Execution Verified Payment Success
  const handleSuccessPayment = (paymentData) => {
    const { memberId, planId, amount, provider, transactionRef, idempotencyKey } = paymentData;
    const targetPlan = PLANS.find(p => p.id === planId) || PLANS[0];
    const targetMember = members.find(m => m.id === memberId);

    // 1. Extend membership endDate safely
    const currentEnd = targetMember.membership.endDate;
    const newEnd = addMonthsToDateStr(currentEnd, targetPlan.durationMonths);

    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          status: 'active',
          membership: {
            ...m.membership,
            planId: targetPlan.id,
            planName: targetPlan.name,
            endDate: newEnd,
            amountPaid: amount
          }
        };
      }
      return m;
    }));

    // 2. Record Verified Payment Record
    const newPayment = {
      id: `pay-${Date.now()}`,
      orderId: `ord-${Math.floor(100 + Math.random() * 900)}`,
      memberId,
      memberName: targetMember.name,
      planId,
      planName: targetPlan.name,
      amount,
      provider,
      status: 'PAID',
      transactionRef,
      timestamp: "2026-09-27 10:20 AM",
      idempotencyKey
    };

    setPayments(prev => [newPayment, ...prev]);

    // 3. Record Audit Entry
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: "2026-09-27 10:20 AM",
      actor: `${targetMember.name} (Member)`,
      action: 'PAYMENT_VERIFIED_MEMBERSHIP_EXTENDED',
      target: `${targetMember.name} (${memberId})`,
      details: `Plan: ${targetPlan.name} | Amount: ₹${amount} | Extended to: ${newEnd} | TxnRef: ${transactionRef}`
    }, ...prev]);
  };

  // HANDLER: Add New Member (Owner Feature)
  const handleAddMember = (newMemberData, plan, paymentMode) => {
    // 1. Add to Members list
    setMembers(prev => [newMemberData, ...prev]);

    // 2. Select the new member immediately
    setSelectedMemberId(newMemberData.id);

    // 3. Record Initial Payment
    const newPayment = {
      id: `pay-${Date.now()}`,
      orderId: `ord-${Math.floor(100 + Math.random() * 900)}`,
      memberId: newMemberData.id,
      memberName: newMemberData.name,
      planId: plan.id,
      planName: plan.name,
      amount: plan.finalPrice,
      provider: paymentMode,
      status: 'PAID',
      transactionRef: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: "2026-09-27 10:20 AM",
      idempotencyKey: `ik_reg_${newMemberData.id}`
    };
    setPayments(prev => [newPayment, ...prev]);

    // 4. Log Audit Entry
    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: "2026-09-27 10:20 AM",
      actor: 'Owner (Manager)',
      action: 'NEW_MEMBER_REGISTERED',
      target: `${newMemberData.name} (${newMemberData.phone})`,
      details: `Plan: ${plan.name} | Amount: ₹${plan.finalPrice} | Expiry: ${newMemberData.membership.endDate}`
    }, ...prev]);
  };

  // 3. HANDLER: Buy Add-On (PT / Diet / Supplement)
  const handleBuyAddOn = (memberId, addOn) => {
    const targetMember = members.find(m => m.id === memberId);
    
    const newOrder = {
      id: `aoo-${Date.now()}`,
      memberId,
      memberName: targetMember.name,
      addOnId: addOn.id,
      addOnName: addOn.name,
      price: addOn.price,
      status: 'PAID',
      fulfilmentStatus: addOn.category === 'Personal Training' ? 'ACTIVE' : 'PENDING_FULFILMENT',
      sessionsTotal: addOn.category === 'Personal Training' ? 10 : null,
      sessionsUsed: addOn.category === 'Personal Training' ? 0 : null,
      orderDate: "2026-09-27"
    };

    setAddOnOrders(prev => [newOrder, ...prev]);

    // Decrement stock if applicable
    if (addOn.stockOrCapacity !== null) {
      ADD_ONS.forEach(item => {
        if (item.id === addOn.id && item.stockOrCapacity > 0) {
          item.stockOrCapacity -= 1;
        }
      });
    }

    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: "2026-09-27 10:25 AM",
      actor: `${targetMember.name} (Member)`,
      action: 'ADD_ON_PURCHASED',
      target: addOn.name,
      details: `Amount: ₹${addOn.price} | Order ID: ${newOrder.id}`
    }, ...prev]);
  };

  // 4. HANDLER: Update No-Show Follow-Up Outcome
  const handleUpdateNoShowOutcome = (caseId, outcome, note, nextActionDate) => {
    const timeNowStr = "2026-09-27 10:30 AM";

    setNoShowCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const newHistory = [
          { date: timeNowStr, outcome, note, nextActionDate, followUpBy: 'Owner' },
          ...c.outcomeHistory
        ];
        const newStatus = outcome === 'Will return' ? 'RESOLVED_RETURNED' : 'IN_PROGRESS';
        return {
          ...c,
          status: newStatus,
          lastFollowUp: timeNowStr,
          outcomeHistory: newHistory
        };
      }
      return c;
    }));

    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: timeNowStr,
      actor: 'Owner (Manager)',
      action: 'NO_SHOW_OUTCOME_LOGGED',
      target: `Case #${caseId}`,
      details: `Outcome: ${outcome} | Next Action Date: ${nextActionDate} | Notes: "${note}"`
    }, ...prev]);
  };

  // 5. HANDLER: Run Daily No-Show Scan Automation
  const handleRunDailyScan = () => {
    let newCasesCount = 0;
    members.forEach(m => {
      if (m.status === 'active' && m.absentDaysCount >= settings.noShowThresholdDays) {
        const existingCase = noShowCases.find(c => c.memberId === m.id && (c.status === 'OPEN' || c.status === 'IN_PROGRESS'));
        if (!existingCase) {
          newCasesCount++;
          setNoShowCases(prev => [
            {
              id: `ns-${Date.now()}-${m.id}`,
              memberId: m.id,
              memberName: m.name,
              phone: m.phone,
              absentDays: m.absentDaysCount,
              lastCheckIn: m.lastCheckIn,
              status: 'OPEN',
              assignedTrainer: m.assignedTrainer,
              lastFollowUp: null,
              outcomeHistory: []
            },
            ...prev
          ]);
        }
      }
    });

    setAuditLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: "2026-09-27 10:35 AM",
      actor: 'System Automation Engine',
      action: 'DAILY_NOSHOW_SCAN_EXECUTED',
      target: 'Member Base (30)',
      details: `Scanned 30 members. Identified ${newCasesCount} new risk cases >= ${settings.noShowThresholdDays} days.`
    }, ...prev]);

    alert(`No-Show Scan Executed! Scanned 30 members. Found ${newCasesCount} new risk cases.`);
  };

  // 6. HANDLER: Toggle Member Pause State
  const handleToggleMemberPause = (memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const newStatus = m.status === 'paused' ? 'active' : 'paused';
        return { ...m, status: newStatus, pauseReason: newStatus === 'paused' ? 'Owner manual freeze' : null };
      }
      return m;
    }));
  };

  // 7. HANDLER: Fulfill Add-on Order
  const handleFulfillAddOnOrder = (orderId) => {
    setAddOnOrders(prev => prev.map(o => {
      if (o.id === orderId) return { ...o, fulfilmentStatus: 'FULFILLED' };
      return o;
    }));
  };

  // 8. HANDLER: Log PT Session Usage
  const handleLogPTSession = (orderId) => {
    setAddOnOrders(prev => prev.map(o => {
      if (o.id === orderId && o.sessionsUsed < o.sessionsTotal) {
        return { ...o, sessionsUsed: o.sessionsUsed + 1 };
      }
      return o;
    }));
  };

  // 9. HANDLER: Toggle WhatsApp Opt-Out
  const handleToggleWhatsappOptOut = (memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        return { ...m, optedOutWhatsapp: !m.optedOutWhatsapp };
      }
      return m;
    }));
  };

  // If unauthenticated or gym is blocked (for non-admins), render AuthScreen
  if (!authUser || (settings.gymStatus === 'BLOCKED' && authUser.role !== 'admin')) {
    return (
      <>
        <AuthScreen
          members={members}
          onLogin={handleLogin}
          gymStatus={settings.gymStatus}
          blockReason={settings.blockReason}
          onOpenSuperAdmin={() => setSuperAdminOpen(true)}
          onRegisterNewMember={(newMemberData, plan, paymentMode) => {
            handleAddMember(newMemberData, plan, paymentMode);
            handleLogin({
              role: 'member',
              memberId: newMemberData.id,
              name: newMemberData.name,
              phone: newMemberData.phone,
              avatar: newMemberData.avatar
            });
          }}
        />

        {superAdminOpen && (
          <SuperAdminPanel
            settings={settings}
            onUpdateGymStatus={handleUpdateGymStatus}
            onSeedDemoData={handleSeedDemoData}
            onResetAllData={handleResetAllData}
            auditLogs={auditLogs}
            membersCount={members.length}
            onClose={() => setSuperAdminOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Header Navbar */}
      <HeaderNavbar
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        selectedMemberId={selectedMemberId}
        setSelectedMemberId={setSelectedMemberId}
        members={members}
        isMobileFrame={isMobileFrame}
        setIsMobileFrame={setIsMobileFrame}
        openDocsModal={() => setDocsModalOpen(true)}
        alertsCount={noShowCases.filter(c => c.status === 'OPEN').length}
        authUser={authUser}
        onLogout={handleLogout}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Toggleable Layout: Mobile Device Frame vs Full Screen View */}
        {isMobileFrame ? (
          <div className="max-w-md mx-auto my-4">
            
            {/* Mobile Phone Mockup Frame */}
            <div className="bg-[#141C2B] border-4 border-slate-700/80 rounded-[45px] p-4 shadow-2xl shadow-emerald-500/5 relative overflow-hidden ring-1 ring-slate-800">
              
              {/* iPhone Notch Simulator */}
              <div className="w-36 h-5 bg-[#0B0F17] rounded-b-2xl mx-auto mb-3 flex items-center justify-center gap-2 border-x border-b border-slate-800">
                <div className="w-3 h-3 bg-slate-800 rounded-full" />
                <div className="w-8 h-1.5 bg-slate-800 rounded-full" />
              </div>

              {/* Internal Screen Container */}
              <div className="min-h-[640px] space-y-4">
                
                {activeBottomNav === 'app' ? (
                  activeRole === 'member' ? (
                    <MemberView
                      member={activeMember}
                      plans={PLANS}
                      addOns={ADD_ONS}
                      attendanceLogs={attendanceLogs}
                      onPerformCheckIn={handlePerformCheckIn}
                      onOpenPaymentModal={(m, plan) => setPaymentModalData({ member: m, plan })}
                      onBuyAddOn={handleBuyAddOn}
                      onToggleWhatsappOptOut={handleToggleWhatsappOptOut}
                    />
                  ) : activeRole === 'owner' ? (
                    <OwnerDashboard
                      members={members}
                      noShowCases={noShowCases}
                      payments={payments}
                      addOnOrders={addOnOrders}
                      attendanceLogs={attendanceLogs}
                      settings={settings}
                      onUpdateNoShowOutcome={handleUpdateNoShowOutcome}
                      onRunDailyScan={handleRunDailyScan}
                      onToggleMemberPause={handleToggleMemberPause}
                      onFulfillAddOnOrder={handleFulfillAddOnOrder}
                      onLogPTSession={handleLogPTSession}
                      onOpenAddMemberModal={() => setAddMemberModalOpen(true)}
                      staffList={staffList}
                      onAddStaff={handleAddStaff}
                      onRemoveStaff={handleRemoveStaff}
                    />
                  ) : (
                    <FrontDeskView
                      members={members}
                      attendanceLogs={attendanceLogs}
                      onPerformCheckIn={handlePerformCheckIn}
                    />
                  )
                ) : (
                  <AutomationsAndAuditView
                    settings={settings}
                    members={members}
                    noShowCases={noShowCases}
                    payments={payments}
                    attendanceLogs={attendanceLogs}
                    addOns={ADD_ONS}
                    auditLogs={auditLogs}
                    onRunDailyScan={handleRunDailyScan}
                  />
                )}

              </div>

              {/* Mobile Frame Bottom Nav Switcher */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-around text-[11px] font-bold text-slate-400">
                <button
                  onClick={() => setActiveBottomNav('app')}
                  className={`flex flex-col items-center gap-1 ${activeBottomNav === 'app' ? 'text-emerald-400' : 'hover:text-slate-200'}`}
                >
                  <span>Role View App</span>
                </button>

                <button
                  onClick={() => setActiveBottomNav('engine')}
                  className={`flex flex-col items-center gap-1 ${activeBottomNav === 'engine' ? 'text-purple-400' : 'hover:text-slate-200'}`}
                >
                  <span>Automations & Audit</span>
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* Full Responsive View */
          <div className="space-y-6">
            
            {/* View Mode Bar */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 font-bold text-xs">
              <button
                onClick={() => setActiveBottomNav('app')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeBottomNav === 'app' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Primary Application UI
              </button>

              <button
                onClick={() => setActiveBottomNav('engine')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeBottomNav === 'engine' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Automations & Data Quality Audit Engine
              </button>
            </div>

            {activeBottomNav === 'app' ? (
              activeRole === 'member' ? (
                <MemberView
                  member={activeMember}
                  plans={PLANS}
                  addOns={ADD_ONS}
                  attendanceLogs={attendanceLogs}
                  onPerformCheckIn={handlePerformCheckIn}
                  onOpenPaymentModal={(m, plan) => setPaymentModalData({ member: m, plan })}
                  onBuyAddOn={handleBuyAddOn}
                  onToggleWhatsappOptOut={handleToggleWhatsappOptOut}
                />
              ) : activeRole === 'owner' ? (
                <OwnerDashboard
                  members={members}
                  noShowCases={noShowCases}
                  payments={payments}
                  addOnOrders={addOnOrders}
                  attendanceLogs={attendanceLogs}
                  settings={settings}
                  onUpdateNoShowOutcome={handleUpdateNoShowOutcome}
                  onRunDailyScan={handleRunDailyScan}
                  onToggleMemberPause={handleToggleMemberPause}
                  onFulfillAddOnOrder={handleFulfillAddOnOrder}
                  onLogPTSession={handleLogPTSession}
                  onOpenAddMemberModal={() => setAddMemberModalOpen(true)}
                  staffList={staffList}
                  onAddStaff={handleAddStaff}
                  onRemoveStaff={handleRemoveStaff}
                />
              ) : (
                <FrontDeskView
                  members={members}
                  attendanceLogs={attendanceLogs}
                  onPerformCheckIn={handlePerformCheckIn}
                />
              )
            ) : (
              <AutomationsAndAuditView
                settings={settings}
                members={members}
                noShowCases={noShowCases}
                payments={payments}
                attendanceLogs={attendanceLogs}
                addOns={ADD_ONS}
                auditLogs={auditLogs}
                onRunDailyScan={handleRunDailyScan}
              />
            )}

          </div>
        )}

      </main>

      {/* Add New Member Modal */}
      {addMemberModalOpen && (
        <AddMemberModal
          onClose={() => setAddMemberModalOpen(false)}
          onAddMember={handleAddMember}
        />
      )}

      {/* Super Admin Control Panel */}
      {superAdminOpen && (
        <SuperAdminPanel
          settings={settings}
          onUpdateGymStatus={handleUpdateGymStatus}
          onSeedDemoData={handleSeedDemoData}
          onResetAllData={handleResetAllData}
          auditLogs={auditLogs}
          membersCount={members.length}
          onClose={() => setSuperAdminOpen(false)}
        />
      )}

      {/* Simulated Payment Gateway Modal */}
      {paymentModalData && (
        <PaymentModal
          member={paymentModalData.member}
          plan={paymentModalData.plan}
          onClose={() => setPaymentModalData(null)}
          onSuccessPayment={handleSuccessPayment}
        />
      )}

      {/* Full Documentation & Screen Map Modal */}
      {docsModalOpen && (
        <DocumentationModal onClose={() => setDocsModalOpen(false)} />
      )}

      {/* Footer */}
      <footer className="bg-[#141C2B]/50 border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        FitPulse Gym Retention OS • Tier-2 Indian Gym Churn Prevention Prototype • Indore, MP
      </footer>

    </div>
  );
}
