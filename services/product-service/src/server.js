/**
 * Product Service — Server
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const productRoutes = require('./routes/products');
const { createServiceLogger } = require('../shared/logger');
const { correlationIdMiddleware, requestLoggerMiddleware, errorHandlerMiddleware, notFoundMiddleware, setupGracefulShutdown } = require('../shared/middleware');
const { createHealthRouter, pgHealthCheck } = require('../shared/health');
const pool = require('./db/pool');

const logger = createServiceLogger('product-service');
const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware(logger));
app.use(createHealthRouter('product-service', '1.0.0', [pgHealthCheck(pool)]));
app.use('/api/v1/products', productRoutes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware(logger));

const PORT = parseInt(process.env.PORT) || 3003;
const server = http.createServer(app);
server.listen(PORT, () => logger.info(`Product Service started on port ${PORT}`));
setupGracefulShutdown(server, logger, [() => pool.end()]);

module.exports = { app };
