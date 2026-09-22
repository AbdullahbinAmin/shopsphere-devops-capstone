/**
 * Inventory Service — Server
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const inventoryRoutes = require('./routes/inventory');
const { createServiceLogger } = require('../shared/logger');
const { correlationIdMiddleware, requestLoggerMiddleware, errorHandlerMiddleware, notFoundMiddleware, setupGracefulShutdown } = require('../shared/middleware');
const { createHealthRouter, pgHealthCheck } = require('../shared/health');
const pool = require('./db/pool');
const inventoryService = require('./services/inventoryService');

const logger = createServiceLogger('inventory-service');
const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware(logger));
app.use(createHealthRouter('inventory-service', '1.0.0', [pgHealthCheck(pool)]));
app.use('/api/v1/inventory', inventoryRoutes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware(logger));

// Cleanup expired reservations every 5 minutes
const cleanupInterval = setInterval(async () => {
  try {
    const count = await inventoryService.cleanupExpiredReservations();
    if (count > 0) logger.info(`Cleaned up ${count} expired reservations`);
  } catch (err) {
    logger.error('Reservation cleanup failed', { error: err.message });
  }
}, 5 * 60 * 1000);

const PORT = parseInt(process.env.PORT) || 3004;
const server = http.createServer(app);
server.listen(PORT, () => logger.info(`Inventory Service started on port ${PORT}`));
setupGracefulShutdown(server, logger, [
  async () => { clearInterval(cleanupInterval); await pool.end(); }
]);

module.exports = { app };
