// ─────────────────────────────────────────────
//  FitPulse Gym OS — Supabase Client
//  Keys live in .env (VITE_SUPABASE_URL + publishable/anon key)
//  Dashboard: Project Settings → API
//  Schema: supabase/schema.sql (run in SQL Editor)
// ─────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import schemaSql from '../../supabase/schema.sql?raw';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const SUPABASE_SCHEMA_SQL = schemaSql;

export function getSupabaseSqlEditorUrl() {
  try {
    const host = new URL(SUPABASE_URL).hostname;
    const projectRef = host.split('.')[0];
    if (!projectRef) return 'https://supabase.com/dashboard';
    return `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
  } catch {
    return 'https://supabase.com/dashboard';
  }
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return error.code === 'PGRST205' || msg.includes('could not find the table') || msg.includes('schema cache');
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return { status: 'unconfigured' };
  }
  try {
    const { error } = await supabase.from('members').select('id').limit(1);
    if (!error) {
      return { status: 'ok' };
    }
    if (isMissingTableError(error)) {
      return { status: 'missing_tables', message: error.message };
    }
    return { status: 'error', message: error.message };
  } catch (err) {
    return { status: 'error', message: err.message || 'Network error talking to Supabase.' };
  }
}
