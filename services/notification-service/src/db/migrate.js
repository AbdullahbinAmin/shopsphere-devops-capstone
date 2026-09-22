/**
 * Notification Service — Database Migration
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shopsphere_notifications',
  user: process.env.DB_USER || 'shopsphere_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL,
  type        VARCHAR(50) NOT NULL,
  channel     VARCHAR(20) NOT NULL DEFAULT 'EMAIL'
                CHECK (channel IN ('EMAIL','SMS','PUSH','IN_APP')),
  subject     VARCHAR(255),
  body        TEXT,
  metadata    JSONB DEFAULT '{}',
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','SENT','FAILED','SIMULATED')),
  error       TEXT,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type   ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id           UUID PRIMARY KEY,
  email_order       BOOLEAN NOT NULL DEFAULT TRUE,
  email_payment     BOOLEAN NOT NULL DEFAULT TRUE,
  email_shipping    BOOLEAN NOT NULL DEFAULT TRUE,
  email_promotions  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[notification-service] Running migrations...');
    await client.query(MIGRATION_SQL);
    console.log('[notification-service] Migrations complete.');
  } catch (err) {
    console.error('[notification-service] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
