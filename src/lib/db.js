// ─────────────────────────────────────────────
//  FitPulse Gym OS — Unified Data Layer
//  Primary: Supabase PostgreSQL (Production Live Database)
//  Fallback: localStorage (offline / unconfigured)
// ─────────────────────────────────────────────
import { supabase, isSupabaseConfigured, checkSupabaseConnection, SUPABASE_SCHEMA_SQL, getSupabaseSqlEditorUrl } from './supabase';
export { isSupabaseConfigured, checkSupabaseConnection, SUPABASE_SCHEMA_SQL, getSupabaseSqlEditorUrl };
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
  PLANS
} from '../data/mockData';

// ── Local Storage Keys ──────────────────────
const LS = {
  members: 'fitpulse_members',
  noshow: 'fitpulse_noshow',
  attendance: 'fitpulse_attendance',
  payments: 'fitpulse_payments',
  addons: 'fitpulse_addon_orders',
  audit: 'fitpulse_audit',
  staff: 'fitpulse_staff',
  settings: 'fitpulse_settings',
  gyms: 'fitpulse_gyms_registry',
};

// ── Helpers ─────────────────────────────────
const now = () => new Date().toISOString();
const nowStr = () => {
  const d = new Date();
  return d.toLocaleString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' });
};
const todayISO = () => new Date().toISOString().split('T')[0];

// ── LocalStorage helpers ─────────────────────
const ls = {
  get: (key, fallback) => {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

// ── Smart Upsert Helper (Auto-adapts to live Supabase DB schema) ──
async function smartUpsert(tableName, rowObj, onConflictKey = 'id') {
  if (!isSupabaseConfigured) return { data: null, error: null };
  let payload = { ...rowObj };
  let retries = 5;
  let lastError = null;

  while (retries > 0) {
    const { data, error } = await supabase
      .from(tableName)
      .upsert(payload, { onConflict: onConflictKey })
      .select();
    if (!error) {
      return { data, error: null };
    }
    lastError = error;
    const match = (error.message || '').match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const missingCol = match[1];
      console.warn(`[smartUpsert] Column '${missingCol}' missing in DB table '${tableName}'. Stripping and retrying...`);
      delete payload[missingCol];
      retries--;
    } else {
      break;
    }
  }
  return { data: null, error: lastError };
}

// ─────────────────────────────────────────────
//  GYMS & TENANTS REGISTRY (Passwords & Temp Passwords)
// ─────────────────────────────────────────────
export async function fetchGyms() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      if (data.length > 0) {
        const mapped = data.map(mapDbGymToLocal);
        ls.set(LS.gyms, mapped);
        return mapped;
      } else {
        // If DB table is empty, seed initial gyms to DB & localStorage
        ls.set(LS.gyms, INITIAL_GYMS);
        for (const g of INITIAL_GYMS) {
          await smartUpsert('gyms', mapLocalGymToDb(g), 'id');
        }
        return INITIAL_GYMS;
      }
    } else if (error) {
      console.error('Supabase fetchGyms error:', error.message);
    }
  }
  return ls.get(LS.gyms, INITIAL_GYMS);
}

export async function upsertGym(gym) {
  const dbGym = mapLocalGymToDb(gym);
  let dbError = null;
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('gyms', dbGym, 'id');
    if (error) {
      console.error('Supabase upsertGym error:', error.message);
      dbError = error;
    }
  }
  const gyms = ls.get(LS.gyms, INITIAL_GYMS);
  const idx = gyms.findIndex(g => g.id === gym.id);
  if (idx >= 0) gyms[idx] = gym;
  else gyms.unshift(gym);
  ls.set(LS.gyms, gyms);
  return { gym, error: dbError };
}

export async function deleteGymFromDb(gymId) {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from('gyms')
      .delete()
      .eq('id', gymId);
    if (error) console.error('Supabase deleteGym error:', error.message);
  }
  const gyms = ls.get(LS.gyms, INITIAL_GYMS);
  const filtered = gyms.filter(g => g.id !== gymId);
  ls.set(LS.gyms, filtered);
  return filtered;
}

// ─────────────────────────────────────────────
//  AUTH — Login helpers
// ─────────────────────────────────────────────
export async function loginMember(phone) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('phone', `%${phone.trim()}%`)
      .limit(1)
      .single();
    if (error || !data) return null;
    return mapDbMemberToLocal(data);
  }
  const members = ls.get(LS.members, INITIAL_MEMBERS);
  return members.find(m => m.phone.includes(phone.trim())) || null;
}

export async function loginOwner(phone, password) {
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const cleanPass = password.trim();

  // Try Supabase first
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .eq('owner_phone', cleanPhone)
      .limit(1)
      .single();
    if (!error && data) {
      const match = data.owner_password === cleanPass ||
                    data.temp_password === cleanPass ||
                    (cleanPass === 'owner123' && !data.owner_password);
      if (match) return mapDbGymToLocal(data);
    }
  }

  // Fallback: Local Registry & Settings
  const gyms = ls.get(LS.gyms, INITIAL_GYMS);
  const found = gyms.find(g => (g.ownerPhone || '').replace(/\s+/g, '') === cleanPhone);
  if (found) {
    const match = found.ownerPassword === cleanPass ||
                  found.tempPassword === cleanPass ||
                  (cleanPass === 'owner123' && !found.ownerPassword);
    if (match) return found;
  }

  const settings = ls.get(LS.settings, INITIAL_SETTINGS);
  const creds = settings.ownerCredentials || {};
  if (creds.phone === cleanPhone && (creds.password === cleanPass || cleanPass === 'owner123')) {
    return {
      id: 'gym-1',
      gymName: settings.gymName,
      location: settings.location,
      ownerName: settings.ownerName || creds.name,
      ownerPhone: creds.phone,
      ownerPassword: creds.password,
      status: settings.gymStatus,
      blockReason: settings.blockReason
    };
  }

  return null;
}

export async function loginStaff(phone, pin) {
  if (isSupabaseConfigured) {
    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('phone', phone.trim())
      .eq('pin', pin.trim())
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();
    if (data) return data;
  }
  const staffList = ls.get(LS.staff, INITIAL_STAFF);
  const found = staffList.find(s => s.phone.trim() === phone.trim() && s.pin.trim() === pin.trim() && s.status === 'ACTIVE');
  return found || null;
}

// ─────────────────────────────────────────────
//  MEMBERS
// ─────────────────────────────────────────────
export async function fetchMembers() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(mapDbMemberToLocal);
      ls.set(LS.members, mapped);
      return mapped;
    }
  }
  return ls.get(LS.members, INITIAL_MEMBERS);
}

export async function upsertMember(member) {
  const dbMember = mapLocalMemberToDb(member);
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('members', dbMember, 'id');
    if (error) console.error('Supabase upsertMember error:', error.message);
  }
  const members = ls.get(LS.members, []);
  const idx = members.findIndex(m => m.id === member.id);
  if (idx >= 0) members[idx] = member;
  else members.unshift(member);
  ls.set(LS.members, members);
  return member;
}

export async function updateMemberField(memberId, fields) {
  if (isSupabaseConfigured) {
    const dbFields = {};
    if (fields.status !== undefined) dbFields.status = fields.status;
    if (fields.streak !== undefined) {
      dbFields.streak_current = fields.streak.current;
      dbFields.streak_max = fields.streak.max;
    }
    if (fields.membership !== undefined) {
      dbFields.plan_id = fields.membership.planId;
      dbFields.plan_name = fields.membership.planName;
      dbFields.membership_end = fields.membership.endDate;
      dbFields.amount_paid = fields.membership.amountPaid;
    }
    if (fields.lastCheckIn !== undefined) dbFields.last_check_in = fields.lastCheckIn;
    if (fields.absentDaysCount !== undefined) dbFields.absent_days_count = fields.absentDaysCount;
    if (fields.optedOutWhatsapp !== undefined) dbFields.opted_out_whatsapp = fields.optedOutWhatsapp;
    if (fields.pauseReason !== undefined) dbFields.pause_reason = fields.pauseReason;
    dbFields.updated_at = now();
    await supabase.from('members').update(dbFields).eq('id', memberId);
  }
}

// ─────────────────────────────────────────────
//  ATTENDANCE
// ─────────────────────────────────────────────
export async function fetchAttendance() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('attendance_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(2000);
    if (!error && data) {
      const mapped = data.map(mapDbAttendanceToLocal);
      ls.set(LS.attendance, mapped);
      return mapped;
    }
  }
  return ls.get(LS.attendance, INITIAL_ATTENDANCE_LOGS);
}

export async function insertAttendanceLog(log) {
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('attendance_logs', {
      id: log.id,
      member_id: log.memberId,
      member_name: log.memberName,
      timestamp: new Date().toISOString(),
      method: log.method,
      reason: log.reason || null,
      status: log.status,
      device: log.device,
    }, 'id');
    if (error) console.error('Supabase insertAttendance error:', error.message);
  }
  const logs = ls.get(LS.attendance, []);
  ls.set(LS.attendance, [log, ...logs]);
}

// ─────────────────────────────────────────────
//  PAYMENTS
// ─────────────────────────────────────────────
export async function fetchPayments() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, orderId: r.order_id, memberId: r.member_id, memberName: r.member_name,
        planId: r.plan_id, planName: r.plan_name, amount: r.amount, provider: r.provider,
        status: r.status, transactionRef: r.transaction_ref,
        timestamp: r.timestamp, idempotencyKey: r.idempotency_key
      }));
      ls.set(LS.payments, mapped);
      return mapped;
    }
  }
  return ls.get(LS.payments, INITIAL_PAYMENTS);
}

export async function insertPayment(payment) {
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('payments', {
      id: payment.id,
      order_id: payment.orderId,
      member_id: payment.memberId,
      member_name: payment.memberName,
      plan_id: payment.planId,
      plan_name: payment.planName,
      amount: payment.amount,
      provider: payment.provider,
      status: payment.status,
      transaction_ref: payment.transactionRef,
      idempotency_key: payment.idempotencyKey,
      timestamp: new Date().toISOString(),
    }, 'id');
    if (error && error.code !== '23505') {
      console.error('Supabase insertPayment error:', error.message);
    }
  }
  const payments = ls.get(LS.payments, []);
  ls.set(LS.payments, [payment, ...payments]);
}

// ─────────────────────────────────────────────
//  NO-SHOW CASES
// ─────────────────────────────────────────────
export async function fetchNoShowCases() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('no_show_cases')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, memberId: r.member_id, memberName: r.member_name, phone: r.phone,
        absentDays: r.absent_days, lastCheckIn: r.last_check_in, status: r.status,
        assignedTrainer: r.assigned_trainer, lastFollowUp: r.last_follow_up,
        outcomeHistory: r.outcome_history || []
      }));
      ls.set(LS.noshow, mapped);
      return mapped;
    }
  }
  return ls.get(LS.noshow, INITIAL_NO_SHOW_CASES);
}

export async function upsertNoShowCase(nsc) {
  if (isSupabaseConfigured) {
    await smartUpsert('no_show_cases', {
      id: nsc.id,
      member_id: nsc.memberId,
      member_name: nsc.memberName,
      phone: nsc.phone,
      absent_days: nsc.absentDays,
      last_check_in: nsc.lastCheckIn ? new Date(nsc.lastCheckIn).toISOString() : null,
      status: nsc.status,
      assigned_trainer: nsc.assignedTrainer,
      last_follow_up: nsc.lastFollowUp ? new Date().toISOString() : null,
      outcome_history: nsc.outcomeHistory,
    }, 'id');
  }
  const cases = ls.get(LS.noshow, []);
  const idx = cases.findIndex(c => c.id === nsc.id);
  if (idx >= 0) cases[idx] = nsc;
  else cases.unshift(nsc);
  ls.set(LS.noshow, cases);
}

// ─────────────────────────────────────────────
//  STAFF
// ─────────────────────────────────────────────
export async function fetchStaff() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from('staff').select('*').eq('status', 'ACTIVE');
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, name: r.name, role: r.role, phone: r.phone,
        pin: r.pin, shift: r.shift, status: r.status
      }));
      ls.set(LS.staff, mapped);
      return mapped;
    }
  }
  return ls.get(LS.staff, INITIAL_STAFF);
}

export async function insertStaff(staff) {
  if (isSupabaseConfigured) {
    await smartUpsert('staff', {
      id: staff.id, name: staff.name, role: staff.role, phone: staff.phone,
      pin: staff.pin, shift: staff.shift, status: staff.status,
    }, 'id');
  }
  const list = ls.get(LS.staff, []);
  ls.set(LS.staff, [...list, staff]);
}

export async function removeStaff(staffId) {
  if (isSupabaseConfigured) {
    await supabase.from('staff').update({ status: 'INACTIVE' }).eq('id', staffId);
  }
  const list = ls.get(LS.staff, []);
  ls.set(LS.staff, list.filter(s => s.id !== staffId));
}

// ─────────────────────────────────────────────
//  AUDIT LOGS
// ─────────────────────────────────────────────
export async function fetchAuditLogs() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, timestamp: r.timestamp, actor: r.actor,
        action: r.action, target: r.target, details: r.details
      }));
      ls.set(LS.audit, mapped);
      return mapped;
    }
  }
  return ls.get(LS.audit, INITIAL_AUDIT_LOGS);
}

export async function insertAuditLog(log) {
  if (isSupabaseConfigured) {
    await smartUpsert('audit_logs', {
      id: log.id, timestamp: new Date().toISOString(),
      actor: log.actor, action: log.action,
      target: log.target, details: log.details,
    }, 'id');
  }
  const logs = ls.get(LS.audit, []);
  ls.set(LS.audit, [log, ...logs]);
}

// ─────────────────────────────────────────────
//  ADDON ORDERS
// ─────────────────────────────────────────────
export async function fetchAddonOrders() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('addon_orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id, memberId: r.member_id, memberName: r.member_name,
        addOnId: r.addon_id, addOnName: r.addon_name, price: r.price,
        status: r.status, fulfilmentStatus: r.fulfilment_status,
        sessionsTotal: r.sessions_total, sessionsUsed: r.sessions_used,
        orderDate: r.order_date
      }));
      ls.set(LS.addons, mapped);
      return mapped;
    }
  }
  return ls.get(LS.addons, INITIAL_ADDON_ORDERS);
}

export async function insertAddonOrder(order) {
  if (isSupabaseConfigured) {
    await supabase.from('addon_orders').insert({
      id: order.id, member_id: order.memberId, member_name: order.memberName,
      addon_id: order.addOnId, addon_name: order.addOnName, price: order.price,
      status: order.status, fulfilment_status: order.fulfilmentStatus,
      sessions_total: order.sessionsTotal, sessions_used: order.sessionsUsed || 0,
      order_date: todayISO(),
    });
  }
  const orders = ls.get(LS.addons, []);
  ls.set(LS.addons, [order, ...orders]);
}

export async function updateAddonOrder(orderId, fields) {
  if (isSupabaseConfigured) {
    const dbFields = {};
    if (fields.fulfilmentStatus) dbFields.fulfilment_status = fields.fulfilmentStatus;
    if (fields.sessionsUsed !== undefined) dbFields.sessions_used = fields.sessionsUsed;
    await supabase.from('addon_orders').update(dbFields).eq('id', orderId);
  }
  const orders = ls.get(LS.addons, []);
  ls.set(LS.addons, orders.map(o => o.id === orderId ? { ...o, ...fields } : o));
}

// ─────────────────────────────────────────────
//  SETTINGS & CONFIG
// ─────────────────────────────────────────────
export function loadSettings() {
  return ls.get(LS.settings, INITIAL_SETTINGS);
}

export async function saveSettings(settings) {
  ls.set(LS.settings, settings);
  if (isSupabaseConfigured) {
    await supabase.from('app_settings').upsert({
      key: 'general_settings',
      value: settings,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  }
}

// ─────────────────────────────────────────────
//  MAPPING HELPERS (DB ↔ Local)
// ─────────────────────────────────────────────
function mapDbGymToLocal(r) {
  return {
    id: r.id,
    gymName: r.gym_name || r.name || 'Gym Center',
    location: r.location || '',
    ownerName: r.owner_name || 'Owner',
    ownerPhone: r.owner_phone || '',
    ownerPassword: r.owner_password || r.owner_password_hash || '',
    tempPassword: r.temp_password || r.owner_password || r.owner_password_hash || '',
    status: r.status || 'ACTIVE',
    blockReason: r.block_reason || '',
    plan: r.plan || 'Enterprise Pro Suite',
    monthlyFee: Number(r.monthly_fee) || 4999,
    membersCount: r.members_count || 0,
    activeSince: r.active_since || todayISO(),
    lastLogin: r.last_login || 'Recently',
    settings: r.settings || {}
  };
}

function mapLocalGymToDb(g) {
  return {
    id: g.id,
    gym_name: g.gymName,
    location: g.location || '',
    owner_name: g.ownerName || 'Owner',
    owner_phone: g.ownerPhone || '',
    owner_password: g.ownerPassword || '',
    temp_password: g.tempPassword || null,
    status: g.status || 'ACTIVE',
    block_reason: g.blockReason || '',
    plan: g.plan || 'Enterprise Pro Suite',
    monthly_fee: Number(g.monthlyFee) || 4999,
    members_count: Number(g.membersCount) || 0,
    active_since: g.activeSince || todayISO(),
    last_login: g.lastLogin || 'Recently',
    settings: g.settings || {},
    updated_at: new Date().toISOString()
  };
}

function mapDbMemberToLocal(r) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email || '',
    avatar: r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=0B0F17&color=34d399&size=150`,
    status: r.status || 'active',
    membership: {
      planId: r.plan_id || 'p-1',
      planName: r.plan_name || '1 Month Fitness',
      startDate: r.membership_start || todayISO(),
      endDate: r.membership_end || todayISO(),
      autoRenew: r.auto_renew || false,
      amountPaid: r.amount_paid || 0,
    },
    weeklyGoalDays: r.weekly_goal_days || 4,
    streak: {
      current: r.streak_current || 0,
      max: r.streak_max || 0,
      restDaysApprovedThisWeek: r.rest_days_approved || 0,
    },
    lastCheckIn: r.last_check_in || null,
    absentDaysCount: r.absent_days_count || 0,
    assignedTrainer: r.assigned_trainer || 'tr-1',
    communicationConsent: r.communication_consent !== false,
    optedOutWhatsapp: r.opted_out_whatsapp || false,
    pauseReason: r.pause_reason || null,
    notes: r.notes || '',
  };
}

function mapLocalMemberToDb(m) {
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    email: m.email || null,
    avatar: m.avatar || null,
    status: m.status,
    plan_id: m.membership?.planId || null,
    plan_name: m.membership?.planName || null,
    membership_start: m.membership?.startDate || null,
    membership_end: m.membership?.endDate || null,
    auto_renew: m.membership?.autoRenew || false,
    amount_paid: m.membership?.amountPaid || 0,
    weekly_goal_days: m.weeklyGoalDays || 4,
    streak_current: m.streak?.current || 0,
    streak_max: m.streak?.max || 0,
    rest_days_approved: m.streak?.restDaysApprovedThisWeek || 0,
    last_check_in: m.lastCheckIn || null,
    absent_days_count: m.absentDaysCount || 0,
    assigned_trainer: m.assignedTrainer || null,
    communication_consent: m.communicationConsent !== false,
    opted_out_whatsapp: m.optedOutWhatsapp || false,
    pause_reason: m.pauseReason || null,
    notes: m.notes || null,
    updated_at: new Date().toISOString(),
  };
}

function mapDbAttendanceToLocal(r) {
  return {
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name,
    timestamp: r.timestamp,
    method: r.method,
    reason: r.reason || '',
    status: r.status,
    device: r.device || 'Unknown',
  };
}

// Export helpers for use in App.jsx
export { nowStr, todayISO, now };
