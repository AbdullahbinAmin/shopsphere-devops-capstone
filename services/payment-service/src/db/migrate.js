/**
 * Payment Service — Database Migration
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shopsphere_payments',
  user: process.env.DB_USER || 'shopsphere_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL UNIQUE,
  user_id         UUID NOT NULL,
  transaction_id  VARCHAR(100) NOT NULL UNIQUE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  method          VARCHAR(30) NOT NULL DEFAULT 'CARD'
                    CHECK (method IN ('CARD', 'PAYPAL', 'BANK_TRANSFER', 'CRYPTO', 'WALLET')),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING','AUTHORIZED','SUCCESS','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  payment_details JSONB DEFAULT '{}',   -- Masked card info, etc.
  gateway_response JSONB DEFAULT '{}',  -- Simulated gateway response
  failure_reason  TEXT,
  authorized_at   TIMESTAMPTZ,
  captured_at     TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  refunded_at     TIMESTAMPTZ,
  refund_amount   NUMERIC(12,2),
  refund_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order  ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_txn    ON payments(transaction_id);

CREATE TABLE IF NOT EXISTS refunds (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id  UUID NOT NULL REFERENCES payments(id),
  amount      NUMERIC(12,2) NOT NULL,
  reason      TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  processed_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[payment-service] Running migrations...');
    await client.query(MIGRATION_SQL);
    console.log('[payment-service] Migrations complete.');
  } catch (err) {
    console.error('[payment-service] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
