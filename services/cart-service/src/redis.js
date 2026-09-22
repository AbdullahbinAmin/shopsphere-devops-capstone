/**
 * Cart Service — Redis Client
 */
require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 100, 2000);
  },
  lazyConnect: false,
});

redis.on('connect', () => console.log('[cart-service] Redis connected'));
redis.on('error', (err) => console.error('[cart-service] Redis error:', err.message));

module.exports = redis;
