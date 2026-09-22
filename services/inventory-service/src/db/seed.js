/**
 * Inventory Service — Seed Data
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

// These product IDs must match the product-service seed data
const inventoryData = [
  { product_id: '22222222-0000-0000-0000-000000000001', sku: 'PHONE-001', quantity_in_stock: 150, low_stock_threshold: 20, reorder_point: 10 },
  { product_id: '22222222-0000-0000-0000-000000000002', sku: 'PHONE-002', quantity_in_stock: 75, low_stock_threshold: 15, reorder_point: 8 },
  { product_id: '22222222-0000-0000-0000-000000000003', sku: 'LAPTOP-001', quantity_in_stock: 45, low_stock_threshold: 10, reorder_point: 5 },
  { product_id: '22222222-0000-0000-0000-000000000004', sku: 'LAPTOP-002', quantity_in_stock: 30, low_stock_threshold: 8, reorder_point: 4 },
  { product_id: '22222222-0000-0000-0000-000000000005', sku: 'CLOTH-M-001', quantity_in_stock: 500, low_stock_threshold: 50, reorder_point: 25 },
  { product_id: '22222222-0000-0000-0000-000000000006', sku: 'CLOTH-W-001', quantity_in_stock: 350, low_stock_threshold: 40, reorder_point: 20 },
  { product_id: '22222222-0000-0000-0000-000000000007', sku: 'HOME-001', quantity_in_stock: 200, low_stock_threshold: 30, reorder_point: 15 },
  { product_id: '22222222-0000-0000-0000-000000000008', sku: 'SPORT-001', quantity_in_stock: 180, low_stock_threshold: 25, reorder_point: 12 },
  { product_id: '22222222-0000-0000-0000-000000000009', sku: 'BOOK-001', quantity_in_stock: 1000, low_stock_threshold: 100, reorder_point: 50 },
  { product_id: '22222222-0000-0000-0000-000000000010', sku: 'BEAUTY-001', quantity_in_stock: 300, low_stock_threshold: 30, reorder_point: 15 },
  { product_id: '22222222-0000-0000-0000-000000000011', sku: 'ELEC-001', quantity_in_stock: 8, low_stock_threshold: 10, reorder_point: 5 },  // Low stock!
  { product_id: '22222222-0000-0000-0000-000000000012', sku: 'SPORT-002', quantity_in_stock: 250, low_stock_threshold: 30, reorder_point: 15 },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[inventory-service] Seeding database...');
    for (const item of inventoryData) {
      await client.query(
        `INSERT INTO inventory (product_id, sku, quantity_in_stock, low_stock_threshold, reorder_point)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (product_id) DO UPDATE SET
           sku = EXCLUDED.sku,
           quantity_in_stock = EXCLUDED.quantity_in_stock`,
        [item.product_id, item.sku, item.quantity_in_stock, item.low_stock_threshold, item.reorder_point]
      );
      console.log(`  ✓ Inventory: ${item.sku} (${item.quantity_in_stock} units)`);
    }
    console.log('[inventory-service] Seed completed successfully.');
  } catch (err) {
    console.error('[inventory-service] Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
