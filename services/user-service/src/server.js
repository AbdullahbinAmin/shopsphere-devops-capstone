/**
 * User Service — Server
 */
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const http = require('http');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const userRoutes = require('./routes/users');
const { createServiceLogger } = require('../shared/logger');
const { correlationIdMiddleware, requestLoggerMiddleware, errorHandlerMiddleware, notFoundMiddleware, setupGracefulShutdown } = require('../shared/middleware');
const { createHealthRouter, pgHealthCheck } = require('../shared/health');
const pool = require('./db/pool');

const logger = createServiceLogger('user-service');
const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','), credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware(logger));

app.use(createHealthRouter('user-service', '1.0.0', [pgHealthCheck(pool)]));

const swaggerSpec = swaggerJsdoc({
  definition: { openapi: '3.0.0', info: { title: 'ShopSphere User Service API', version: '1.0.0' }, servers: [{ url: `http://localhost:${process.env.PORT || 3002}` }], components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } } },
  apis: ['./src/routes/*.js'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/v1/users', userRoutes);
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware(logger));

const PORT = parseInt(process.env.PORT) || 3002;
const server = http.createServer(app);
server.listen(PORT, () => logger.info(`User Service started on port ${PORT}`));
setupGracefulShutdown(server, logger, [() => pool.end()]);

module.exports = { app };
