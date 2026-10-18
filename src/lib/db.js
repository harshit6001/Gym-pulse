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
export const now = () => new Date().toISOString();
export const nowStr = () => {
  const d = new Date();
  return d.toLocaleString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' });
};
export const todayISO = () => new Date().toISOString().split('T')[0];

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-10);
};

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
export async function smartUpsert(tableName, rowObj, onConflictKey = 'id') {
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
//  GYMS & TENANTS REGISTRY
// ─────────────────────────────────────────────
export async function fetchGyms() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      const mapped = data.map(mapDbGymToLocal);
      ls.set(LS.gyms, mapped);
      return mapped;
    } else if (error) {
      console.error('Supabase fetchGyms error:', error.message);
    }
  }
  return ls.get(LS.gyms, INITIAL_GYMS);
}

export async function upsertGym(gym) {
  const gymId = gym.id || generateUUID();
  const normalizedGym = { ...gym, id: gymId };
  const dbGym = mapLocalGymToDb(normalizedGym);
  let dbError = null;
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('gyms', dbGym, 'id');
    if (error) {
      console.error('Supabase upsertGym error:', error.message);
      dbError = error;
    }
  }
  const gyms = ls.get(LS.gyms, INITIAL_GYMS);
  const idx = gyms.findIndex(g => g.id === normalizedGym.id);
  if (idx >= 0) gyms[idx] = normalizedGym;
  else gyms.unshift(normalizedGym);
  ls.set(LS.gyms, gyms);
  return { gym: normalizedGym, error: dbError };
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
//  LIVE AUTHENTICATION HELPERS
// ─────────────────────────────────────────────
export async function loginMember(phone, password) {
  const cleanPhone = normalizePhone(phone);
  const cleanPass = (password || '').trim();

  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: 'Please enter a valid 10-digit mobile number.' };
  }
  if (!cleanPass) {
    return { error: 'Please enter your member password.' };
  }

  let foundMember = null;
  let rawDbData = null;
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      rawDbData = data;
      foundMember = mapDbMemberToLocal(data);
    }
  }

  if (!foundMember) {
    const members = ls.get(LS.members, INITIAL_MEMBERS);
    foundMember = members.find(m => normalizePhone(m.phone) === cleanPhone) || null;
  }

  if (!foundMember) {
    return { error: 'Mobile number not registered. Please contact your gym front desk.' };
  }

  // Password check: check against member's stored password, or fallback to phone last 4 digits if not set yet
  const memberStoredPass = rawDbData?.password || foundMember.password;
  const isMatch = memberStoredPass
    ? (memberStoredPass === cleanPass)
    : (cleanPass === cleanPhone.slice(-4) || cleanPass === cleanPhone);

  if (!isMatch) {
    return { error: 'Incorrect member password. Please check with your gym front desk.' };
  }

  // Check if member's gym is blocked
  let gymStatus = 'ACTIVE';
  let blockReason = '';
  let gymName = 'Gym';

  if (foundMember.gymId && isSupabaseConfigured) {
    const { data: gymData } = await supabase
      .from('gyms')
      .select('*')
      .eq('id', foundMember.gymId)
      .limit(1)
      .maybeSingle();
    if (gymData) {
      gymStatus = gymData.status || 'ACTIVE';
      blockReason = gymData.block_reason || '';
      gymName = gymData.gym_name || gymName;
    }
  }

  return {
    member: foundMember,
    gymStatus,
    blockReason,
    gymName
  };
}

export async function loginOwner(phone, password) {
  const cleanPhone = normalizePhone(phone);
  const cleanPass = (password || '').trim();

  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: 'Please enter a valid 10-digit mobile number.' };
  }
  if (!cleanPass) {
    return { error: 'Please enter your password.' };
  }

  let foundGym = null;

  // 1. Try Supabase Live Database First
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .ilike('owner_phone', `%${cleanPhone}%`)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const match =
        (data.owner_password && data.owner_password === cleanPass) ||
        (data.temp_password && data.temp_password === cleanPass);

      if (!match) {
        return { error: 'Incorrect password. If you received a temporary password from Super Admin, please enter it.' };
      }

      foundGym = mapDbGymToLocal(data);

      // Update last login in Supabase
      supabase.from('gyms').update({ last_login: nowStr() }).eq('id', data.id).then(() => {});
      return { gym: foundGym };
    }
  }

  // 2. Fallback to Local Storage Registry
  const gyms = ls.get(LS.gyms, INITIAL_GYMS);
  const localFound = gyms.find(g => normalizePhone(g.ownerPhone) === cleanPhone);

  if (localFound) {
    const match =
      (localFound.ownerPassword && localFound.ownerPassword === cleanPass) ||
      (localFound.tempPassword && localFound.tempPassword === cleanPass);

    if (!match) {
      return { error: 'Incorrect password. If you updated your password or received a temporary password, please enter it.' };
    }
    return { gym: localFound };
  }

  return { error: 'Mobile number not registered as gym owner. Accounts are created by Super Admin.' };
}

export async function loginStaff(phone, pin) {
  const cleanPhone = normalizePhone(phone);
  const cleanPin = (pin || '').trim();

  if (!cleanPhone || cleanPhone.length < 10) {
    return { error: 'Please enter a valid 10-digit mobile number.' };
  }
  if (!cleanPin) {
    return { error: 'Please enter your staff PIN.' };
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .ilike('phone', `%${cleanPhone}%`)
      .eq('pin', cleanPin)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      let gymStatus = 'ACTIVE';
      let blockReason = '';
      if (data.gym_id) {
        const { data: gymData } = await supabase.from('gyms').select('*').eq('id', data.gym_id).maybeSingle();
        if (gymData) {
          gymStatus = gymData.status || 'ACTIVE';
          blockReason = gymData.block_reason || '';
        }
      }
      return { staff: data, gymStatus, blockReason };
    }
  }

  const staffList = ls.get(LS.staff, INITIAL_STAFF);
  const found = staffList.find(s =>
    normalizePhone(s.phone) === cleanPhone &&
    s.pin === cleanPin &&
    s.status === 'ACTIVE'
  );
  if (found) {
    return { staff: found, gymStatus: 'ACTIVE', blockReason: '' };
  }

  return { error: 'Invalid staff credentials. Check phone number and PIN with your gym manager.' };
}

// ─────────────────────────────────────────────
//  SUPER ADMIN MASTER KEY HELPERS
// ─────────────────────────────────────────────
export async function fetchMasterKey() {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'super_admin_config')
      .maybeSingle();
    if (!error && data?.value?.superAdminKey) {
      return data.value.superAdminKey;
    }
  }
  const settings = ls.get(LS.settings, INITIAL_SETTINGS);
  return settings?.superAdminKey || 'Admin@2026Master#';
}

export async function saveMasterKey(newKey) {
  const cleanKey = newKey.trim();
  if (isSupabaseConfigured) {
    await supabase.from('app_settings').upsert({
      key: 'super_admin_config',
      value: { superAdminKey: cleanKey },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  }
  const settings = ls.get(LS.settings, INITIAL_SETTINGS);
  settings.superAdminKey = cleanKey;
  ls.set(LS.settings, settings);
}

// ─────────────────────────────────────────────
//  MEMBERS (Multi-Tenant)
// ─────────────────────────────────────────────
export async function fetchMembers(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('members').select('*').order('created_at', { ascending: false });
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapDbMemberToLocal);
      ls.set(LS.members, mapped);
      return mapped;
    }
  }
  const localMembers = ls.get(LS.members, INITIAL_MEMBERS);
  if (gymId) return localMembers.filter(m => !m.gymId || m.gymId === gymId);
  return localMembers;
}

export async function upsertMember(member, gymId = null) {
  const memberId = member.id || generateUUID();
  const normalizedMember = {
    ...member,
    id: memberId,
    gymId: member.gymId || gymId || null
  };
  const dbMember = mapLocalMemberToDb(normalizedMember);
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('members', dbMember, 'id');
    if (error) console.error('Supabase upsertMember error:', error.message);
  }
  const members = ls.get(LS.members, []);
  const idx = members.findIndex(m => m.id === normalizedMember.id);
  if (idx >= 0) members[idx] = normalizedMember;
  else members.unshift(normalizedMember);
  ls.set(LS.members, members);
  return normalizedMember;
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
export async function fetchAttendance(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('attendance_logs').select('*').order('timestamp', { ascending: false }).limit(2000);
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapDbAttendanceToLocal);
      ls.set(LS.attendance, mapped);
      return mapped;
    }
  }
  const localLogs = ls.get(LS.attendance, INITIAL_ATTENDANCE_LOGS);
  if (gymId) return localLogs.filter(a => !a.gymId || a.gymId === gymId);
  return localLogs;
}

export async function insertAttendanceLog(log, gymId = null) {
  const logId = log.id || generateUUID();
  const normalizedLog = { ...log, id: logId, gymId: log.gymId || gymId || null };
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('attendance_logs', {
      id: normalizedLog.id,
      gym_id: normalizedLog.gymId,
      member_id: normalizedLog.memberId,
      member_name: normalizedLog.memberName,
      timestamp: normalizedLog.timestamp ? new Date(normalizedLog.timestamp).toISOString() : new Date().toISOString(),
      method: normalizedLog.method,
      reason: normalizedLog.reason || null,
      status: normalizedLog.status || 'SUCCESS',
      device: normalizedLog.device || 'Web'
    }, 'id');
    if (error) console.error('Supabase insertAttendance error:', error.message);
  }
  const logs = ls.get(LS.attendance, []);
  ls.set(LS.attendance, [normalizedLog, ...logs]);
  return normalizedLog;
}

// ─────────────────────────────────────────────
//  PAYMENTS
// ─────────────────────────────────────────────
export async function fetchPayments(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('payments').select('*').order('created_at', { ascending: false }).limit(5000);
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        orderId: r.order_id,
        memberId: r.member_id,
        memberName: r.member_name,
        planId: r.plan_id,
        planName: r.plan_name,
        amount: r.amount,
        provider: r.provider,
        status: r.status,
        transactionRef: r.transaction_ref,
        timestamp: r.timestamp,
        idempotencyKey: r.idempotency_key
      }));
      ls.set(LS.payments, mapped);
      return mapped;
    }
  }
  const localPayments = ls.get(LS.payments, INITIAL_PAYMENTS);
  if (gymId) return localPayments.filter(p => !p.gymId || p.gymId === gymId);
  return localPayments;
}

export async function insertPayment(payment, gymId = null) {
  const paymentId = payment.id || generateUUID();
  const normalizedPayment = { ...payment, id: paymentId, gymId: payment.gymId || gymId || null };
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('payments', {
      id: normalizedPayment.id,
      gym_id: normalizedPayment.gymId,
      order_id: normalizedPayment.orderId,
      member_id: normalizedPayment.memberId,
      member_name: normalizedPayment.memberName,
      plan_id: normalizedPayment.planId,
      plan_name: normalizedPayment.planName,
      amount: normalizedPayment.amount,
      provider: normalizedPayment.provider,
      status: normalizedPayment.status || 'PAID',
      transaction_ref: normalizedPayment.transactionRef,
      idempotency_key: normalizedPayment.idempotencyKey || `ik_${Date.now()}`,
      timestamp: new Date().toISOString(),
    }, 'id');
    if (error && error.code !== '23505') {
      console.error('Supabase insertPayment error:', error.message);
    }
  }
  const payments = ls.get(LS.payments, []);
  ls.set(LS.payments, [normalizedPayment, ...payments]);
  return normalizedPayment;
}

// ─────────────────────────────────────────────
//  NO-SHOW CASES
// ─────────────────────────────────────────────
export async function fetchNoShowCases(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('no_show_cases').select('*').order('created_at', { ascending: false });
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        memberId: r.member_id,
        memberName: r.member_name,
        phone: r.phone,
        absentDays: r.absent_days,
        lastCheckIn: r.last_check_in,
        status: r.status,
        assignedTrainer: r.assigned_trainer,
        lastFollowUp: r.last_follow_up,
        outcomeHistory: r.outcome_history || []
      }));
      ls.set(LS.noshow, mapped);
      return mapped;
    }
  }
  const localCases = ls.get(LS.noshow, INITIAL_NO_SHOW_CASES);
  if (gymId) return localCases.filter(c => !c.gymId || c.gymId === gymId);
  return localCases;
}

export async function upsertNoShowCase(nsc, gymId = null) {
  const caseId = nsc.id || generateUUID();
  const normalizedCase = { ...nsc, id: caseId, gymId: nsc.gymId || gymId || null };
  if (isSupabaseConfigured) {
    await smartUpsert('no_show_cases', {
      id: normalizedCase.id,
      gym_id: normalizedCase.gymId,
      member_id: normalizedCase.memberId,
      member_name: normalizedCase.memberName,
      phone: normalizedCase.phone,
      absent_days: normalizedCase.absentDays,
      last_check_in: normalizedCase.lastCheckIn ? new Date(normalizedCase.lastCheckIn).toISOString() : null,
      status: normalizedCase.status,
      assigned_trainer: normalizedCase.assignedTrainer,
      last_follow_up: normalizedCase.lastFollowUp ? new Date().toISOString() : null,
      outcome_history: normalizedCase.outcomeHistory,
    }, 'id');
  }
  const cases = ls.get(LS.noshow, []);
  const idx = cases.findIndex(c => c.id === normalizedCase.id);
  if (idx >= 0) cases[idx] = normalizedCase;
  else cases.unshift(normalizedCase);
  ls.set(LS.noshow, cases);
  return normalizedCase;
}

// ─────────────────────────────────────────────
//  STAFF
// ─────────────────────────────────────────────
export async function fetchStaff(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('staff').select('*').eq('status', 'ACTIVE');
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        name: r.name,
        role: r.role,
        phone: r.phone,
        pin: r.pin,
        shift: r.shift,
        status: r.status
      }));
      ls.set(LS.staff, mapped);
      return mapped;
    }
  }
  const localStaff = ls.get(LS.staff, INITIAL_STAFF);
  if (gymId) return localStaff.filter(s => !s.gymId || s.gymId === gymId);
  return localStaff;
}

export async function insertStaff(staff, gymId = null) {
  const staffId = staff.id || generateUUID();
  const normalizedStaff = { ...staff, id: staffId, gymId: staff.gymId || gymId || null };
  if (isSupabaseConfigured) {
    await smartUpsert('staff', {
      id: normalizedStaff.id,
      gym_id: normalizedStaff.gymId,
      name: normalizedStaff.name,
      role: normalizedStaff.role,
      phone: normalizedStaff.phone,
      pin: normalizedStaff.pin,
      shift: normalizedStaff.shift,
      status: normalizedStaff.status || 'ACTIVE',
    }, 'id');
  }
  const list = ls.get(LS.staff, []);
  ls.set(LS.staff, [...list, normalizedStaff]);
  return normalizedStaff;
}

export async function removeStaff(staffId) {
  if (isSupabaseConfigured) {
    await supabase.from('staff').update({ status: 'INACTIVE' }).eq('id', staffId);
  }
  const list = ls.get(LS.staff, []);
  ls.set(LS.staff, list.filter(s => s.id !== staffId));
}

// ─────────────────────────────────────────────
//  ADDON ORDERS
// ─────────────────────────────────────────────
export async function fetchAddonOrders(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('addon_orders').select('*').order('created_at', { ascending: false });
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        memberId: r.member_id,
        memberName: r.member_name,
        addonId: r.addon_id,
        addonName: r.addon_name,
        price: r.price,
        status: r.status,
        fulfilmentStatus: r.fulfilment_status,
        sessionsTotal: r.sessions_total,
        sessionsUsed: r.sessions_used,
        orderDate: r.order_date
      }));
      ls.set(LS.addons, mapped);
      return mapped;
    }
  }
  const localOrders = ls.get(LS.addons, INITIAL_ADDON_ORDERS);
  if (gymId) return localOrders.filter(o => !o.gymId || o.gymId === gymId);
  return localOrders;
}

export async function insertAddonOrder(order, gymId = null) {
  const orderId = order.id || generateUUID();
  const normalizedOrder = { ...order, id: orderId, gymId: order.gymId || gymId || null };
  if (isSupabaseConfigured) {
    await smartUpsert('addon_orders', {
      id: normalizedOrder.id,
      gym_id: normalizedOrder.gymId,
      member_id: normalizedOrder.memberId,
      member_name: normalizedOrder.memberName,
      addon_id: normalizedOrder.addonId,
      addon_name: normalizedOrder.addonName,
      price: normalizedOrder.price,
      status: normalizedOrder.status || 'PAID',
      fulfilment_status: normalizedOrder.fulfilmentStatus || 'PENDING_FULFILMENT',
      sessions_total: normalizedOrder.sessionsTotal,
      sessions_used: normalizedOrder.sessionsUsed || 0,
      order_date: normalizedOrder.orderDate || todayISO(),
    }, 'id');
  }
  const orders = ls.get(LS.addons, []);
  ls.set(LS.addons, [normalizedOrder, ...orders]);
  return normalizedOrder;
}

export async function updateAddonOrder(orderId, fields) {
  if (isSupabaseConfigured) {
    const dbFields = {};
    if (fields.fulfilmentStatus !== undefined) dbFields.fulfilment_status = fields.fulfilmentStatus;
    if (fields.sessionsUsed !== undefined) dbFields.sessions_used = fields.sessionsUsed;
    await supabase.from('addon_orders').update(dbFields).eq('id', orderId);
  }
  const orders = ls.get(LS.addons, []);
  ls.set(LS.addons, orders.map(o => o.id === orderId ? { ...o, ...fields } : o));
}

// ─────────────────────────────────────────────
//  AUDIT LOGS
// ─────────────────────────────────────────────
export async function fetchAuditLogs(gymId = null) {
  if (isSupabaseConfigured) {
    let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (gymId) query = query.eq('gym_id', gymId);
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        timestamp: r.timestamp,
        actor: r.actor,
        action: r.action,
        target: r.target,
        details: r.details
      }));
      ls.set(LS.audit, mapped);
      return mapped;
    }
  }
  const localLogs = ls.get(LS.audit, INITIAL_AUDIT_LOGS);
  if (gymId) return localLogs.filter(l => !l.gymId || l.gymId === gymId);
  return localLogs;
}

export async function insertAuditLog(log, gymId = null) {
  const logId = log.id || generateUUID();
  const normalizedLog = { ...log, id: logId, gymId: log.gymId || gymId || null };
  if (isSupabaseConfigured) {
    await smartUpsert('audit_logs', {
      id: normalizedLog.id,
      gym_id: normalizedLog.gymId,
      timestamp: normalizedLog.timestamp ? new Date(normalizedLog.timestamp).toISOString() : new Date().toISOString(),
      actor: normalizedLog.actor || 'System',
      action: normalizedLog.action || 'ACTIVITY',
      target: normalizedLog.target || 'System',
      details: normalizedLog.details || ''
    }, 'id');
  }
  const logs = ls.get(LS.audit, []);
  ls.set(LS.audit, [normalizedLog, ...logs]);
  return normalizedLog;
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
    tempPassword: r.temp_password || '',
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
    gymId: r.gym_id || null,
    name: r.name,
    phone: r.phone,
    password: r.password || null,
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
    assignedTrainer: r.assigned_trainer || 'Head Coach',
    communicationConsent: r.communication_consent !== false,
    optedOutWhatsapp: r.opted_out_whatsapp || false,
    pauseReason: r.pause_reason || null,
    notes: r.notes || '',
  };
}

function mapLocalMemberToDb(m) {
  return {
    id: m.id,
    gym_id: m.gymId || m.gym_id || null,
    name: m.name,
    phone: m.phone,
    password: m.password || null,
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
    gymId: r.gym_id || null,
    memberId: r.member_id,
    memberName: r.member_name,
    timestamp: r.timestamp,
    method: r.method,
    reason: r.reason || '',
    status: r.status,
    device: r.device || 'Unknown',
  };
}
