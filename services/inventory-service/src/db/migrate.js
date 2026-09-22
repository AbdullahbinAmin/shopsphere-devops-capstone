/**
 * Inventory Service — Database Migration
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shopsphere_inventory',
  user: process.env.DB_USER || 'shopsphere_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Inventory records (one per product)
CREATE TABLE IF NOT EXISTS inventory (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id       UUID NOT NULL UNIQUE,     -- references product in product-service
  sku              VARCHAR(100) NOT NULL,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  quantity_reserved INTEGER NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_in_stock - quantity_reserved) STORED,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  reorder_point    INTEGER NOT NULL DEFAULT 5,
  max_stock_level  INTEGER,
  warehouse_location VARCHAR(100),
  is_tracked       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku     ON inventory(sku);

-- Inventory reservations (for pending orders)
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  order_id     UUID NOT NULL,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  status       VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE', 'COMMITTED', 'RELEASED', 'EXPIRED')),
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_inventory ON inventory_reservations(inventory_id);
CREATE INDEX IF NOT EXISTS idx_reservations_order     ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status    ON inventory_reservations(status);

-- Inventory movement log (audit trail)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id),
  type         VARCHAR(30) NOT NULL CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'RESERVATION', 'RELEASE', 'COMMIT', 'ADJUSTMENT')),
  quantity     INTEGER NOT NULL,  -- Positive = added, Negative = removed
  reference_id UUID,              -- Order ID, adjustment ID, etc.
  reason       TEXT,
  performed_by UUID,
  snapshot_before JSONB,
  snapshot_after  JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_movements_type      ON inventory_movements(type);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_updated_at ON inventory;
CREATE TRIGGER inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS reservations_updated_at ON inventory_reservations;
CREATE TRIGGER reservations_updated_at BEFORE UPDATE ON inventory_reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('[inventory-service] Running migrations...');
    await client.query(MIGRATION_SQL);
    console.log('[inventory-service] Migrations complete.');
  } catch (err) {
    console.error('[inventory-service] Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
