import { pool } from "@workspace/db";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

export async function setupDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    logger.info("Running database setup...");

    await client.query(`
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
    `);

    logger.info("All tables created/verified");

    const existing = await client.query(
      `SELECT id FROM admin_users WHERE username = $1`,
      ["Anuj Bishnoi"]
    );

    if (existing.rows.length === 0) {
      const passwordHash = bcrypt.hashSync("Anujbishnoi@#000#@", 10);
      await client.query(
        `INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, 'super_admin')`,
        ["Anuj Bishnoi", passwordHash]
      );
      logger.info("Admin user seeded");
    } else {
      logger.info("Admin user already exists");
    }

    const settingsCount = await client.query(`SELECT COUNT(*) FROM game_settings`);
    if (parseInt(settingsCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO game_settings (key, value) VALUES
          ('color_multiplier', '2'),
          ('number_multiplier', '9'),
          ('min_bet', '10'),
          ('max_bet', '10000'),
          ('game_interval_minutes', '3'),
          ('platform_fee_percent', '5')
        ON CONFLICT (key) DO NOTHING;
      `);
      logger.info("Default game settings seeded");
    }

    logger.info("Database setup complete");
  } catch (err) {
    logger.error({ err }, "Database setup failed");
    throw err;
  } finally {
    client.release();
  }
}
