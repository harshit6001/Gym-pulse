// ─────────────────────────────────────────────
//  FitPulse Gym OS — Supabase Client
//  Replace VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file
//  Get them from: https://supabase.com → Project → Settings → API
// ─────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ─────────────────────────────────────────────
//  SQL Schema — run this in Supabase SQL Editor
//  (Project → SQL Editor → New Query → paste → Run)
// ─────────────────────────────────────────────
export const SUPABASE_SCHEMA_SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Gyms table (for multi-gym admin control)
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, MAINTENANCE
  block_reason TEXT,
  no_show_threshold_days INT DEFAULT 10,
  renewal_reminder_days INT[] DEFAULT ARRAY[14, 7, 3, 0],
  qr_rotate_seconds INT DEFAULT 30,
  duplicate_scan_window_minutes INT DEFAULT 60,
  owner_phone TEXT,
  owner_password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Members table (supports 10,000+ rows efficiently via indexes)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, expired, paused, cancelled
  plan_id TEXT,
  plan_name TEXT,
  membership_start DATE,
  membership_end DATE,
  auto_renew BOOLEAN DEFAULT FALSE,
  amount_paid NUMERIC,
  weekly_goal_days INT DEFAULT 4,
  streak_current INT DEFAULT 0,
  streak_max INT DEFAULT 0,
  rest_days_approved INT DEFAULT 0,
  last_check_in TIMESTAMPTZ,
  absent_days_count INT DEFAULT 0,
  assigned_trainer TEXT,
  communication_consent BOOLEAN DEFAULT TRUE,
  opted_out_whatsapp BOOLEAN DEFAULT FALSE,
  pause_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast phone lookup (login)
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_end ON members(membership_end);

-- Attendance logs
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT, -- QR_SELF, ASSISTED_FRONTDESK, MANUAL
  reason TEXT,
  status TEXT DEFAULT 'SUCCESS',
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp DESC);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  order_id TEXT,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  plan_id TEXT,
  plan_name TEXT,
  amount NUMERIC,
  provider TEXT,
  status TEXT DEFAULT 'PAID',
  transaction_ref TEXT,
  idempotency_key TEXT UNIQUE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);

-- No-show cases
CREATE TABLE IF NOT EXISTS no_show_cases (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  phone TEXT,
  absent_days INT DEFAULT 0,
  last_check_in TIMESTAMPTZ,
  status TEXT DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, RESOLVED_RETURNED, CLOSED
  assigned_trainer TEXT,
  last_follow_up TIMESTAMPTZ,
  outcome_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff table
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Front-Desk Executive',
  phone TEXT,
  pin TEXT,
  shift TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add-on orders
CREATE TABLE IF NOT EXISTS addon_orders (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT,
  addon_id TEXT,
  addon_name TEXT,
  price NUMERIC,
  status TEXT DEFAULT 'PAID',
  fulfilment_status TEXT DEFAULT 'PENDING_FULFILMENT',
  sessions_total INT,
  sessions_used INT DEFAULT 0,
  order_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT,
  action TEXT,
  target TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_gym_id ON audit_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- Row Level Security (RLS) — members can only see their own data
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Public read for demo (tighten in production)
CREATE POLICY "Allow all for now" ON members FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON attendance_logs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON no_show_cases FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON addon_orders FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON gyms FOR ALL USING (true);
`;
