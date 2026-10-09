import React, { useState, useEffect, useCallback } from 'react';
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
  INITIAL_GYMS,
  INITIAL_STAFF,
  SAMPLE_DEMO_SEED,
  PLANS,
  ADD_ONS
} from './data/mockData';
import SecretAdminAuthModal from './components/SecretAdminAuthModal';

import {
  isSupabaseConfigured,
  checkSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
  getSupabaseSqlEditorUrl,
  fetchMembers,
  upsertMember,
  fetchAttendance,
  insertAttendanceLog,
  fetchPayments,
  insertPayment,
  fetchNoShowCases,
  upsertNoShowCase,
  fetchStaff,
  insertStaff,
  removeStaff,
  fetchAuditLogs,
  insertAuditLog,
  fetchAddonOrders,
  insertAddonOrder,
  updateAddonOrder,
  fetchGyms,
  upsertGym,
  deleteGymFromDb,
  loadSettings,
  saveSettings,
  nowStr,
  todayISO,
} from './lib/db';

// ── Helpers ────────────────────────────────────────
const ls = {
  get: (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
};

const addMonthsToDateStr = (dateStr, months) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
};

// ─────────────────────────────────────────────────────
export default function App() {

  // ── Authentication State ───────────────────────────
  const [authUser, setAuthUser] = useState(() => ls.get('fitpulse_auth_user', null));

  // Active role is ALWAYS derived from authUser — cannot be overridden by user
  const activeRole = authUser?.role || 'member';

  // ── Domain State (Clean Production First) ───────────
  const getCleanState = (key, fallback) => {
    const data = ls.get(key, fallback);
    if (Array.isArray(data)) {
      const hasDummy = data.some(item =>
        item?.id === 'm-1' || item?.id === 'm-2' || item?.id === 'm-3' ||
        item?.name === 'Rahul Sharma' || item?.memberName === 'Rahul Sharma'
      );
      if (hasDummy) {
        ls.set(key, fallback);
        return fallback;
      }
    }
    return data;
  };

  const [members, setMembers] = useState(() => getCleanState('fitpulse_members', INITIAL_MEMBERS));
  const [noShowCases, setNoShowCases] = useState(() => getCleanState('fitpulse_noshow', INITIAL_NO_SHOW_CASES));
  const [attendanceLogs, setAttendanceLogs] = useState(() => getCleanState('fitpulse_attendance', INITIAL_ATTENDANCE_LOGS));
  const [payments, setPayments] = useState(() => getCleanState('fitpulse_payments', INITIAL_PAYMENTS));
  const [addOnOrders, setAddOnOrders] = useState(() => getCleanState('fitpulse_addon_orders', INITIAL_ADDON_ORDERS));
  const [auditLogs, setAuditLogs] = useState(() => ls.get('fitpulse_audit', INITIAL_AUDIT_LOGS));
  const [staffList, setStaffList] = useState(() => ls.get('fitpulse_staff', INITIAL_STAFF));
  const [gymsList, setGymsList] = useState(() => ls.get('fitpulse_gyms_registry', INITIAL_GYMS));
  const [settings, setSettings] = useState(() => loadSettings());

  // For member view — which member is selected (for demo persona testing)
  const [selectedMemberId, setSelectedMemberId] = useState(() => {
    const user = ls.get('fitpulse_auth_user', null);
    return user?.memberId || null;
  });

  // UI State
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [secretAdminModalOpen, setSecretAdminModalOpen] = useState(false);
  const [activeBottomNav, setActiveBottomNav] = useState('app');
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [backendStatus, setBackendStatus] = useState(isSupabaseConfigured ? 'supabase' : 'local');
  const [schemaCopied, setSchemaCopied] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  const copySchemaSql = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
      setSchemaCopied(true);
      setTimeout(() => setSchemaCopied(false), 2500);
    } catch {
      setConnectionMessage('Could not copy SQL. Open supabase/schema.sql and paste it in the SQL Editor.');
    }
  }, []);

  // ── Load from Supabase on mount ────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    setIsLoadingData(true);

    (async () => {
      const health = await checkSupabaseConnection();
      if (cancelled) return;

      if (health.status === 'missing_tables') {
        setBackendStatus('missing_tables');
        setConnectionMessage(health.message || 'Tables are not created yet.');
        return;
      }
      if (health.status === 'error') {
        setBackendStatus('error');
        setConnectionMessage(health.message || 'Could not reach Supabase.');
        return;
      }

      setBackendStatus('supabase');
      try {
        const [mbs, atts, pays, nsc, stf, audits, addons, gyms] = await Promise.all([
          fetchMembers(),
          fetchAttendance(),
          fetchPayments(),
          fetchNoShowCases(),
          fetchStaff(),
          fetchAuditLogs(),
          fetchAddonOrders(),
          fetchGyms(),
        ]);
        if (cancelled) return;
        if (mbs.length) setMembers(mbs);
        if (atts.length) setAttendanceLogs(atts);
        if (pays.length) setPayments(pays);
        if (nsc.length) setNoShowCases(nsc);
        if (stf.length) setStaffList(stf);
        if (audits.length) setAuditLogs(audits);
        if (addons.length) setAddOnOrders(addons);
        if (gyms.length) setGymsList(gyms);
      } catch (err) {
        console.error('Supabase load error:', err);
        if (!cancelled) {
          setBackendStatus('error');
          setConnectionMessage(err.message || 'Failed to load data from Supabase.');
        }
      }
    })().finally(() => {
      if (!cancelled) setIsLoadingData(false);
    });

    return () => { cancelled = true; };
  }, []);

  // ── Sync to localStorage on change ────────────────
  useEffect(() => { ls.set('fitpulse_members', members); }, [members]);
  useEffect(() => { ls.set('fitpulse_noshow', noShowCases); }, [noShowCases]);
  useEffect(() => { ls.set('fitpulse_attendance', attendanceLogs); }, [attendanceLogs]);
  useEffect(() => { ls.set('fitpulse_payments', payments); }, [payments]);
  useEffect(() => { ls.set('fitpulse_addon_orders', addOnOrders); }, [addOnOrders]);
  useEffect(() => { ls.set('fitpulse_audit', auditLogs); }, [auditLogs]);
  useEffect(() => { ls.set('fitpulse_staff', staffList); }, [staffList]);
  useEffect(() => { ls.set('fitpulse_gyms_registry', gymsList); }, [gymsList]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Global Secret Shortcut: Ctrl + Shift + A (or Cmd + Shift + A)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setSecretAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── URL Hash-based Admin Route (/#admin, /#/admin, ../#admin) ──
  useEffect(() => {
    const handleHashCheck = () => {
      const h = (window.location.hash || '').toLowerCase();
      if (h === '#admin' || h === '#/admin' || h.includes('admin')) {
        if (authUser?.role !== 'admin') {
          setSecretAdminModalOpen(true);
        }
      }
    };
    handleHashCheck();
    window.addEventListener('hashchange', handleHashCheck);
    return () => window.removeEventListener('hashchange', handleHashCheck);
  }, [authUser]);

  // ── Auth Handlers ──────────────────────────────────
  const handleLogin = useCallback((userObj, gymObj) => {
    // Strict role assignment — role comes from the login, cannot be changed post-auth
    setAuthUser(userObj);
    ls.set('fitpulse_auth_user', userObj);
    if (userObj.memberId) {
      setSelectedMemberId(userObj.memberId);
    }
    if (gymObj) {
      setSettings(prev => {
        const updated = {
          ...prev,
          gymName: gymObj.gymName || prev.gymName,
          location: gymObj.location || prev.location,
          gymStatus: gymObj.status || 'ACTIVE',
          blockReason: gymObj.blockReason || '',
          ownerName: gymObj.ownerName || prev.ownerName,
          ownerCredentials: {
            name: gymObj.ownerName || prev.ownerName,
            phone: gymObj.ownerPhone || prev.ownerCredentials?.phone,
            password: gymObj.ownerPassword || prev.ownerCredentials?.password
          }
        };
        saveSettings(updated);
        return updated;
      });
    }
    if (userObj.role === 'admin') {
      window.location.hash = 'admin';
    }
  }, []);

  const handleLogout = useCallback(() => {
    setAuthUser(null);
    ls.remove('fitpulse_auth_user');
    setSelectedMemberId(null);
    setActiveBottomNav('app');
    if (window.location.hash === '#admin' || window.location.hash === '#/admin') {
      history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // ── Computed Values ────────────────────────────────
  // For member view: show the authenticated member's data, not any other member
  const activeMember = (() => {
    if (activeRole === 'member') {
      // If logged in as member, ONLY show their own data
      if (authUser?.memberId) {
        return members.find(m => m.id === authUser.memberId) || members.find(m => m.id === selectedMemberId) || members[0];
      }
      return members.find(m => m.id === selectedMemberId) || members[0];
    }
    return members[0]; // not used for owner/frontdesk
  })();

  // ── HANDLER: Perform Check-in ──────────────────────
  const handlePerformCheckIn = useCallback((memberId, method, reason = '') => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return { status: 'ERROR', message: 'Member not found.' };

    const todayStr = todayISO();
    const timeNowStr = nowStr();

    // Duplicate scan check (same day / within 60 mins)
    const existingLog = attendanceLogs.find(a =>
      a.memberId === memberId &&
      (a.timestamp?.startsWith?.(todayStr) || new Date(a.timestamp).toISOString().startsWith(todayStr))
    );
    if (existingLog && method === 'QR_SELF') {
      return {
        status: 'DUPLICATE_SCAN',
        message: `Already checked in today! ${targetMember.name} checked in at ${
          typeof existingLog.timestamp === 'string' && existingLog.timestamp.includes(' ')
            ? existingLog.timestamp.split(' ').slice(1).join(' ')
            : new Date(existingLog.timestamp).toLocaleTimeString('en-IN', { hour12: true })
        }.`
      };
    }

    // Expired membership check
    const endDate = new Date(targetMember.membership.endDate);
    endDate.setHours(23, 59, 59, 999);
    const isExpired = endDate < new Date() || targetMember.status === 'expired';
    if (isExpired) {
      return {
        status: 'EXPIRED_MEMBERSHIP',
        message: `Check-in blocked! Membership for ${targetMember.name} expired on ${targetMember.membership.endDate}.`
      };
    }

    // Paused membership check
    if (targetMember.status === 'paused') {
      return {
        status: 'PAUSED_MEMBERSHIP',
        message: `Check-in blocked! Membership for ${targetMember.name} is currently paused.`
      };
    }

    // Success
    const newLog = {
      id: `att-${Date.now()}`,
      memberId,
      memberName: targetMember.name,
      timestamp: new Date().toISOString(),
      method,
      reason,
      status: 'SUCCESS',
      device: method === 'QR_SELF' ? 'Member Mobile App' : 'Front-Desk Terminal'
    };

    setAttendanceLogs(prev => [newLog, ...prev]);
    insertAttendanceLog(newLog);

    // Update streak
    const newStreak = targetMember.streak.current + 1;
    const updatedMember = {
      ...targetMember,
      streak: { ...targetMember.streak, current: newStreak, max: Math.max(targetMember.streak.max, newStreak) },
      lastCheckIn: new Date().toISOString(),
      absentDaysCount: 0
    };
    setMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
    upsertMember(updatedMember);

    // Auto-resolve no-show case
    const updatedCases = noShowCases.map(c => {
      if (c.memberId === memberId && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')) {
        const resolved = { ...c, status: 'RESOLVED_RETURNED', resolvedAt: new Date().toISOString() };
        upsertNoShowCase(resolved);
        return resolved;
      }
      return c;
    });
    setNoShowCases(updatedCases);

    // Audit log
    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: method === 'QR_SELF' ? `${targetMember.name} (Member)` : `${authUser?.name || 'Front-Desk'} (Staff)`,
      action: method === 'QR_SELF' ? 'QR_SELF_CHECKIN' : 'ASSISTED_CHECKIN',
      target: `${targetMember.name} (${memberId})`,
      details: reason ? `Reason: ${reason}` : 'Verified Gate QR Scan'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);

    return {
      status: 'SUCCESS',
      message: `✅ Welcome ${targetMember.name}! Check-in verified. Streak: ${newStreak} days 🔥`
    };
  }, [members, attendanceLogs, noShowCases, authUser]);

  // ── HANDLER: Payment Success ───────────────────────
  const handleSuccessPayment = useCallback((paymentData) => {
    const { memberId, planId, amount, provider, transactionRef, idempotencyKey } = paymentData;

    // Idempotency guard — prevent duplicate callbacks
    if (payments.find(p => p.idempotencyKey === idempotencyKey)) {
      console.warn('Duplicate payment callback blocked:', idempotencyKey);
      return;
    }

    const targetPlan = PLANS.find(p => p.id === planId) || PLANS[0];
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    const currentEnd = targetMember.membership.endDate;
    const baseDate = new Date(currentEnd) < new Date() ? new Date().toISOString().split('T')[0] : currentEnd;
    const newEnd = addMonthsToDateStr(baseDate, targetPlan.durationMonths);

    const updatedMember = {
      ...targetMember,
      status: 'active',
      membership: {
        ...targetMember.membership,
        planId: targetPlan.id,
        planName: targetPlan.name,
        endDate: newEnd,
        amountPaid: amount
      }
    };
    setMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
    upsertMember(updatedMember);

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
      timestamp: new Date().toISOString(),
      idempotencyKey
    };
    setPayments(prev => [newPayment, ...prev]);
    insertPayment(newPayment);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: `${targetMember.name} (Member)`,
      action: 'PAYMENT_VERIFIED_MEMBERSHIP_EXTENDED',
      target: `${targetMember.name} (${memberId})`,
      details: `Plan: ${targetPlan.name} | Amount: ₹${amount} | Extended to: ${newEnd} | TxnRef: ${transactionRef}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);

    setPaymentModalData(null);
  }, [members, payments]);

  // ── HANDLER: Add New Member ────────────────────────
  const handleAddMember = useCallback(async (newMemberData, plan, paymentMode) => {
    setMembers(prev => [newMemberData, ...prev]);
    await upsertMember(newMemberData);

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
      timestamp: new Date().toISOString(),
      idempotencyKey: `ik_reg_${newMemberData.id}`
    };
    setPayments(prev => [newPayment, ...prev]);
    insertPayment(newPayment);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: `${authUser?.name || 'Owner'} (Manager)`,
      action: 'NEW_MEMBER_REGISTERED',
      target: `${newMemberData.name} (${newMemberData.phone})`,
      details: `Plan: ${plan.name} | Amount: ₹${plan.finalPrice} | Expiry: ${newMemberData.membership.endDate}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [authUser]);

  // ── HANDLER: Buy Add-On ────────────────────────────
  const handleBuyAddOn = useCallback((memberId, addOn) => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

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
      orderDate: todayISO()
    };

    setAddOnOrders(prev => [newOrder, ...prev]);
    insertAddonOrder(newOrder);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: `${targetMember.name} (Member)`,
      action: 'ADD_ON_PURCHASED',
      target: addOn.name,
      details: `Amount: ₹${addOn.price} | Order ID: ${newOrder.id}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [members]);

  // ── HANDLER: No-Show Outcome ───────────────────────
  const handleUpdateNoShowOutcome = useCallback((caseId, outcome, note, nextActionDate) => {
    const updated = noShowCases.map(c => {
      if (c.id === caseId) {
        const newHistory = [{
          date: new Date().toISOString(),
          outcome, note, nextActionDate,
          followUpBy: authUser?.name || 'Owner'
        }, ...c.outcomeHistory];
        const newStatus = outcome === 'Will return' ? 'RESOLVED_RETURNED' : 'IN_PROGRESS';
        const updCase = { ...c, status: newStatus, lastFollowUp: new Date().toISOString(), outcomeHistory: newHistory };
        upsertNoShowCase(updCase);
        return updCase;
      }
      return c;
    });
    setNoShowCases(updated);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: `${authUser?.name || 'Owner'} (Manager)`,
      action: 'NO_SHOW_OUTCOME_LOGGED',
      target: `Case #${caseId}`,
      details: `Outcome: ${outcome} | Next Action: ${nextActionDate} | Notes: "${note}"`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [noShowCases, authUser]);

  // ── HANDLER: Daily No-Show Scan ────────────────────
  const handleRunDailyScan = useCallback(() => {
    let newCasesCount = 0;
    const newCases = [];

    members.forEach(m => {
      if (m.status === 'active' && m.absentDaysCount >= settings.noShowThresholdDays) {
        const existingCase = noShowCases.find(c =>
          c.memberId === m.id && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')
        );
        if (!existingCase) {
          newCasesCount++;
          const newCase = {
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
          };
          newCases.push(newCase);
          upsertNoShowCase(newCase);
        }
      }
    });

    setNoShowCases(prev => [...newCases, ...prev]);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'System Automation Engine',
      action: 'DAILY_NOSHOW_SCAN_EXECUTED',
      target: `Member Base (${members.length})`,
      details: `Scanned ${members.length} members. ${newCasesCount} new risk cases (≥ ${settings.noShowThresholdDays} absent days).`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);

    alert(`✅ No-Show Scan Done! Scanned ${members.length} members. Found ${newCasesCount} new risk cases.`);
  }, [members, noShowCases, settings]);

  // ── HANDLER: Toggle Member Pause ───────────────────
  const handleToggleMemberPause = useCallback((memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const newStatus = m.status === 'paused' ? 'active' : 'paused';
        const updated = { ...m, status: newStatus, pauseReason: newStatus === 'paused' ? 'Owner manual freeze' : null };
        upsertMember(updated);
        return updated;
      }
      return m;
    }));
  }, []);

  // ── HANDLER: Fulfill Add-On ────────────────────────
  const handleFulfillAddOnOrder = useCallback((orderId) => {
    setAddOnOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updated = { ...o, fulfilmentStatus: 'FULFILLED' };
        updateAddonOrder(orderId, { fulfilmentStatus: 'FULFILLED' });
        return updated;
      }
      return o;
    }));
  }, []);

  // ── HANDLER: Log PT Session ────────────────────────
  const handleLogPTSession = useCallback((orderId) => {
    setAddOnOrders(prev => prev.map(o => {
      if (o.id === orderId && o.sessionsUsed < o.sessionsTotal) {
        const newUsed = o.sessionsUsed + 1;
        const updated = { ...o, sessionsUsed: newUsed };
        updateAddonOrder(orderId, { sessionsUsed: newUsed });
        return updated;
      }
      return o;
    }));
  }, []);

  // ── HANDLER: WhatsApp Opt-Out ──────────────────────
  const handleToggleWhatsappOptOut = useCallback((memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const updated = { ...m, optedOutWhatsapp: !m.optedOutWhatsapp };
        upsertMember(updated);
        return updated;
      }
      return m;
    }));
  }, []);

  // ── HANDLER: Staff Management ──────────────────────
  const handleAddStaff = useCallback((newStaff) => {
    setStaffList(prev => [...prev, newStaff]);
    insertStaff(newStaff);
  }, []);

  const handleRemoveStaff = useCallback((staffId) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
    removeStaff(staffId);
  }, []);

  // ── HANDLER: Gym Status (Admin) ────────────────────
  const handleUpdateGymStatus = useCallback((newStatus, blockReason) => {
    setSettings(prev => ({ ...prev, gymStatus: newStatus, blockReason }));
  }, []);

  // ── HANDLER: Seed Demo Data ────────────────────────
  const handleSeedDemoData = useCallback(async () => {
    setMembers(SAMPLE_DEMO_SEED.members);
    setNoShowCases(SAMPLE_DEMO_SEED.noShowCases);
    setAttendanceLogs(SAMPLE_DEMO_SEED.attendanceLogs);
    setPayments(SAMPLE_DEMO_SEED.payments);
    // Upsert to Supabase
    for (const m of SAMPLE_DEMO_SEED.members) await upsertMember(m);
  }, []);

  // ── HANDLER: Owner Profile & Settings Update (by Owner) ──
  const handleUpdateOwnerProfile = useCallback((profileData) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        ownerName: profileData.name !== undefined ? profileData.name : (prev.ownerName || prev.ownerCredentials?.name),
        gymName: profileData.gymName !== undefined ? profileData.gymName : prev.gymName,
        location: profileData.location !== undefined ? profileData.location : prev.location,
        noShowThresholdDays: profileData.noShowThresholdDays !== undefined ? profileData.noShowThresholdDays : prev.noShowThresholdDays,
        whatsappTemplates: profileData.whatsappTemplates ? { ...prev.whatsappTemplates, ...profileData.whatsappTemplates } : prev.whatsappTemplates,
        ownerCredentials: {
          ...prev.ownerCredentials,
          name: profileData.name !== undefined ? profileData.name : (prev.ownerCredentials?.name || prev.ownerName),
          phone: profileData.phone !== undefined ? profileData.phone : prev.ownerCredentials?.phone,
          password: profileData.password !== undefined ? profileData.password : prev.ownerCredentials?.password,
        }
      };
      saveSettings(updated);
      return updated;
    });

    // Update gym in registry & sync to Supabase database
    setGymsList(prev => prev.map(g => {
      const isMatch = (authUser?.gymId && g.id === authUser.gymId) ||
        (authUser?.phone && g.ownerPhone === authUser.phone) ||
        g.id === 'gym-1';
      if (isMatch) {
        const updatedGym = {
          ...g,
          gymName: profileData.gymName !== undefined ? profileData.gymName : g.gymName,
          location: profileData.location !== undefined ? profileData.location : g.location,
          ownerName: profileData.name !== undefined ? profileData.name : g.ownerName,
          ownerPhone: profileData.phone !== undefined ? profileData.phone : g.ownerPhone,
          ownerPassword: profileData.password !== undefined ? profileData.password : g.ownerPassword,
        };
        upsertGym(updatedGym);
        return updatedGym;
      }
      return g;
    }));

    // Update logged in authUser state if owner
    setAuthUser(prev => {
      if (prev?.role === 'owner') {
        const newDisplayName = profileData.name || (profileData.gymName ? `${profileData.gymName} — Owner` : prev.name);
        const updatedAuth = {
          ...prev,
          name: newDisplayName,
          phone: profileData.phone || prev.phone
        };
        ls.set('fitpulse_auth_user', updatedAuth);
        return updatedAuth;
      }
      return prev;
    });

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Gym Owner',
      action: 'OWNER_PROFILE_UPDATED',
      target: 'Owner Account',
      details: profileData.password ? 'Owner updated password securely in database.' : 'Owner updated profile details in database.'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [authUser]);

  // ── HANDLER: 1-Click Toggle Gym Block ──────────────
  const handleToggleGymBlock = useCallback((gymId, newStatus, reason) => {
    setGymsList(prev => prev.map(g => {
      if (g.id === gymId) {
        const updatedGym = {
          ...g,
          status: newStatus,
          blockReason: reason || (newStatus === 'BLOCKED' ? 'Access restricted by Super Admin.' : '')
        };
        upsertGym(updatedGym);
        return updatedGym;
      }
      return g;
    }));

    // If it affects current active gym settings
    setSettings(prev => {
      const targetGym = gymsList.find(g => g.id === gymId);
      if (targetGym && (targetGym.id === 'gym-1' || targetGym.gymName === prev.gymName)) {
        const updated = { ...prev, gymStatus: newStatus, blockReason: reason || 'Access restricted by Super Admin.' };
        saveSettings(updated);
        return updated;
      }
      return prev;
    });

    const targetName = gymsList.find(g => g.id === gymId)?.gymName || gymId;
    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: newStatus === 'BLOCKED' ? 'ADMIN_BLOCKED_GYM' : 'ADMIN_UNBLOCKED_GYM',
      target: targetName,
      details: newStatus === 'BLOCKED' ? `1-Click Block applied. Reason: ${reason || 'Subscription/License Overdue'}` : '1-Click Unblock applied. Access restored.'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [gymsList]);

  // ── HANDLER: Update Gym Details (Super Admin) ──────
  const handleUpdateGym = useCallback((updatedGym) => {
    setGymsList(prev => prev.map(g => g.id === updatedGym.id ? updatedGym : g));
    upsertGym(updatedGym);
    
    // Sync to active settings if matching
    setSettings(prev => {
      if (updatedGym.id === 'gym-1' || updatedGym.gymName === prev.gymName) {
        const updated = {
          ...prev,
          gymName: updatedGym.gymName,
          location: updatedGym.location,
          ownerName: updatedGym.ownerName,
          ownerCredentials: {
            name: updatedGym.ownerName,
            phone: updatedGym.ownerPhone,
            password: updatedGym.ownerPassword,
            tempPassword: updatedGym.tempPassword
          }
        };
        saveSettings(updated);
        return updated;
      }
      return prev;
    });

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_UPDATED_GYM_DETAILS',
      target: updatedGym.gymName,
      details: `Updated credentials for owner ${updatedGym.ownerName} (${updatedGym.ownerPhone}) in database.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, []);

  // ── HANDLER: Onboard New Gym (Super Admin) ─────────
  const handleAddGym = useCallback(async (newGym) => {
    setGymsList(prev => [newGym, ...prev]);
    const res = await upsertGym(newGym);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_ONBOARDED_NEW_GYM',
      target: newGym.gymName,
      details: `Provisioned new gym license for owner ${newGym.ownerName} (${newGym.ownerPhone}) in database.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
    return res;
  }, []);

  // ── HANDLER: Delete Gym (Super Admin) ──────────────
  const handleDeleteGym = useCallback((gymId) => {
    const gymToDelete = gymsList.find(g => g.id === gymId);
    setGymsList(prev => prev.filter(g => g.id !== gymId));
    deleteGymFromDb(gymId);

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_DELETED_GYM',
      target: gymToDelete?.gymName || gymId,
      details: `Deleted gym record from database registry.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, [gymsList]);

  // ── HANDLER: Update Master Passcode ────────────────
  const handleUpdateMasterPasscode = useCallback((newKey) => {
    setSettings(prev => {
      const updated = { ...prev, superAdminKey: newKey };
      saveSettings(updated);
      return updated;
    });
    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_UPDATED_MASTER_PASSCODE',
      target: 'Super Admin Gateway',
      details: 'Super Admin changed their secret master passcode.'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry);
  }, []);

  // ── HANDLER: Reset All Data ────────────────────────
  const handleResetAllData = useCallback(() => {
    setMembers([]);
    setNoShowCases([]);
    setAttendanceLogs([]);
    setPayments([]);
    setAddOnOrders([]);
    setAuditLogs([{
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'DATABASE_RESET',
      target: 'All Tables',
      details: 'Wiped to clean empty state.'
    }]);
  }, []);

  const backendStatusBanner = (
    <>
      {backendStatus === 'local' && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs">
          <span className="text-amber-400 font-semibold">
            Running in offline mode (localStorage). Add VITE_SUPABASE_URL and your publishable key in .env, then restart the app.
          </span>
          <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer"
            className="text-amber-300 underline font-bold hover:text-amber-200">
            Open Supabase →
          </a>
        </div>
      )}
      {backendStatus === 'missing_tables' && (
        <div className="bg-sky-500/10 border-b border-sky-500/30 px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 text-xs">
          <div className="text-sky-300 font-semibold flex-1">
            Connected to Supabase, but tables are missing. Copy the schema SQL, paste it in the SQL Editor, click Run, then refresh this page.
            {connectionMessage ? <span className="block text-sky-400/80 font-normal mt-1">{connectionMessage}</span> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={copySchemaSql}
              className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold hover:bg-sky-400"
            >
              {schemaCopied ? 'SQL copied' : 'Copy schema SQL'}
            </button>
            <a
              href={getSupabaseSqlEditorUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-sky-400/60 text-sky-200 font-bold hover:bg-sky-500/10"
            >
              Open SQL Editor →
            </a>
          </div>
        </div>
      )}
      {backendStatus === 'error' && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2 text-xs text-rose-300 font-semibold">
          Supabase connection failed{connectionMessage ? `: ${connectionMessage}` : '.'} Check your .env keys and restart the Vite server.
        </div>
      )}
      {backendStatus === 'supabase' && isLoadingData && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-400 font-semibold flex items-center gap-2">
          <span className="animate-spin">⟳</span> Syncing data from Supabase...
        </div>
      )}
    </>
  );

  // ── GUARD: Block if gym suspended (non-admins) ─────
  if (!authUser || (settings.gymStatus === 'BLOCKED' && authUser.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-[#0B0F17]">
        <div className="sticky top-0 z-50">
          {backendStatusBanner}
        </div>
        <AuthScreen
          members={members}
          gymsList={gymsList}
          settings={settings}
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
            gymsList={gymsList}
            onToggleGymBlock={handleToggleGymBlock}
            onUpdateGym={handleUpdateGym}
            onAddGym={handleAddGym}
            onDeleteGym={handleDeleteGym}
            onUpdateMasterPasscode={handleUpdateMasterPasscode}
            onSeedDemoData={handleSeedDemoData}
            onResetAllData={handleResetAllData}
            auditLogs={auditLogs}
            membersCount={members.length}
            onClose={() => setSuperAdminOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Render role-specific dashboard ────────────────
  const renderMainView = () => {
    if (activeBottomNav === 'engine') {
      // Engine / Audit view only available to owner
      if (activeRole !== 'owner') return null;
      return (
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
      );
    }

    switch (activeRole) {
      case 'member':
        return (
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
        );

      case 'owner':
        return (
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
            onUpdateOwnerProfile={handleUpdateOwnerProfile}
          />
        );

      case 'frontdesk':
        return (
          <FrontDeskView
            members={members}
            attendanceLogs={attendanceLogs}
            onPerformCheckIn={handlePerformCheckIn}
          />
        );

      case 'admin':
        return (
          <SuperAdminPanel
            settings={settings}
            gymsList={gymsList}
            onToggleGymBlock={handleToggleGymBlock}
            onUpdateGym={handleUpdateGym}
            onAddGym={handleAddGym}
            onDeleteGym={handleDeleteGym}
            onUpdateMasterPasscode={handleUpdateMasterPasscode}
            onSeedDemoData={handleSeedDemoData}
            onResetAllData={handleResetAllData}
            auditLogs={auditLogs}
            membersCount={members.length}
            onClose={null}
          />
        );

      default:
        return <div className="text-slate-400 p-8 text-center">Unknown role. Please logout and try again.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">

      {/* Top Header */}
      <HeaderNavbar
        activeRole={activeRole}
        selectedMemberId={selectedMemberId}
        setSelectedMemberId={setSelectedMemberId}
        members={members}
        openDocsModal={() => setDocsModalOpen(true)}
        alertsCount={noShowCases.filter(c => c.status === 'OPEN').length}
        authUser={authUser}
        onLogout={handleLogout}
        onOpenSuperAdminSecret={() => setSecretAdminModalOpen(true)}
      />

      {backendStatusBanner}

      {/* Main Content — fully responsive, no phone frame mockup */}
      <main className="flex-1 w-full">
        {/* Owner Tab Bar */}
        {activeRole === 'owner' && (
          <div className="px-4 md:px-6 pt-4">
            <div className="max-w-7xl mx-auto flex items-center gap-2 border-b border-slate-800 pb-3 font-bold text-xs overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveBottomNav('app')}
                className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeBottomNav === 'app' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400'
                }`}
              >
                Owner Dashboard
              </button>
              <button
                onClick={() => setActiveBottomNav('engine')}
                className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap ${
                  activeBottomNav === 'engine' ? 'bg-purple-500 text-white font-bold' : 'text-slate-400'
                }`}
              >
                Automations &amp; Audit
              </button>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6 pb-safe">
          {renderMainView()}
        </div>
      </main>

      {/* Modals */}
      {addMemberModalOpen && activeRole === 'owner' && (
        <AddMemberModal
          onClose={() => setAddMemberModalOpen(false)}
          onAddMember={handleAddMember}
        />
      )}

      {superAdminOpen && (
        <SuperAdminPanel
          settings={settings}
          gymsList={gymsList}
          onToggleGymBlock={handleToggleGymBlock}
          onUpdateGym={handleUpdateGym}
          onAddGym={handleAddGym}
          onDeleteGym={handleDeleteGym}
          onUpdateMasterPasscode={handleUpdateMasterPasscode}
          onSeedDemoData={handleSeedDemoData}
          onResetAllData={handleResetAllData}
          auditLogs={auditLogs}
          membersCount={members.length}
          onClose={() => setSuperAdminOpen(false)}
        />
      )}

      {/* Secret Super Admin Verification Modal */}
      <SecretAdminAuthModal
        isOpen={secretAdminModalOpen}
        onClose={() => setSecretAdminModalOpen(false)}
        adminMasterKey={settings.superAdminKey || 'admin999'}
        onAuthenticate={() => {
          handleLogin({
            role: 'admin',
            name: 'Super Admin Controller',
            phone: '9999999999',
            avatar: null
          });
        }}
      />

      {paymentModalData && (
        <PaymentModal
          member={paymentModalData.member}
          plan={paymentModalData.plan}
          onClose={() => setPaymentModalData(null)}
          onSuccessPayment={handleSuccessPayment}
        />
      )}

      {docsModalOpen && (
        <DocumentationModal onClose={() => setDocsModalOpen(false)} />
      )}

      {/* Footer */}
      <footer className="bg-[#141C2B]/50 border-t border-slate-800/80 py-3 px-6 text-center text-xs text-slate-500 flex items-center justify-center gap-4 flex-wrap">
        <span>FitPulse Gym Retention OS · {settings.gymName} · {settings.location}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          backendStatus === 'supabase' ? 'bg-emerald-500/20 text-emerald-400'
            : backendStatus === 'missing_tables' ? 'bg-sky-500/20 text-sky-300'
            : backendStatus === 'error' ? 'bg-rose-500/20 text-rose-300'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {backendStatus === 'supabase' ? 'Supabase Cloud'
            : backendStatus === 'missing_tables' ? 'Supabase — create tables'
            : backendStatus === 'error' ? 'Supabase error'
            : 'Offline Mode'}
        </span>
      </footer>
    </div>
  );
}
