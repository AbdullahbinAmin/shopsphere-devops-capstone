/**
 * Cart Service — Server
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const cartRoutes = require('./routes/cart');
const { createServiceLogger } = require('../shared/logger');
const { correlationIdMiddleware, requestLoggerMiddleware, errorHandlerMiddleware, notFoundMiddleware, setupGracefulShutdown } = require('../shared/middleware');
const { createHealthRouter, redisHealthCheck } = require('../shared/health');
const redis = require('./redis');

const logger = createServiceLogger('cart-service');
const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json());
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware(logger));
app.use(createHealthRouter('cart-service', '1.0.0', [redisHealthCheck(redis)]));
app.use('/api/v1/cart', cartRoutes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware(logger));

const PORT = parseInt(process.env.PORT) || 3005;
const server = http.createServer(app);
server.listen(PORT, () => logger.info(`Cart Service started on port ${PORT}`));
setupGracefulShutdown(server, logger, [() => redis.quit()]);

module.exports = { app };
