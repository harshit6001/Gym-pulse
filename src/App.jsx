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
import SecretAdminAuthModal from './components/SecretAdminAuthModal';

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
  PLANS,
  ADD_ONS
} from './data/mockData';

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
  fetchMasterKey,
  saveMasterKey,
  generateUUID,
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
        item?.id === 'gym-1' || item?.id === 'gym-2' || item?.id === 'gym-3' ||
        item?.id === 'staff-1' || item?.ownerName === 'Vikram Malhotra' ||
        item?.ownerPhone === '9876543210' || item?.phone === '9876511001' ||
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
  const [staffList, setStaffList] = useState(() => getCleanState('fitpulse_staff', INITIAL_STAFF));
  const [gymsList, setGymsList] = useState(() => getCleanState('fitpulse_gyms_registry', INITIAL_GYMS));
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    if (s?.ownerCredentials?.password === 'owner123' || s?.ownerCredentials?.phone === '9876543210') {
      s.ownerCredentials = null;
      s.superAdminKey = s.superAdminKey === 'admin999' ? 'Admin@2026Master#' : s.superAdminKey;
      saveSettings(s);
    }
    return s;
  });

  // For member view — which member is selected
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

  // ── Load from Supabase on mount / auth change ────────
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
        const currentGymId = authUser?.gymId || null;
        const [mbs, atts, pays, nsc, stf, audits, addons, gyms, cloudMasterKey] = await Promise.all([
          fetchMembers(currentGymId),
          fetchAttendance(currentGymId),
          fetchPayments(currentGymId),
          fetchNoShowCases(currentGymId),
          fetchStaff(currentGymId),
          fetchAuditLogs(currentGymId),
          fetchAddonOrders(currentGymId),
          fetchGyms(),
          fetchMasterKey()
        ]);
        if (cancelled) return;
        setMembers(mbs || []);
        setAttendanceLogs(atts || []);
        setPayments(pays || []);
        setNoShowCases(nsc || []);
        setStaffList(stf || []);
        setAuditLogs(audits || []);
        setAddOnOrders(addons || []);
        setGymsList(gyms || []);
        if (cloudMasterKey) {
          setSettings(prev => ({ ...prev, superAdminKey: cloudMasterKey }));
        }
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
  }, [authUser?.gymId]);

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
          ownerPhone: gymObj.ownerPhone || prev.ownerPhone,
          ownerCredentials: {
            name: gymObj.ownerName || prev.ownerName,
            phone: gymObj.ownerPhone,
            password: gymObj.ownerPassword
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
    if (window.location.hash.includes('admin')) {
      try {
        history.replaceState(null, '', window.location.pathname);
      } catch (_) {}
    }
  }, []);

  // ── Computed Active Member ─────────────────────────
  const activeMember = (() => {
    if (activeRole === 'member') {
      if (authUser?.memberId) {
        return members.find(m => m.id === authUser.memberId) || members.find(m => m.id === selectedMemberId) || members[0];
      }
      return members.find(m => m.id === selectedMemberId) || members[0];
    }
    return members[0];
  })();

  // ── HANDLER: Perform Check-in ──────────────────────
  const handlePerformCheckIn = useCallback((memberId, method, reason = '') => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return { status: 'ERROR', message: 'Member not found.' };

    const todayStr = todayISO();
    const timeNowStr = nowStr();

    // Duplicate scan check (same day)
    const existingLog = attendanceLogs.find(a =>
      a.memberId === memberId &&
      (a.timestamp?.startsWith?.(todayStr) || (a.timestamp && new Date(a.timestamp).toISOString().startsWith(todayStr)))
    );
    if (existingLog && method === 'QR_SELF') {
      return {
        status: 'DUPLICATE_SCAN',
        message: `Duplicate check-in blocked! You already checked in today at ${existingLog.timestamp?.split('T')?.[1]?.slice(0, 5) || 'earlier'}.`
      };
    }

    // Paused membership check
    if (targetMember.status === 'paused') {
      return {
        status: 'PAUSED_MEMBERSHIP',
        message: `Check-in blocked! Membership for ${targetMember.name} is currently paused.`
      };
    }

    const currentGymId = targetMember.gymId || authUser?.gymId || null;
    const newLog = {
      id: generateUUID(),
      gymId: currentGymId,
      memberId,
      memberName: targetMember.name,
      timestamp: new Date().toISOString(),
      method,
      reason,
      status: 'SUCCESS',
      device: method === 'QR_SELF' ? 'Member Mobile App' : 'Front-Desk'
    };

    setAttendanceLogs(prev => [newLog, ...prev]);
    insertAttendanceLog(newLog, currentGymId);

    // Update streak
    const newStreak = (targetMember.streak?.current || 0) + 1;
    const updatedMember = {
      ...targetMember,
      streak: { ...targetMember.streak, current: newStreak, max: Math.max(targetMember.streak?.max || 0, newStreak) },
      lastCheckIn: new Date().toISOString(),
      absentDaysCount: 0
    };
    setMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
    upsertMember(updatedMember, currentGymId);

    // Auto-resolve no-show case
    const updatedCases = noShowCases.map(c => {
      if (c.memberId === memberId && (c.status === 'OPEN' || c.status === 'IN_PROGRESS')) {
        const resolved = { ...c, status: 'RESOLVED_RETURNED', resolvedAt: new Date().toISOString() };
        upsertNoShowCase(resolved, currentGymId);
        return resolved;
      }
      return c;
    });
    setNoShowCases(updatedCases);

    // Audit log
    const auditEntry = {
      id: generateUUID(),
      gymId: currentGymId,
      timestamp: new Date().toISOString(),
      actor: method === 'QR_SELF' ? `${targetMember.name} (Member)` : `${authUser?.name || 'Staff'} (Staff)`,
      action: method === 'QR_SELF' ? 'QR_SELF_CHECKIN' : 'ASSISTED_CHECKIN',
      target: `${targetMember.name}`,
      details: reason ? `Reason: ${reason}` : 'Verified Gate QR Scan'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, currentGymId);

    return {
      status: 'SUCCESS',
      message: `✅ Welcome ${targetMember.name}! Check-in verified. Streak: ${newStreak} days 🔥`
    };
  }, [members, attendanceLogs, noShowCases, authUser]);

  // ── HANDLER: Payment Success ───────────────────────
  const handleSuccessPayment = useCallback((paymentData) => {
    const { memberId, planId, amount, provider, transactionRef, idempotencyKey } = paymentData;

    if (payments.find(p => p.idempotencyKey === idempotencyKey)) {
      console.warn('Duplicate payment callback blocked:', idempotencyKey);
      return;
    }

    const targetPlan = PLANS.find(p => p.id === planId) || PLANS[0];
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    const currentEnd = targetMember.membership?.endDate || todayISO();
    const baseDate = new Date(currentEnd) < new Date() ? todayISO() : currentEnd;
    const newEnd = addMonthsToDateStr(baseDate, targetPlan.durationMonths);

    const currentGymId = targetMember.gymId || authUser?.gymId || null;
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
    upsertMember(updatedMember, currentGymId);

    const newPayment = {
      id: generateUUID(),
      gymId: currentGymId,
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
    insertPayment(newPayment, currentGymId);

    const auditEntry = {
      id: generateUUID(),
      gymId: currentGymId,
      timestamp: new Date().toISOString(),
      actor: `${targetMember.name} (Member)`,
      action: 'PAYMENT_SUCCESS',
      target: `${targetPlan.name} (₹${amount})`,
      details: `Paid via ${provider} | Ref: ${transactionRef}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, currentGymId);
  }, [members, payments, authUser]);

  // ── HANDLER: Add New Member ────────────────────────
  const handleAddMember = useCallback(async (newMemberData, plan, paymentMode) => {
    const currentGymId = authUser?.gymId || null;
    const memberWithGym = { ...newMemberData, gymId: currentGymId };

    setMembers(prev => [memberWithGym, ...prev]);
    await upsertMember(memberWithGym, currentGymId);

    const newPayment = {
      id: generateUUID(),
      gymId: currentGymId,
      orderId: `ord-${Math.floor(100 + Math.random() * 900)}`,
      memberId: memberWithGym.id,
      memberName: memberWithGym.name,
      planId: plan.id,
      planName: plan.name,
      amount: plan.finalPrice,
      provider: paymentMode,
      status: 'PAID',
      transactionRef: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      idempotencyKey: `ik_reg_${memberWithGym.id}`
    };
    setPayments(prev => [newPayment, ...prev]);
    insertPayment(newPayment, currentGymId);

    const auditEntry = {
      id: generateUUID(),
      gymId: currentGymId,
      timestamp: new Date().toISOString(),
      actor: `${authUser?.name || 'Owner'} (Manager)`,
      action: 'NEW_MEMBER_REGISTERED',
      target: `${memberWithGym.name} (${memberWithGym.phone})`,
      details: `Plan: ${plan.name} | Amount: ₹${plan.finalPrice} | Expiry: ${memberWithGym.membership.endDate}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, currentGymId);
  }, [authUser]);

  // ── HANDLER: Buy Add-On ────────────────────────────
  const handleBuyAddOn = useCallback((memberId, addOn) => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    const currentGymId = targetMember.gymId || authUser?.gymId || null;
    const newOrder = {
      id: generateUUID(),
      gymId: currentGymId,
      memberId,
      memberName: targetMember.name,
      addonId: addOn.id,
      addonName: addOn.name,
      price: addOn.price,
      status: 'PAID',
      fulfilmentStatus: addOn.category === 'Personal Training' ? 'ACTIVE' : 'PENDING_FULFILMENT',
      sessionsTotal: addOn.category === 'Personal Training' ? 10 : null,
      sessionsUsed: addOn.category === 'Personal Training' ? 0 : null,
      orderDate: todayISO()
    };

    setAddOnOrders(prev => [newOrder, ...prev]);
    insertAddonOrder(newOrder, currentGymId);

    const auditEntry = {
      id: generateUUID(),
      gymId: currentGymId,
      timestamp: new Date().toISOString(),
      actor: `${targetMember.name} (Member)`,
      action: 'ADDON_PURCHASED',
      target: addOn.name,
      details: `Purchased ₹${addOn.price} | Category: ${addOn.category}`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, currentGymId);
  }, [members, authUser]);

  // ── HANDLER: Fulfill Add-On Order ──────────────────
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
      if (o.id === orderId) {
        const nextUsed = (o.sessionsUsed || 0) + 1;
        const isComplete = nextUsed >= (o.sessionsTotal || 10);
        const updated = {
          ...o,
          sessionsUsed: nextUsed,
          fulfilmentStatus: isComplete ? 'COMPLETED' : 'ACTIVE'
        };
        updateAddonOrder(orderId, {
          sessionsUsed: nextUsed,
          fulfilmentStatus: isComplete ? 'COMPLETED' : 'ACTIVE'
        });
        return updated;
      }
      return o;
    }));
  }, []);

  // ── HANDLER: Update No-Show Case Outcome ───────────
  const handleUpdateNoShowOutcome = useCallback((caseId, outcomeData) => {
    const currentGymId = authUser?.gymId || null;
    setNoShowCases(prev => prev.map(c => {
      if (c.id === caseId) {
        const updated = {
          ...c,
          status: outcomeData.newStatus,
          lastFollowUp: new Date().toISOString(),
          outcomeHistory: [
            {
              timestamp: nowStr(),
              outcome: outcomeData.outcome,
              note: outcomeData.note,
              nextActionDate: outcomeData.nextActionDate || 'None'
            },
            ...(c.outcomeHistory || [])
          ]
        };
        upsertNoShowCase(updated, currentGymId);
        return updated;
      }
      return c;
    }));
  }, [authUser]);

  // ── HANDLER: Pause / Resume Member ─────────────────
  const handleToggleMemberPause = useCallback((memberId, reason = '') => {
    const targetMember = members.find(m => m.id === memberId);
    if (!targetMember) return;

    const isPausing = targetMember.status === 'active';
    const newStatus = isPausing ? 'paused' : 'active';
    const currentGymId = targetMember.gymId || authUser?.gymId || null;

    const updatedMember = {
      ...targetMember,
      status: newStatus,
      pauseReason: isPausing ? (reason || 'Medical / Travel pause') : null
    };

    setMembers(prev => prev.map(m => m.id === memberId ? updatedMember : m));
    upsertMember(updatedMember, currentGymId);

    const auditEntry = {
      id: generateUUID(),
      gymId: currentGymId,
      timestamp: new Date().toISOString(),
      actor: `${authUser?.name || 'Owner'} (Manager)`,
      action: isPausing ? 'MEMBER_PAUSED' : 'MEMBER_RESUMED',
      target: `${targetMember.name} (${memberId})`,
      details: isPausing ? `Pause reason: ${reason}` : 'Resumed active status'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, currentGymId);
  }, [members, authUser]);

  // ── HANDLER: Toggle WhatsApp Opt-Out ───────────────
  const handleToggleWhatsappOptOut = useCallback((memberId) => {
    setMembers(prev => prev.map(m => {
      if (m.id === memberId) {
        const updated = { ...m, optedOutWhatsapp: !m.optedOutWhatsapp };
        upsertMember(updated, m.gymId || authUser?.gymId || null);
        return updated;
      }
      return m;
    }));
  }, [authUser]);

  // ── HANDLER: Staff Management ──────────────────────
  const handleAddStaff = useCallback((newStaff) => {
    const currentGymId = authUser?.gymId || null;
    const staffWithGym = { ...newStaff, gymId: currentGymId };
    setStaffList(prev => [...prev, staffWithGym]);
    insertStaff(staffWithGym, currentGymId);
  }, [authUser]);

  const handleRemoveStaff = useCallback((staffId) => {
    setStaffList(prev => prev.filter(s => s.id !== staffId));
    removeStaff(staffId);
  }, []);

  // ── HANDLER: Owner Profile & Settings Update ───────
  const handleUpdateOwnerProfile = useCallback((profileData) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        ownerName: profileData.name !== undefined ? profileData.name : prev.ownerName,
        gymName: profileData.gymName !== undefined ? profileData.gymName : prev.gymName,
        location: profileData.location !== undefined ? profileData.location : prev.location,
        noShowThresholdDays: profileData.noShowThresholdDays !== undefined ? profileData.noShowThresholdDays : prev.noShowThresholdDays,
        whatsappTemplates: profileData.whatsappTemplates ? { ...prev.whatsappTemplates, ...profileData.whatsappTemplates } : prev.whatsappTemplates,
        ownerCredentials: {
          ...prev.ownerCredentials,
          name: profileData.name !== undefined ? profileData.name : prev.ownerName,
          phone: profileData.phone !== undefined ? profileData.phone : prev.ownerCredentials?.phone,
          password: profileData.password !== undefined ? profileData.password : prev.ownerCredentials?.password,
        }
      };
      saveSettings(updated);
      return updated;
    });

    if (authUser?.gymId) {
      setGymsList(prev => prev.map(g => {
        if (g.id === authUser.gymId) {
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
    }

    const auditEntry = {
      id: generateUUID(),
      gymId: authUser?.gymId || null,
      timestamp: new Date().toISOString(),
      actor: 'Gym Owner',
      action: 'OWNER_PROFILE_UPDATED',
      target: 'Owner Account',
      details: profileData.password ? 'Owner updated password securely in live database.' : 'Owner updated profile details in database.'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, authUser?.gymId || null);
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

    setSettings(prev => {
      const targetGym = gymsList.find(g => g.id === gymId);
      if (targetGym && targetGym.gymName === prev.gymName) {
        const updated = { ...prev, gymStatus: newStatus, blockReason: reason || 'Access restricted by Super Admin.' };
        saveSettings(updated);
        return updated;
      }
      return prev;
    });

    const targetName = gymsList.find(g => g.id === gymId)?.gymName || gymId;
    const auditEntry = {
      id: generateUUID(),
      gymId,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: newStatus === 'BLOCKED' ? 'ADMIN_BLOCKED_GYM' : 'ADMIN_UNBLOCKED_GYM',
      target: targetName,
      details: newStatus === 'BLOCKED' ? `1-Click Block applied. Reason: ${reason || 'Subscription/License Overdue'}` : '1-Click Unblock applied. Access restored.'
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, gymId);
  }, [gymsList]);

  // ── HANDLER: Update Gym Details (Super Admin) ──────
  const handleUpdateGym = useCallback((updatedGym) => {
    setGymsList(prev => prev.map(g => g.id === updatedGym.id ? updatedGym : g));
    upsertGym(updatedGym);

    const auditEntry = {
      id: generateUUID(),
      gymId: updatedGym.id,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_UPDATED_GYM_DETAILS',
      target: updatedGym.gymName,
      details: `Updated credentials for owner ${updatedGym.ownerName} (${updatedGym.ownerPhone}) in database.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, updatedGym.id);
  }, []);

  // ── HANDLER: Onboard New Gym (Super Admin) ─────────
  const handleAddGym = useCallback(async (newGym) => {
    setGymsList(prev => [newGym, ...prev]);
    const res = await upsertGym(newGym);

    const auditEntry = {
      id: generateUUID(),
      gymId: newGym.id,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_ONBOARDED_NEW_GYM',
      target: newGym.gymName,
      details: `Provisioned new gym license for owner ${newGym.ownerName} (${newGym.ownerPhone}) in live database.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, newGym.id);
    return res;
  }, []);

  // ── HANDLER: Delete Gym (Super Admin) ──────────────
  const handleDeleteGym = useCallback((gymId) => {
    const gymToDelete = gymsList.find(g => g.id === gymId);
    setGymsList(prev => prev.filter(g => g.id !== gymId));
    deleteGymFromDb(gymId);

    const auditEntry = {
      id: generateUUID(),
      gymId,
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_DELETED_GYM',
      target: gymToDelete?.gymName || gymId,
      details: `Deleted gym record from database registry.`
    };
    setAuditLogs(prev => [auditEntry, ...prev]);
    insertAuditLog(auditEntry, gymId);
  }, [gymsList]);

  // ── HANDLER: Update Master Passcode ────────────────
  const handleUpdateMasterPasscode = useCallback((newKey) => {
    setSettings(prev => {
      const updated = { ...prev, superAdminKey: newKey };
      saveSettings(updated);
      return updated;
    });
    saveMasterKey(newKey);

    const auditEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'ADMIN_UPDATED_MASTER_PASSCODE',
      target: 'Super Admin Gateway',
      details: 'Super Admin updated master passcode in live database.'
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
    const resetEntry = {
      id: generateUUID(),
      timestamp: new Date().toISOString(),
      actor: 'Super Admin',
      action: 'DATABASE_RESET',
      target: 'All Tables',
      details: 'Clean production empty state restored.'
    };
    setAuditLogs([resetEntry]);
    insertAuditLog(resetEntry);
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
          <span className="animate-spin">⟳</span> Syncing live data from Supabase...
        </div>
      )}
    </>
  );

  // ── GUARD: Block if unauthenticated or gym suspended (non-admins) ─────
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
          onRunDailyScan={() => {}}
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
            onRunDailyScan={() => {}}
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

      {/* Main Content */}
      <main className="flex-1 w-full">
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
        adminMasterKey={settings.superAdminKey || 'Admin@2026Master#'}
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
        <span>Gym Pulse by harshit{authUser ? ` · ${settings.gymName} · ${settings.location}` : ''}</span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
          backendStatus === 'supabase' ? 'bg-emerald-500/20 text-emerald-400'
            : backendStatus === 'missing_tables' ? 'bg-sky-500/20 text-sky-300'
            : backendStatus === 'error' ? 'bg-rose-500/20 text-rose-300'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {backendStatus === 'supabase' ? 'Supabase Cloud (Live)'
            : backendStatus === 'missing_tables' ? 'Supabase — create tables'
            : backendStatus === 'error' ? 'Supabase error'
            : 'Offline Mode'}
        </span>
      </footer>
    </div>
  );
}
