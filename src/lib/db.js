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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const normalizePhone = (phone) => {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '').slice(-10);
};

export const isValidUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
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
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
  }
};

// ── Smart Upsert Helper (Auto-adapts to live Supabase DB schema) ──
// ── Smart Upsert Helper (Auto-adapts to live Supabase DB schema) ──
export async function smartUpsert(tableName, rowObj, onConflictKey = 'id') {
  if (!isSupabaseConfigured) return { data: null, error: null };
  let payload = { ...rowObj };
  let retries = 25;
  let lastError = null;

  while (retries > 0) {
    let res = await supabase
      .from(tableName)
      .upsert(payload, { onConflict: onConflictKey });

    // If upsert failed due to missing UNIQUE constraint or ON CONFLICT error, try standard insert
    if (res.error && (res.error.code === '42P10' || (res.error.message || '').toLowerCase().includes('on conflict'))) {
      res = await supabase
        .from(tableName)
        .insert(payload);
    }

    if (!res.error) {
      return { data: res.data || payload, error: null };
    }
    lastError = res.error;

    // Handle invalid UUID syntax for gym_id (e.g. string 'default' passed when column is UUID)
    if (res.error && (res.error.code === '22P02' || (res.error.message || '').toLowerCase().includes('invalid input syntax for type uuid'))) {
      if (payload.gym_id !== undefined) {
        console.warn(`[smartUpsert] gym_id is not a valid UUID for table '${tableName}'. Stripping gym_id and retrying...`);
        delete payload.gym_id;
        retries--;
        continue;
      }
    }

    // Handle foreign key constraint failure on gym_id
    if (res.error && (res.error.message || '').toLowerCase().includes('foreign key')) {
      if (payload.gym_id !== undefined) {
        console.warn(`[smartUpsert] Foreign key constraint on gym_id for table '${tableName}'. Stripping gym_id and retrying...`);
        delete payload.gym_id;
        retries--;
        continue;
      }
    }

    // Comprehensive column missing regex matching PostgREST and PostgreSQL error formats
    const msg = res.error.message || '';
    const match =
      msg.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i) ||
      msg.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation/i) ||
      msg.match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i) ||
      msg.match(/column ([a-zA-Z0-9_.]+) does not exist/i);

    if (match && match[1]) {
      const missingCol = match[1].split('.').pop();
      if (payload[missingCol] !== undefined) {
        console.warn(`[smartUpsert] Column '${missingCol}' missing in DB table '${tableName}'. Stripping and retrying...`);
        delete payload[missingCol];
        retries--;
        continue;
      }
    }

    break;
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
      try { ls.set(LS.gyms, mapped); } catch (_) {}
      return mapped;
    } else if (error) {
      console.warn('Supabase fetchGyms notice:', error.message);
      return ls.get(LS.gyms, []);
    }
  }
  return ls.get(LS.gyms, []);
}

export async function upsertGym(gym) {
  const gymId = gym.id || generateUUID();
  const normalizedGym = { ...gym, id: gymId };
  const dbGym = mapLocalGymToDb(normalizedGym);
  let dbError = null;

  // 1. Supabase live cloud database
  if (isSupabaseConfigured) {
    const { error } = await smartUpsert('gyms', dbGym, 'id');
    if (error) {
      console.error('Supabase upsertGym error:', error.message);
      dbError = error;
    }
  }

  // 2. Always persist to LocalStorage registry as resilient offline cache
  try {
    const localGyms = ls.get(LS.gyms, []);
    const idx = localGyms.findIndex(g => g.id === gymId);
    if (idx >= 0) {
      localGyms[idx] = { ...localGyms[idx], ...normalizedGym };
    } else {
      localGyms.unshift(normalizedGym);
    }
    ls.set(LS.gyms, localGyms);
  } catch (e) {
    console.error('LocalStorage upsertGym error:', e);
  }

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

  try {
    const localGyms = ls.get(LS.gyms, []);
    const filtered = localGyms.filter(g => g.id !== gymId);
    ls.set(LS.gyms, filtered);
  } catch (_) {}

  return [];
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
    return { error: 'Mobile number not registered in gym database. Please contact your gym front desk.' };
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
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .ilike('owner_phone', `%${cleanPhone}%`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const match =
          (data.owner_password && data.owner_password === cleanPass) ||
          (data.temp_password && data.temp_password === cleanPass) ||
          (data.settings?.ownerPassword && data.settings.ownerPassword === cleanPass) ||
          (data.settings?.tempPassword && data.settings.tempPassword === cleanPass) ||
          (data.settings?.ownerCredentials?.password && data.settings.ownerCredentials.password === cleanPass);

        if (!match) {
          return { error: 'Incorrect password. If you received a temporary password from Super Admin, please enter it.' };
        }

        foundGym = mapDbGymToLocal(data);

        // Update last login in Supabase
        supabase.from('gyms').update({ last_login: nowStr() }).eq('id', data.id).then(() => { });
        return { gym: foundGym };
      }
    } catch (e) {
      console.warn('Supabase loginOwner query notice:', e.message);
    }
  }

  // 2. Fallback to LocalStorage gym registry
  const localGyms = ls.get(LS.gyms, []);
  const localMatch = localGyms.find(g => normalizePhone(g.ownerPhone) === cleanPhone);
  if (localMatch) {
    const passMatch =
      (localMatch.ownerPassword && localMatch.ownerPassword === cleanPass) ||
      (localMatch.tempPassword && localMatch.tempPassword === cleanPass) ||
      (localMatch.settings?.ownerPassword && localMatch.settings.ownerPassword === cleanPass) ||
      (localMatch.settings?.tempPassword && localMatch.settings.tempPassword === cleanPass) ||
      (localMatch.settings?.ownerCredentials?.password && localMatch.settings.ownerCredentials.password === cleanPass);

    if (!passMatch) {
      return { error: 'Incorrect password. If you received a temporary password from Super Admin, please enter it.' };
    }
    return { gym: localMatch };
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

  return { error: 'Invalid staff credentials or account inactive in gym database.' };
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
    if (gymId && gymId !== 'default' && isValidUUID(gymId)) {
      query = query.eq('gym_id', gymId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapDbMemberToLocal);
      try { ls.set(LS.members, mapped); } catch (_) {}
      return mapped;
    } else if (error) {
      console.warn('Supabase fetchMembers notice:', error.message);
      const local = ls.get(LS.members, []);
      return gymId ? local.filter(m => m.gymId === gymId) : local;
    }
  }
  const local = ls.get(LS.members, []);
  return gymId ? local.filter(m => m.gymId === gymId) : local;
}

export async function upsertMember(member, gymId = null) {
  const memberId = member.id || generateUUID();
  const normalizedMember = {
    ...member,
    id: memberId,
    gymId: member.gymId || gymId || null
  };
  const dbMember = mapLocalMemberToDb(normalizedMember);
  let dbError = null;

  if (isSupabaseConfigured) {
    let { error } = await smartUpsert('members', dbMember, 'id');
    // If foreign key constraint failed on gym_id, safely fallback to null gym_id
    if (error && (error.message || '').toLowerCase().includes('foreign key')) {
      console.warn('Foreign key issue on gym_id for member, retrying with gym_id=null...');
      dbMember.gym_id = null;
      const retry = await smartUpsert('members', dbMember, 'id');
      error = retry.error;
    }
    if (error) {
      console.error('Supabase upsertMember error:', error.message);
      dbError = error;
    }
  }

  try {
    const localMembers = ls.get(LS.members, []);
    const idx = localMembers.findIndex(m => m.id === memberId);
    if (idx >= 0) {
      localMembers[idx] = { ...localMembers[idx], ...normalizedMember };
    } else {
      localMembers.unshift(normalizedMember);
    }
    ls.set(LS.members, localMembers);
  } catch (_) {}

  return { member: normalizedMember, error: dbError };
}

export async function deleteMember(memberId) {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('attendance_logs').delete().eq('member_id', memberId);
      await supabase.from('no_show_cases').delete().eq('member_id', memberId);
      await supabase.from('addon_orders').delete().eq('member_id', memberId);
      const { error } = await supabase.from('members').delete().eq('id', memberId);
      if (error) console.error('Supabase deleteMember error:', error.message);
    } catch (err) {
      console.error('deleteMember exception:', err);
    }
  }
  try {
    const local = ls.get(LS.members, []);
    ls.set(LS.members, local.filter(m => m.id !== memberId));
  } catch (_) {}
  return { success: true };
}

export async function updateMemberPassword(memberId, newPassword) {
  const cleanPass = (newPassword || '').trim();
  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  let dbError = null;
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from('members')
        .update({
          password: cleanPass,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);
      if (error) {
        console.error('Supabase updateMemberPassword error:', error.message);
        dbError = error;
      }
    } catch (err) {
      console.error('updateMemberPassword exception:', err);
      dbError = err;
    }
  }

  // Local storage sync
  try {
    const localMembers = ls.get(LS.members, []);
    const idx = localMembers.findIndex(m => m.id === memberId);
    if (idx >= 0) {
      localMembers[idx].password = cleanPass;
      localMembers[idx].tempPassword = null;
      ls.set(LS.members, localMembers);
    }
  } catch (_) {}

  return { success: !dbError, error: dbError };
}

export async function updateOwnerPassword(gymId, newPassword) {
  const cleanPass = (newPassword || '').trim();
  if (!cleanPass || cleanPass.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  let dbError = null;
  if (isSupabaseConfigured) {
    try {
      let gymRecord = null;
      if (gymId && gymId !== 'default' && isValidUUID(gymId)) {
        const { data } = await supabase.from('gyms').select('*').eq('id', gymId).maybeSingle();
        gymRecord = data;
      }
      const existingSettings = gymRecord?.settings || {};
      const updatedSettings = {
        ...existingSettings,
        ownerPassword: cleanPass,
        tempPassword: cleanPass,
        ownerCredentials: {
          ...(existingSettings.ownerCredentials || {}),
          password: cleanPass
        }
      };

      let query = supabase.from('gyms').update({
        owner_password: cleanPass,
        temp_password: cleanPass,
        settings: updatedSettings
      });
      if (gymId && gymId !== 'default') {
        query = query.eq('id', gymId);
      }
      const { error } = await query;
      if (error) {
        // Fallback: update settings JSONB only
        let q2 = supabase.from('gyms').update({
          settings: updatedSettings
        });
        if (gymId && gymId !== 'default') {
          q2 = q2.eq('id', gymId);
        }
        const { error: err2 } = await q2;
        if (err2) {
          console.error('Supabase updateOwnerPassword error:', err2.message);
          dbError = err2;
        }
      }
    } catch (err) {
      console.error('updateOwnerPassword exception:', err);
      dbError = err;
    }
  }

  // Local storage sync
  try {
    const localGyms = ls.get(LS.gyms, []);
    const idx = localGyms.findIndex(g => !gymId || gymId === 'default' || g.id === gymId);
    if (idx >= 0) {
      localGyms[idx].ownerPassword = cleanPass;
      localGyms[idx].tempPassword = cleanPass;
      localGyms[idx].settings = {
        ...(localGyms[idx].settings || {}),
        ownerPassword: cleanPass,
        tempPassword: cleanPass
      };
      ls.set(LS.gyms, localGyms);
    }
    const currentSettings = ls.get(LS.settings, {});
    if (currentSettings) {
      currentSettings.ownerPassword = cleanPass;
      currentSettings.tempPassword = cleanPass;
      if (currentSettings.ownerCredentials) {
        currentSettings.ownerCredentials.password = cleanPass;
      }
      ls.set(LS.settings, currentSettings);
    }
  } catch (_) {}

  return { success: !dbError, error: dbError?.message || null };
}

export const resetMemberPassword = updateMemberPassword;

// ─────────────────────────────────────────────
//  PURGE DUMMY / FAKE DATA & ENTRIES
// ─────────────────────────────────────────────
export async function purgeDummyData(gymId = null, mode = 'test_only') {
  let deletedMembersCount = 0;
  let deletedLogsCount = 0;

  if (isSupabaseConfigured) {
    try {
      if (mode === 'all_platform_data') {
        // Platform-wide clean wipe of members, check-ins, orders, payments
        await supabase.from('attendance_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('no_show_cases').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('addon_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        const { data: allMem } = await supabase.from('members').select('id');
        deletedMembersCount = allMem?.length || 0;
        await supabase.from('members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('gyms').update({ members_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
        deletedLogsCount = 1;
      } else if (mode === 'logs_only') {
        let query = supabase.from('attendance_logs').delete();
        if (gymId && gymId !== 'ALL' && isValidUUID(gymId)) {
          query = query.eq('gym_id', gymId);
        } else {
          query = query.neq('id', '00000000-0000-0000-0000-000000000000');
        }
        const { error } = await query;
        if (!error) deletedLogsCount = 1;
      } else if (mode === 'test_only') {
        let memberQuery = supabase.from('members').select('id, name, phone, email');
        if (gymId && gymId !== 'ALL' && isValidUUID(gymId)) {
          memberQuery = memberQuery.eq('gym_id', gymId);
        }
        const { data: memberList, error: mErr } = await memberQuery;
        if (!mErr && memberList && memberList.length > 0) {
          const testKeywords = ['test', 'demo', 'dummy', 'fake', 'sample', 'tester', 'temp', 'tester'];
          const testPhones = ['9999999999', '1234567890', '9876543210', '0000000000', '1111111111', '0123456789'];

          const testMemberIds = memberList.filter(m => {
            const nameLower = (m.name || '').toLowerCase();
            const emailLower = (m.email || '').toLowerCase();
            const phone = (m.phone || '').replace(/\D/g, '');
            const hasKeyword = testKeywords.some(k => nameLower.includes(k) || emailLower.includes(k));
            const hasTestPhone = testPhones.includes(phone) || phone.startsWith('99999') || phone.startsWith('00000');
            return hasKeyword || hasTestPhone;
          }).map(m => m.id);

          if (testMemberIds.length > 0) {
            await supabase.from('attendance_logs').delete().in('member_id', testMemberIds);
            await supabase.from('no_show_cases').delete().in('member_id', testMemberIds);
            await supabase.from('addon_orders').delete().in('member_id', testMemberIds);
            await supabase.from('payments').delete().in('member_id', testMemberIds);
            const { error: delErr } = await supabase.from('members').delete().in('id', testMemberIds);
            if (!delErr) {
              deletedMembersCount = testMemberIds.length;
            }
          }
        }
      } else if (mode === 'all_gym_data' && gymId && gymId !== 'ALL') {
        let memberQuery = supabase.from('members').select('id');
        if (isValidUUID(gymId)) memberQuery = memberQuery.eq('gym_id', gymId);
        const { data: memberList } = await memberQuery;
        const memberIds = (memberList || []).map(m => m.id);

        if (memberIds.length > 0) {
          await supabase.from('attendance_logs').delete().in('member_id', memberIds);
          await supabase.from('no_show_cases').delete().in('member_id', memberIds);
          await supabase.from('addon_orders').delete().in('member_id', memberIds);
          await supabase.from('payments').delete().in('member_id', memberIds);
          await supabase.from('members').delete().in('id', memberIds);
          deletedMembersCount = memberIds.length;
        }
        if (isValidUUID(gymId)) {
          await supabase.from('attendance_logs').delete().eq('gym_id', gymId);
        }
      }
    } catch (err) {
      console.error('purgeDummyData Supabase exception:', err);
    }
  }

  // Also purge from LocalStorage
  try {
    const testKeywords = ['test', 'demo', 'dummy', 'fake', 'sample', 'tester', 'temp'];
    const testPhones = ['9999999999', '1234567890', '9876543210', '0000000000', '1111111111', '0123456789'];

    let localMembers = ls.get(LS.members, []);
    let localAttendance = ls.get(LS.attendance, []);
    let localNoShow = ls.get(LS.noshow, []);
    let localAddons = ls.get(LS.addons, []);
    let localPayments = ls.get(LS.payments, []);

    let removedIds = new Set();

    if (mode === 'all_platform_data') {
      deletedMembersCount = Math.max(deletedMembersCount, localMembers.length);
      ls.set(LS.members, []);
      ls.set(LS.attendance, []);
      ls.set(LS.noshow, []);
      ls.set(LS.addons, []);
      ls.set(LS.payments, []);
      const localGyms = ls.get(LS.gyms, []);
      ls.set(LS.gyms, localGyms.map(g => ({ ...g, membersCount: 0 })));
    } else if (mode === 'logs_only') {
      localAttendance = gymId && gymId !== 'ALL'
        ? localAttendance.filter(a => a.gymId !== gymId)
        : [];
      ls.set(LS.attendance, localAttendance);
      deletedLogsCount = Math.max(deletedLogsCount, 1);
    } else if (mode === 'test_only') {
      const remaining = localMembers.filter(m => {
        if (gymId && gymId !== 'ALL' && m.gymId !== gymId) return true;
        const nameLower = (m.name || '').toLowerCase();
        const emailLower = (m.email || '').toLowerCase();
        const phone = (m.phone || '').replace(/\D/g, '');
        const isTest = testKeywords.some(k => nameLower.includes(k) || emailLower.includes(k)) ||
          testPhones.includes(phone) || phone.startsWith('99999') || phone.startsWith('00000');
        if (isTest) {
          removedIds.add(m.id);
          return false;
        }
        return true;
      });
      deletedMembersCount = Math.max(deletedMembersCount, localMembers.length - remaining.length);
      ls.set(LS.members, remaining);
    } else if (mode === 'all_gym_data' && gymId && gymId !== 'ALL') {
      const remaining = localMembers.filter(m => {
        if (m.gymId === gymId) {
          removedIds.add(m.id);
          return false;
        }
        return true;
      });
      deletedMembersCount = Math.max(deletedMembersCount, localMembers.length - remaining.length);
      ls.set(LS.members, remaining);
      localAttendance = localAttendance.filter(a => a.gymId !== gymId);
      ls.set(LS.attendance, localAttendance);
    }

    if (removedIds.size > 0) {
      ls.set(LS.attendance, localAttendance.filter(a => !removedIds.has(a.memberId)));
      ls.set(LS.noshow, localNoShow.filter(c => !removedIds.has(c.memberId)));
      ls.set(LS.addons, localAddons.filter(o => !removedIds.has(o.memberId)));
      ls.set(LS.payments, localPayments.filter(p => !removedIds.has(p.memberId)));
    }
  } catch (_) { }

  return { deletedMembersCount, deletedLogsCount };
}

export async function resetAllPlatformDataToClean() {
  return await purgeDummyData('ALL', 'all_platform_data');
}

// ─────────────────────────────────────────────
//  EMAIL VERIFICATION (Members & Gym Owners)
// ─────────────────────────────────────────────
export function generateVerificationToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'GP-';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function verifyEmailToken(rawToken) {
  const token = (rawToken || '').trim().toUpperCase();
  if (!token || token.length < 4) {
    return { error: 'Invalid or missing email verification token.' };
  }

  const nowIso = new Date().toISOString();

  // 1. Check Supabase live DB (members)
  if (isSupabaseConfigured) {
    try {
      let { data: member } = await supabase
        .from('members')
        .select('*')
        .ilike('verification_token', token)
        .limit(1)
        .maybeSingle();

      if (!member) {
        const { data: memberInSettings } = await supabase
          .from('members')
          .select('*')
          .eq('settings->>verification_token', token)
          .limit(1)
          .maybeSingle();
        if (memberInSettings) member = memberInSettings;
      }

      if (member) {
        const updatedSettings = {
          ...(member.settings || {}),
          emailVerified: true,
          verification_token: null
        };

        await supabase
          .from('members')
          .update({
            email_verified: true,
            verification_token: null,
            settings: updatedSettings,
            updated_at: nowIso
          })
          .eq('id', member.id);

        const members = ls.get(LS.members, []);
        const idx = members.findIndex(m => m.id === member.id);
        if (idx >= 0) {
          members[idx].emailVerified = true;
          members[idx].verificationToken = null;
          ls.set(LS.members, members);
        }

        return {
          success: true,
          role: 'member',
          memberId: member.id,
          name: member.name,
          email: member.email,
          message: `Email ${member.email || ''} verified successfully for ${member.name}!`
        };
      }

      // Check Supabase gyms (owners)
      let { data: gym } = await supabase
        .from('gyms')
        .select('*')
        .or(`settings->>verification_token.eq.${token},settings->>verificationToken.eq.${token}`)
        .limit(1)
        .maybeSingle();

      if (gym) {
        const updatedSettings = {
          ...(gym.settings || {}),
          emailVerified: true,
          verification_token: null,
          verificationToken: null
        };

        await supabase
          .from('gyms')
          .update({
            settings: updatedSettings
          })
          .eq('id', gym.id);

        const gyms = ls.get(LS.gyms, []);
        const gIdx = gyms.findIndex(g => g.id === gym.id);
        if (gIdx >= 0) {
          gyms[gIdx].emailVerified = true;
          gyms[gIdx].verificationToken = null;
          if (!gyms[gIdx].settings) gyms[gIdx].settings = {};
          gyms[gIdx].settings.emailVerified = true;
          gyms[gIdx].settings.verificationToken = null;
          ls.set(LS.gyms, gyms);
        }

        return {
          success: true,
          role: 'owner',
          gymId: gym.id,
          name: gym.settings?.ownerName || gym.gym_name,
          email: gym.settings?.ownerEmail || '',
          message: `Gym owner email verified successfully for ${gym.gym_name}!`
        };
      }
    } catch (e) {
      console.warn('Supabase verifyEmailToken query notice:', e.message);
    }
  }

  // 2. Fallback to Local Storage
  const localMembers = ls.get(LS.members, []);
  const mIdx = localMembers.findIndex(m => (m.verificationToken || '').toUpperCase() === token);
  if (mIdx >= 0) {
    localMembers[mIdx].emailVerified = true;
    localMembers[mIdx].verificationToken = null;
    ls.set(LS.members, localMembers);
    return {
      success: true,
      role: 'member',
      memberId: localMembers[mIdx].id,
      name: localMembers[mIdx].name,
      email: localMembers[mIdx].email,
      message: `Email verified successfully for ${localMembers[mIdx].name}!`
    };
  }

  const localGyms = ls.get(LS.gyms, []);
  const gIdx = localGyms.findIndex(g => (g.verificationToken || '').toUpperCase() === token);
  if (gIdx >= 0) {
    localGyms[gIdx].emailVerified = true;
    localGyms[gIdx].verificationToken = null;
    ls.set(LS.gyms, localGyms);
    return {
      success: true,
      role: 'owner',
      gymId: localGyms[gIdx].id,
      name: localGyms[gIdx].gymName,
      email: localGyms[gIdx].ownerEmail,
      message: `Gym owner email verified successfully for ${localGyms[gIdx].gymName}!`
    };
  }

  return { error: 'Invalid or expired verification code. Please check the code or request a new one.' };
}

export async function generateAndSaveVerificationToken({ memberId, role = 'member', email, token: customToken }) {
  const token = customToken || generateVerificationToken();
  const nowIso = new Date().toISOString();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  if (role === 'owner') {
    if (isSupabaseConfigured) {
      try {
        let gymData = null;
        if (isValidUUID(memberId)) {
          const { data } = await supabase.from('gyms').select('*').eq('id', memberId).maybeSingle();
          gymData = data;
        } else if (email) {
          const { data } = await supabase.from('gyms').select('*').eq('settings->>ownerEmail', email).maybeSingle();
          gymData = data;
        }
        const updatedSettings = {
          ...(gymData?.settings || {}),
          verificationToken: token,
          verification_token: token,
          verificationSentAt: nowIso
        };
        let q = supabase.from('gyms').update({
          settings: updatedSettings
        });
        if (isValidUUID(memberId)) {
          q = q.eq('id', memberId);
        } else if (email) {
          q = q.eq('settings->>ownerEmail', email);
        }
        await q;
      } catch (_) {}
    }
    const gyms = ls.get(LS.gyms, []);
    const gIdx = gyms.findIndex(g => g.id === memberId || (email && g.ownerEmail?.toLowerCase() === email.toLowerCase()));
    if (gIdx >= 0) {
      gyms[gIdx].verificationToken = token;
      gyms[gIdx].verificationSentAt = nowIso;
      if (!gyms[gIdx].settings) gyms[gIdx].settings = {};
      gyms[gIdx].settings.verificationToken = token;
      gyms[gIdx].settings.verificationSentAt = nowIso;
      ls.set(LS.gyms, gyms);
    }
  } else {
    if (isSupabaseConfigured) {
      try {
        let q = supabase.from('members').update({
          verification_token: token,
          updated_at: nowIso
        });
        if (isValidUUID(memberId)) {
          q = q.eq('id', memberId);
        } else if (email) {
          q = q.ilike('email', email);
        }
        await q;
      } catch (_) {}
    }
    const members = ls.get(LS.members, []);
    const mIdx = members.findIndex(m => m.id === memberId || (email && m.email?.toLowerCase() === email.toLowerCase()));
    if (mIdx >= 0) {
      members[mIdx].verificationToken = token;
      members[mIdx].verificationSentAt = nowIso;
      ls.set(LS.members, members);
    }
  }

  return {
    success: true,
    token,
    code: token,
    verificationUrl: `${origin}?verify_token=${token}`
  };
}

export async function markEmailVerified({ id, role = 'member' }) {
  const nowIso = new Date().toISOString();
  if (role === 'owner') {
    if (isSupabaseConfigured) {
      try {
        let gymData = null;
        if (isValidUUID(id)) {
          const { data } = await supabase.from('gyms').select('*').eq('id', id).maybeSingle();
          gymData = data;
        }
        const updatedSettings = {
          ...(gymData?.settings || {}),
          emailVerified: true,
          verification_token: null,
          verificationToken: null
        };
        let q = supabase.from('gyms').update({
          settings: updatedSettings
        });
        if (isValidUUID(id)) {
          q = q.eq('id', id);
        }
        await q;
      } catch (_) {}
    }
    const gyms = ls.get(LS.gyms, []);
    const gIdx = gyms.findIndex(g => g.id === id);
    if (gIdx >= 0) {
      gyms[gIdx].emailVerified = true;
      gyms[gIdx].verificationToken = null;
      if (!gyms[gIdx].settings) gyms[gIdx].settings = {};
      gyms[gIdx].settings.emailVerified = true;
      gyms[gIdx].settings.verificationToken = null;
      ls.set(LS.gyms, gyms);
    }
  } else {
    if (isSupabaseConfigured) {
      try {
        let memData = null;
        if (isValidUUID(id)) {
          const { data } = await supabase.from('members').select('*').eq('id', id).maybeSingle();
          memData = data;
        }
        const updatedSettings = {
          ...(memData?.settings || {}),
          emailVerified: true,
          verification_token: null
        };
        let q = supabase.from('members').update({
          email_verified: true,
          verification_token: null,
          settings: updatedSettings,
          updated_at: nowIso
        });
        if (isValidUUID(id)) {
          q = q.eq('id', id);
        }
        const { error } = await q;
        if (error) {
          let q2 = supabase.from('members').update({
            settings: updatedSettings,
            updated_at: nowIso
          });
          if (isValidUUID(id)) q2 = q2.eq('id', id);
          await q2;
        }
      } catch (_) {}
    }
    const members = ls.get(LS.members, []);
    const mIdx = members.findIndex(m => m.id === id);
    if (mIdx >= 0) {
      members[mIdx].emailVerified = true;
      members[mIdx].verificationToken = null;
      ls.set(LS.members, members);
    }
  }
  return { success: true };
}

// ─────────────────────────────────────────────
//  PASSWORD RESET (Forgot Password & Token Flow)
// ─────────────────────────────────────────────
export async function forgotPasswordLocal({ phone, email, role = 'member' }) {
  const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
  const cleanEmail = (email || '').trim().toLowerCase();
  const resetToken = 'GP-RST-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).toUpperCase();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  if (isSupabaseConfigured) {
    if (role === 'owner') {
      let q = supabase.from('gyms').select('*');
      if (cleanPhone) q = q.ilike('owner_phone', `%${cleanPhone}%`);
      else if (cleanEmail) q = q.eq('settings->>ownerEmail', cleanEmail);
      const { data: gym, error } = await q.limit(1).maybeSingle();
      if (!error && gym) {
        const updatedSettings = {
          ...(gym.settings || {}),
          resetToken,
          reset_token: resetToken,
          resetTokenExpiresAt: expiresAt,
          reset_token_expires_at: expiresAt
        };
        await supabase.from('gyms').update({ settings: updatedSettings }).eq('id', gym.id);
        const ownerEmail = gym.settings?.ownerEmail || cleanEmail;
        const ownerName = gym.settings?.ownerName || gym.gym_name || 'Gym Owner';
        return { success: true, token: resetToken, email: ownerEmail, name: ownerName };
      }
    } else {
      let q = supabase.from('members').select('*');
      if (cleanPhone) q = q.eq('phone', cleanPhone);
      else if (cleanEmail) q = q.ilike('email', cleanEmail);
      const { data: member, error } = await q.limit(1).maybeSingle();
      if (!error && member) {
        await supabase.from('members').update({ reset_token: resetToken, reset_token_expires_at: expiresAt }).eq('id', member.id);
        return { success: true, token: resetToken, email: member.email, name: member.name };
      }
    }
  }

  // Local storage fallback
  const members = ls.get(LS.members, []);
  const m = members.find(x => (cleanPhone && x.phone?.slice(-10) === cleanPhone) || (cleanEmail && x.email?.toLowerCase() === cleanEmail));
  if (m) {
    m.resetToken = resetToken;
    m.resetTokenExpiresAt = expiresAt;
    ls.set(LS.members, members);
    return { success: true, token: resetToken, email: m.email, name: m.name };
  }

  return { error: 'No account found with this phone number or email address.' };
}

export async function resetPasswordWithTokenLocal(token, newPassword) {
  const cleanToken = (token || '').trim();
  const cleanPass = (newPassword || '').trim();
  const now = Date.now();

  let payloadUid = null;
  let payloadRole = 'member';
  let payloadHash = null;

  if (cleanToken.includes('.')) {
    try {
      const [b64] = cleanToken.split('.');
      const normalizedB64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = typeof atob !== 'undefined' ? atob(normalizedB64) : Buffer.from(normalizedB64, 'base64').toString('utf8');
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.uid && parsed.exp) {
        if (now > parsed.exp) {
          return { error: 'Password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.' };
        }
        payloadUid = parsed.uid;
        payloadRole = parsed.r || 'member';
        payloadHash = parsed.ph;
      }
    } catch (_) { }
  }

  if (isSupabaseConfigured) {
    if (payloadUid) {
      if (payloadRole === 'owner') {
        const { data: gym } = await supabase.from('gyms').select('*').eq('id', payloadUid).maybeSingle();
        const gymResetToken = gym?.settings?.reset_token || gym?.settings?.resetToken;
        if (gymResetToken && String(gymResetToken).startsWith('USED_')) {
          return { error: 'This password reset link has already been used. Please request a new one.' };
        }
        const updatedSettings = {
          ...(gym?.settings || {}),
          ownerPassword: cleanPass,
          tempPassword: null,
          reset_token: `USED_${now}`,
          resetToken: `USED_${now}`,
          reset_token_expires_at: null,
          resetTokenExpiresAt: null,
          ownerCredentials: {
            ...((gym?.settings || {}).ownerCredentials || {}),
            password: cleanPass
          }
        };
        await supabase.from('gyms').update({
          owner_password: cleanPass,
          temp_password: null,
          settings: updatedSettings
        }).eq('id', payloadUid);

        return {
          success: true,
          role: 'owner',
          phone: gym?.owner_phone,
          name: gym?.gym_name,
          gym: gym ? mapDbGymToLocal({ ...gym, owner_password: cleanPass, temp_password: null, settings: updatedSettings }) : null,
          message: `Password updated successfully for ${gym?.gym_name || 'Gym Owner'}!`
        };
      } else {
        const { data: member } = await supabase.from('members').select('*').eq('id', payloadUid).maybeSingle();
        if (member && member.reset_token && String(member.reset_token).startsWith('USED_')) {
          return { error: 'This password reset link has already been used. Please request a new one.' };
        }
        const { error: fullErr } = await supabase.from('members').update({ password: cleanPass, reset_token: `USED_${now}`, reset_token_expires_at: null }).eq('id', payloadUid);
        if (fullErr) {
          await supabase.from('members').update({ password: cleanPass }).eq('id', payloadUid);
        }
        return {
          success: true,
          role: 'member',
          phone: member?.phone,
          name: member?.name,
          member: member ? {
            id: member.id,
            gymId: member.gym_id || null,
            name: member.name,
            phone: member.phone,
            email: member.email || '',
            emailVerified: member.email_verified === true,
            avatar: member.avatar || null
          } : null,
          message: `Password updated successfully for ${member?.name || 'Member'}!`
        };
      }
    }

    const { data: member } = await supabase.from('members').select('*').eq('reset_token', cleanToken).limit(1).maybeSingle();
    if (member) {
      if (!member.reset_token_expires_at || new Date(member.reset_token_expires_at).getTime() < now) {
        return { error: 'Password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.' };
      }
      const { error: fullErr } = await supabase.from('members').update({ password: cleanPass, reset_token: `USED_${now}`, reset_token_expires_at: null }).eq('id', member.id);
      if (fullErr) {
        await supabase.from('members').update({ password: cleanPass }).eq('id', member.id);
      }
      return { success: true, role: 'member', name: member.name };
    }

    const { data: gym } = await supabase.from('gyms').select('*').or(`settings->>reset_token.eq.${cleanToken},settings->>resetToken.eq.${cleanToken}`).limit(1).maybeSingle();
    if (gym) {
      const expAt = gym.settings?.reset_token_expires_at || gym.settings?.resetTokenExpiresAt;
      if (!expAt || new Date(expAt).getTime() < now) {
        return { error: 'Password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.' };
      }
      const updatedSettings = {
        ...(gym.settings || {}),
        ownerPassword: cleanPass,
        tempPassword: null,
        reset_token: `USED_${now}`,
        resetToken: `USED_${now}`,
        reset_token_expires_at: null,
        resetTokenExpiresAt: null
      };
      await supabase.from('gyms').update({
        owner_password: cleanPass,
        temp_password: null,
        settings: updatedSettings
      }).eq('id', gym.id);
      return { success: true, role: 'owner', name: gym.gym_name };
    }
  }

  const members = ls.get(LS.members, []);
  const m = members.find(x => (x.resetToken && x.resetToken === cleanToken) || (payloadUid && x.id === payloadUid));
  if (m) {
    if (m.resetTokenUsed) {
      return { error: 'This password reset link has already been used. Please request a new one.' };
    }
    if (m.resetTokenExpiresAt && new Date(m.resetTokenExpiresAt).getTime() < now) {
      return { error: 'Password reset link has expired (links are strictly valid for 60 minutes only). Please request a new one.' };
    }
    m.password = cleanPass;
    m.resetToken = null;
    m.resetTokenUsed = true;
    m.resetTokenExpiresAt = null;
    ls.set(LS.members, members);
    return { success: true, role: 'member', name: m.name };
  }

  return { error: 'Invalid or expired password reset link. Please request a new one.' };
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(mapDbAttendanceToLocal);
      ls.set(LS.attendance, mapped);
      return mapped;
    } else if (error) {
      console.error('Supabase fetchAttendance error:', error.message);
    }
  }
  const localLogs = ls.get(LS.attendance, []);
  if (gymId) return localLogs.filter(a => a.gymId === gymId);
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
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
        amount: Number(r.amount) || 0,
        provider: r.provider,
        status: r.status,
        transactionRef: r.transaction_ref,
        timestamp: r.timestamp,
        idempotencyKey: r.idempotency_key
      }));
      ls.set(LS.payments, mapped);
      return mapped;
    } else if (error) {
      console.error('Supabase fetchPayments error:', error.message);
    }
  }
  const localPayments = ls.get(LS.payments, []);
  if (gymId) return localPayments.filter(p => p.gymId === gymId);
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
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
    } else if (error) {
      console.error('Supabase fetchNoShowCases error:', error.message);
    }
  }
  const localCases = ls.get(LS.noshow, []);
  if (gymId) return localCases.filter(c => c.gymId === gymId);
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
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
    } else if (error) {
      console.error('Supabase fetchStaff error:', error.message);
    }
  }
  const localStaff = ls.get(LS.staff, []);
  if (gymId) return localStaff.filter(s => s.gymId === gymId);
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
    const { data, error } = await query;
    if (!error && data) {
      const mapped = data.map(r => ({
        id: r.id,
        gymId: r.gym_id,
        memberId: r.member_id,
        memberName: r.member_name,
        addonId: r.addon_id,
        addonName: r.addon_name,
        price: Number(r.price) || 0,
        status: r.status,
        fulfilmentStatus: r.fulfilment_status,
        sessionsTotal: r.sessions_total,
        sessionsUsed: r.sessions_used,
        orderDate: r.order_date
      }));
      ls.set(LS.addons, mapped);
      return mapped;
    } else if (error) {
      console.error('Supabase fetchAddonOrders error:', error.message);
    }
  }
  const localOrders = ls.get(LS.addons, []);
  if (gymId) return localOrders.filter(o => o.gymId === gymId);
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
    if (gymId) {
      query = query.eq('gym_id', gymId);
    }
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
    } else if (error) {
      console.error('Supabase fetchAuditLogs error:', error.message);
    }
  }
  const localLogs = ls.get(LS.audit, []);
  if (gymId) return localLogs.filter(l => l.gymId === gymId);
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
//  GYM MEMBERSHIP PLANS & FEES (Configurable by Owner)
// ─────────────────────────────────────────────
export async function fetchGymPlans(gymId = null) {
  const settingsKey = gymId ? `gym_membership_plans_${gymId}` : 'gym_membership_plans';
  const localKey = gymId ? `fitpulse_gym_plans_${gymId}` : 'fitpulse_gym_plans';
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', settingsKey)
      .maybeSingle();
    if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
      return data.value;
    }
    // Fallback: try the global plans key if gym-specific not found
    if (gymId) {
      const { data: globalData, error: globalError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'gym_membership_plans')
        .maybeSingle();
      if (!globalError && globalData?.value && Array.isArray(globalData.value) && globalData.value.length > 0) {
        return globalData.value;
      }
    }
  }
  return ls.get(localKey, ls.get('fitpulse_gym_plans', PLANS));
}

export async function saveGymPlans(plans, gymId = null) {
  const settingsKey = gymId ? `gym_membership_plans_${gymId}` : 'gym_membership_plans';
  const localKey = gymId ? `fitpulse_gym_plans_${gymId}` : 'fitpulse_gym_plans';
  ls.set(localKey, plans);
  if (isSupabaseConfigured) {
    await supabase.from('app_settings').upsert({
      key: settingsKey,
      value: plans,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  }
}

// ─────────────────────────────────────────────
//  MAPPING HELPERS (DB ↔ Local)
// ─────────────────────────────────────────────
function mapDbGymToLocal(r) {
  const s = (r.settings && typeof r.settings === 'object') ? r.settings : {};
  return {
    id: r.id,
    gymName: r.gym_name || r.name || s.gymName || 'Gym Center',
    location: r.location || s.location || '',
    ownerName: r.owner_name || s.ownerName || 'Owner',
    ownerPhone: r.owner_phone || s.ownerPhone || '',
    ownerEmail: r.owner_email || s.ownerEmail || s.email || '',
    emailVerified: r.email_verified === true || s.emailVerified === true,
    verificationToken: r.verification_token || s.verificationToken || null,
    ownerPassword: r.owner_password || r.owner_password_hash || s.ownerPassword || s.tempPassword || s.ownerCredentials?.password || '',
    tempPassword: r.temp_password || s.tempPassword || '',
    status: r.status || s.status || 'ACTIVE',
    blockReason: r.block_reason || s.blockReason || '',
    plan: r.plan || s.plan || 'Standard',
    monthlyFee: Number(r.monthly_fee || s.monthlyFee) || 4499,
    membersCount: Number(r.members_count || s.membersCount) || 0,
    activeSince: r.active_since || s.activeSince || todayISO(),
    lastLogin: r.last_login || s.lastLogin || 'Recently',
    features: r.features || s.features || s.settings?.features || null,
    settings: s
  };
}

function mapLocalGymToDb(g) {
  const existingSettings = (g.settings && typeof g.settings === 'object') ? g.settings : {};
  const ownerName = g.ownerName || existingSettings.ownerName || 'Owner';
  const ownerEmail = g.ownerEmail || existingSettings.ownerEmail || null;
  const emailVerified = g.emailVerified === true || existingSettings.emailVerified === true;
  const verificationToken = g.verificationToken || existingSettings.verificationToken || null;
  const ownerPassword = g.ownerPassword || existingSettings.ownerPassword || '';
  const tempPassword = g.tempPassword || existingSettings.tempPassword || null;

  const mergedSettings = {
    ...existingSettings,
    gymName: g.gymName,
    location: g.location || '',
    ownerName,
    ownerPhone: g.ownerPhone || '',
    ownerEmail,
    ownerPassword,
    tempPassword,
    emailVerified,
    verificationToken,
    status: g.status || 'ACTIVE',
    blockReason: g.blockReason || '',
    plan: g.plan || 'Standard',
    monthlyFee: Number(g.monthlyFee) || 4499,
    features: g.features || existingSettings.features || null,
    ownerCredentials: {
      ...(existingSettings.ownerCredentials || {}),
      password: ownerPassword
    },
    updatedAt: new Date().toISOString()
  };

  return {
    id: g.id,
    gym_name: g.gymName,
    location: g.location || '',
    owner_phone: g.ownerPhone || '',
    owner_password: ownerPassword,
    temp_password: tempPassword,
    status: g.status || 'ACTIVE',
    block_reason: g.blockReason || '',
    plan: g.plan || 'Standard',
    monthly_fee: Number(g.monthlyFee) || 4499,
    members_count: Number(g.membersCount) || 0,
    active_since: g.activeSince || todayISO(),
    last_login: g.lastLogin || 'Recently',
    settings: mergedSettings
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
    emailVerified: r.email_verified === true,
    verificationToken: r.verification_token || null,
    verificationSentAt: r.verification_sent_at || null,
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
  let validLastCheckIn = null;
  if (m.lastCheckIn) {
    const t = new Date(m.lastCheckIn).getTime();
    if (!isNaN(t)) {
      validLastCheckIn = new Date(m.lastCheckIn).toISOString();
    }
  }

  return {
    id: m.id,
    gym_id: m.gymId || m.gym_id || null,
    name: m.name,
    phone: m.phone,
    password: m.password || null,
    email: m.email || null,
    email_verified: m.emailVerified === true,
    verification_token: m.verificationToken || null,
    verification_sent_at: m.verificationSentAt || null,
    avatar: m.avatar || null,
    status: m.status || 'active',
    plan_id: m.membership?.planId || null,
    plan_name: m.membership?.planName || null,
    membership_start: m.membership?.startDate || null,
    membership_end: m.membership?.endDate || null,
    auto_renew: m.membership?.autoRenew || false,
    amount_paid: Number(m.membership?.amountPaid) || 0,
    weekly_goal_days: Number(m.weeklyGoalDays) || 4,
    streak_current: Number(m.streak?.current) || 0,
    streak_max: Number(m.streak?.max) || 0,
    rest_days_approved: Number(m.streak?.restDaysApprovedThisWeek) || 0,
    last_check_in: validLastCheckIn,
    absent_days_count: Number(m.absentDaysCount) || 0,
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
