-- FitPulse Gym OS — Production Live Database Schema (Supabase PostgreSQL)
-- Dashboard → SQL Editor → New query → Paste & Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. GYMS / TENANTS REGISTRY (Stores all gyms, owner credentials, passwords & temp passwords) ──
CREATE TABLE IF NOT EXISTS gyms (
  id TEXT PRIMARY KEY,
  gym_name TEXT NOT NULL,
  location TEXT,
  owner_name TEXT,
  owner_phone TEXT NOT NULL,
  owner_password TEXT,
  temp_password TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, MAINTENANCE
  block_reason TEXT,
  plan TEXT DEFAULT 'Enterprise Pro Suite',
  monthly_fee NUMERIC DEFAULT 4999,
  members_count INT DEFAULT 0,
  active_since TEXT,
  last_login TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gyms_owner_phone ON gyms(owner_phone);
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status);

-- ── 2. APP & SYSTEM SETTINGS ──
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. MEMBERS TABLE (Multi-tenant) ──
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  status TEXT NOT NULL DEFAULT 'active',
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

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_end ON members(membership_end);

-- ── 4. ATTENDANCE LOGS ──
CREATE TABLE IF NOT EXISTS attendance_logs (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  member_id TEXT,
  member_name TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method TEXT,
  reason TEXT,
  status TEXT DEFAULT 'SUCCESS',
  device TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_id ON attendance_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp DESC);

-- ── 5. PAYMENTS ──
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  order_id TEXT,
  member_id TEXT,
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
CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);

-- ── 6. NO-SHOW RETENTION CASES ──
CREATE TABLE IF NOT EXISTS no_show_cases (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  member_id TEXT,
  member_name TEXT,
  phone TEXT,
  absent_days INT DEFAULT 0,
  last_check_in TIMESTAMPTZ,
  status TEXT DEFAULT 'OPEN',
  assigned_trainer TEXT,
  last_follow_up TIMESTAMPTZ,
  outcome_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noshow_member_id ON no_show_cases(member_id);
CREATE INDEX IF NOT EXISTS idx_noshow_gym_id ON no_show_cases(gym_id);

-- ── 7. FRONT-DESK STAFF ──
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Front-Desk Executive',
  phone TEXT,
  pin TEXT,
  shift TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_phone ON staff(phone);
CREATE INDEX IF NOT EXISTS idx_staff_gym_id ON staff(gym_id);

-- ── 8. ADDON ORDERS ──
CREATE TABLE IF NOT EXISTS addon_orders (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  member_id TEXT,
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

CREATE INDEX IF NOT EXISTS idx_addons_member_id ON addon_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_addons_gym_id ON addon_orders(gym_id);

-- ── 9. AUDIT LOGS ──
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  gym_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT,
  action TEXT,
  target TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_gym_id ON audit_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- ── 10. ROW LEVEL SECURITY & OPEN ACCESS POLICIES ──
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for now" ON gyms;
DROP POLICY IF EXISTS "Allow all for now" ON app_settings;
DROP POLICY IF EXISTS "Allow all for now" ON members;
DROP POLICY IF EXISTS "Allow all for now" ON attendance_logs;
DROP POLICY IF EXISTS "Allow all for now" ON payments;
DROP POLICY IF EXISTS "Allow all for now" ON no_show_cases;
DROP POLICY IF EXISTS "Allow all for now" ON staff;
DROP POLICY IF EXISTS "Allow all for now" ON addon_orders;
DROP POLICY IF EXISTS "Allow all for now" ON audit_logs;

CREATE POLICY "Allow all for now" ON gyms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON app_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON attendance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON no_show_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON addon_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
