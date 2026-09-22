/**
 * Identity Service — Seed Data
 * Creates default admin and test customer accounts.
 * Run with: node src/db/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./pool');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

const seedData = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@shopsphere.com',
    password: 'Admin@ShopSphere2024!',
    role: 'ADMIN',
    is_active: true,
    is_verified: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'john.doe@example.com',
    password: 'Customer@123!',
    role: 'CUSTOMER',
    is_active: true,
    is_verified: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'jane.smith@example.com',
    password: 'Customer@123!',
    role: 'CUSTOMER',
    is_active: true,
    is_verified: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'alice.wonder@example.com',
    password: 'Customer@123!',
    role: 'CUSTOMER',
    is_active: true,
    is_verified: true,
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[identity-service] Seeding database...');
    for (const user of seedData) {
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
      await client.query(
        `INSERT INTO identities (id, email, password_hash, role, is_active, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role`,
        [user.id, user.email, passwordHash, user.role, user.is_active, user.is_verified]
      );
      console.log(`  ✓ ${user.role}: ${user.email}`);
    }
    console.log('[identity-service] Seed completed successfully.');
  } catch (err) {
    console.error('[identity-service] Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
