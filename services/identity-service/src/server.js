/**
 * Identity Service — Server Entry Point
 */

const http = require('http');
const { app, logger } = require('./app');
const { setupGracefulShutdown } = require('../shared/middleware');
const pool = require('./db/pool');

const PORT = parseInt(process.env.PORT) || 3001;

const server = http.createServer(app);

server.listen(PORT, () => {
  logger.info(`Identity Service started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    docs: `http://localhost:${PORT}/api-docs`,
    health: `http://localhost:${PORT}/health`,
  });
});

setupGracefulShutdown(server, logger, [
  async () => {
    await pool.end();
    logger.info('Database pool closed');
  },
]);
