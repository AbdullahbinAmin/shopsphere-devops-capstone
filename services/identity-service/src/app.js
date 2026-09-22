/**
 * Identity Service — Express Application
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/auth');
const { createServiceLogger } = require('../shared/logger');
const {
  correlationIdMiddleware,
  requestLoggerMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
} = require('../shared/middleware');
const { createHealthRouter, pgHealthCheck } = require('../shared/health');
const pool = require('./db/pool');

const logger = createServiceLogger('identity-service');
const app = express();

// ---- Security middleware ----
app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
}));

// ---- Request parsing ----
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Observability middleware ----
app.use(correlationIdMiddleware);
app.use(requestLoggerMiddleware(logger));

// ---- Global rate limiting ----
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ---- Health endpoints ----
app.use(createHealthRouter('identity-service', '1.0.0', [pgHealthCheck(pool)]));

// ---- Swagger API Docs ----
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShopSphere Identity Service API',
      version: '1.0.0',
      description: 'Authentication, authorization, and identity management for ShopSphere',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3001}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// ---- API Routes ----
app.use('/api/v1/auth', authRoutes);

// ---- 404 & Error handlers (must be last) ----
app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware(logger));

module.exports = { app, logger };
