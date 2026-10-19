-- FitPulse Gym OS — Production Live Database Schema (Supabase PostgreSQL)
-- Dashboard → SQL Editor → New query → Paste & Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. DYNAMICALLY DROP ANY FOREIGN KEYS (Safely prevents incompatible type errors) ──
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS table_from
        FROM pg_constraint
        WHERE confrelid IN ('gyms'::regclass, 'members'::regclass) AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || r.table_from || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- ── 2. GYMS / TENANTS REGISTRY (Multi-tenant system root) ──
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

-- Automatic Column & Type Migrations for existing databases
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gyms' AND column_name='id' AND data_type='uuid') THEN
    ALTER TABLE gyms ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gyms' AND column_name='name') THEN
    ALTER TABLE gyms RENAME COLUMN name TO gym_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gyms' AND column_name='owner_password_hash') THEN
    ALTER TABLE gyms RENAME COLUMN owner_password_hash TO owner_password;
  END IF;
END $$;

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS gym_name TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS owner_password TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS temp_password TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS active_since TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Enterprise Pro Suite';
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC DEFAULT 4999;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS members_count INT DEFAULT 0;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS last_login TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

ALTER TABLE gyms ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE gyms ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_gyms_owner_phone ON gyms(owner_phone);
CREATE INDEX IF NOT EXISTS idx_gyms_status ON gyms(status);
CREATE INDEX IF NOT EXISTS idx_gyms_verification_token ON gyms(verification_token);
CREATE INDEX IF NOT EXISTS idx_gyms_reset_token ON gyms(reset_token);

-- ── 3. APP & SYSTEM SETTINGS ──
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. MEMBERS TABLE (Multi-tenant) ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='id' AND data_type='uuid') THEN
    ALTER TABLE members ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='members' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE members ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE members ADD COLUMN IF NOT EXISTS gym_id TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_end ON members(membership_end);
CREATE INDEX IF NOT EXISTS idx_members_verification_token ON members(verification_token);
CREATE INDEX IF NOT EXISTS idx_members_reset_token ON members(reset_token);

-- ── 5. ATTENDANCE LOGS ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_logs' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE attendance_logs ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE attendance_logs ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_attendance_member_id ON attendance_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_gym_id ON attendance_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance_logs(timestamp DESC);

-- ── 6. PAYMENTS ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE payments ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_gym_id ON payments(gym_id);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency ON payments(idempotency_key);

-- ── 7. NO-SHOW RETENTION CASES ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='no_show_cases' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE no_show_cases ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE no_show_cases ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_noshow_member_id ON no_show_cases(member_id);
CREATE INDEX IF NOT EXISTS idx_noshow_gym_id ON no_show_cases(gym_id);

-- ── 8. FRONT-DESK STAFF ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='staff' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE staff ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE staff ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_staff_phone ON staff(phone);
CREATE INDEX IF NOT EXISTS idx_staff_gym_id ON staff(gym_id);

-- ── 9. ADDON ORDERS ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='addon_orders' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE addon_orders ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE addon_orders ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_addons_member_id ON addon_orders(member_id);
CREATE INDEX IF NOT EXISTS idx_addons_gym_id ON addon_orders(gym_id);

-- ── 10. AUDIT LOGS ──
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

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='gym_id' AND data_type='uuid') THEN
    ALTER TABLE audit_logs ALTER COLUMN gym_id TYPE TEXT USING gym_id::text;
  END IF;
END $$;

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS gym_id TEXT;
CREATE INDEX IF NOT EXISTS idx_audit_gym_id ON audit_logs(gym_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- ── 11. ROW LEVEL SECURITY & OPEN ACCESS POLICIES ──
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
