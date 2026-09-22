/**
 * ShopSphere Shared Health Check Builder
 * Every service uses this to expose consistent health endpoints.
 */

/**
 * Creates a health check router for an Express app.
 * @param {string} serviceName
 * @param {string} version
 * @param {Function[]} checks - Array of async functions returning { name, status, details }
 * @returns {import('express').Router}
 */
function createHealthRouter(serviceName, version, checks = []) {
  const express = require('express');
  const router = express.Router();

  router.get('/health', async (req, res) => {
    const results = [];
    let overallStatus = 'healthy';

    for (const check of checks) {
      try {
        const result = await check();
        results.push(result);
        if (result.status !== 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (err) {
        results.push({ name: check.name || 'unknown', status: 'unhealthy', error: err.message });
        overallStatus = 'unhealthy';
      }
    }

    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    return res.status(statusCode).json({
      service: serviceName,
      version,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: results,
    });
  });

  // Liveness probe — just checks if process is alive
  router.get('/health/live', (req, res) => {
    return res.status(200).json({
      service: serviceName,
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe — checks dependencies
  router.get('/health/ready', async (req, res) => {
    const results = [];
    let ready = true;

    for (const check of checks) {
      try {
        const result = await check();
        results.push(result);
        if (result.status !== 'healthy') {
          ready = false;
        }
      } catch (err) {
        results.push({ name: check.name || 'unknown', status: 'unhealthy', error: err.message });
        ready = false;
      }
    }

    return res.status(ready ? 200 : 503).json({
      service: serviceName,
      ready,
      timestamp: new Date().toISOString(),
      checks: results,
    });
  });

  return router;
}

/**
 * Creates a PostgreSQL health check function.
 * @param {import('pg').Pool} pool
 * @returns {Function}
 */
function pgHealthCheck(pool) {
  return async function postgresHealth() {
    const start = Date.now();
    await pool.query('SELECT 1');
    return {
      name: 'postgres',
      status: 'healthy',
      responseTime: `${Date.now() - start}ms`,
    };
  };
}

/**
 * Creates a Redis health check function.
 * @param {import('ioredis').Redis} redisClient
 * @returns {Function}
 */
function redisHealthCheck(redisClient) {
  return async function redisHealth() {
    const start = Date.now();
    await redisClient.ping();
    return {
      name: 'redis',
      status: 'healthy',
      responseTime: `${Date.now() - start}ms`,
    };
  };
}

module.exports = { createHealthRouter, pgHealthCheck, redisHealthCheck };
