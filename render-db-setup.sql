-- ============================================================
-- 3 BATTI — RENDER DATABASE SETUP SCRIPT
-- Run this in Render Dashboard → PostgreSQL → Shell / Query
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  mpin_hash TEXT NOT NULL,
  wallet_balance DECIMAL(10,2) NOT NULL DEFAULT '0',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by INTEGER,
  kyc_status TEXT NOT NULL DEFAULT 'pending',
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  refresh_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT '0',
  total_deposited DECIMAL(10,2) NOT NULL DEFAULT '0',
  total_withdrawn DECIMAL(10,2) NOT NULL DEFAULT '0',
  total_won DECIMAL(10,2) NOT NULL DEFAULT '0',
  total_lost DECIMAL(10,2) NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reference_id TEXT,
  screenshot_url TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',
  winning_color TEXT,
  winning_number INTEGER,
  declared_by TEXT,
  total_collection DECIMAL(10,2) NOT NULL DEFAULT '0',
  total_payout DECIMAL(10,2) NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  bet_type TEXT NOT NULL,
  selection TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  potential_win DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS upi_settings (
  id SERIAL PRIMARY KEY,
  upi_id TEXT NOT NULL,
  qr_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  user_range_start INTEGER,
  user_range_end INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_earnings (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL,
  referee_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_details (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE,
  account_number TEXT,
  ifsc TEXT,
  account_holder_name TEXT,
  bank_name TEXT,
  upi_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SEED ADMIN USER (Username: Anuj Bishnoi, Password: Anujbishnoi@#000#@)
-- ============================================================
INSERT INTO admin_users (username, password_hash, role)
VALUES (
  'Anuj Bishnoi',
  '$2b$10$E/DDW22rkniSpaF4mznh7eyyNMJ73Wua3AfvetP0uUNRa3yUB2x2S',
  'super_admin'
)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- SEED DEFAULT GAME SETTINGS
-- ============================================================
INSERT INTO game_settings (key, value) VALUES
  ('color_multiplier', '2'),
  ('number_multiplier', '9'),
  ('min_bet', '10'),
  ('max_bet', '10000'),
  ('game_interval_minutes', '240'),
  ('platform_fee_percent', '5')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- VERIFY SETUP
-- ============================================================
SELECT 'Tables created successfully' as status;
SELECT username, role, created_at FROM admin_users;
SELECT key, value FROM game_settings;
