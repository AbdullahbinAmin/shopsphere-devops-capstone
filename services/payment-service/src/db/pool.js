/**
 * Payment Service — Database Pool + Migration + Service
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shopsphere_payments',
  user: process.env.DB_USER || 'shopsphere_user',
  password: process.env.DB_PASSWORD,
  min: 2, max: 10,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => console.error('Payment DB pool error:', err.message));
module.exports = pool;
