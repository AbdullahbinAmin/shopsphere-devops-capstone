/**
 * API Gateway — Main Server
 *
 * Single entry point for all ShopSphere clients.
 * Responsibilities:
 * - Route requests to appropriate microservices
 * - Inject correlation IDs
 * - Forward auth headers
 * - Apply global rate limiting
 * - Centralized error formatting
 * - API versioning support
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const proxy = require('express-http-proxy');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const winston = require('winston');

// ---- Logger ----
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'api-gateway' },
  format: process.env.NODE_ENV === 'production'
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

// ---- Service URLs ----
const SERVICES = {
  identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:3001',
  users: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  products: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003',
  inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004',
  cart: process.env.CART_SERVICE_URL || 'http://localhost:3005',
  orders: process.env.ORDER_SERVICE_URL || 'http://localhost:3006',
  payments: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008',
};

const app = express();

// ---- Security & Parsing ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
  exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
}));

// ---- Global Rate Limiting ----
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down.',
      timestamp: new Date().toISOString(),
    });
  },
}));

// ---- Correlation ID + Request Logging ----
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const requestId = uuidv4();
  req.correlationId = correlationId;
  req.requestId = requestId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Gateway', 'ShopSphere API Gateway v1');

  const start = Date.now();
  res.on('finish', () => {
    logger.info('Proxied request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
      correlationId,
      ip: req.ip,
    });
  });
  next();
});

// ---- Proxy helper ----
function createProxy(serviceUrl) {
  return proxy(serviceUrl, {
    proxyReqPathResolver: (req) => req.originalUrl,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["X-Correlation-ID"] = srcReq.correlationId;
      proxyReqOpts.headers["X-Request-ID"] = srcReq.requestId;
      proxyReqOpts.headers["X-Forwarded-For"] = srcReq.ip;
      proxyReqOpts.headers["X-Gateway-Source"] = "api-gateway";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      userRes.setHeader("X-Correlation-ID", userReq.correlationId);
      return proxyResData;
    },
    proxyErrorHandler: (err, res, next) => {
      logger.error("Proxy error", { error: err.message, code: err.code });
      const statusCode = err.code === "ECONNREFUSED" ? 503 : 502;
      const errorCode = err.code === "ECONNREFUSED" ? "SERVICE_UNAVAILABLE" : "GATEWAY_ERROR";
      res.status(statusCode).json({
        success: false,
        error: errorCode,
        message: statusCode === 503 ? "Service is temporarily unavailable. Please try again." : "Gateway error.",
        timestamp: new Date().toISOString(),
      });
    },
    timeout: 30000,
  });
}

// ---- Health endpoint (Gateway itself) ----
app.get('/health', (req, res) => {
  res.json({
    service: 'api-gateway',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: SERVICES,
  });
});

const liveHandler = (req, res) => res.json({ service: 'api-gateway', status: 'alive', timestamp: new Date().toISOString() });
app.get('/health/live', liveHandler);
app.get('/health/liveness', liveHandler);

const readyHandler = (req, res) => res.json({ service: 'api-gateway', ready: true, timestamp: new Date().toISOString() });
app.get('/health/ready', readyHandler);
app.get('/health/readiness', readyHandler);

// ---- Service Routes ----
app.use('/api/v1/auth', createProxy(SERVICES.identity));
app.use('/api/v1/users', createProxy(SERVICES.users));
app.use('/api/v1/products', createProxy(SERVICES.products));
app.use('/api/v1/inventory', createProxy(SERVICES.inventory));
app.use('/api/v1/cart', createProxy(SERVICES.cart));
app.use('/api/v1/orders', createProxy(SERVICES.orders));
app.use('/api/v1/payments', createProxy(SERVICES.payments));
app.use('/api/v1/notifications', createProxy(SERVICES.notifications));

// ---- API Info ----
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'ShopSphere API',
    version: 'v1',
    services: Object.keys(SERVICES),
    documentation: {
      identity: `${SERVICES.identity}/api-docs`,
      products: `${SERVICES.products}/api-docs`,
      users: `${SERVICES.users}/api-docs`,
      orders: `${SERVICES.orders}/api-docs`,
    },
  });
});

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
    traceId: req.correlationId,
  });
});

// ---- Global error handler ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Gateway error', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred in the API gateway',
    timestamp: new Date().toISOString(),
    traceId: req.correlationId,
  });
});

const PORT = parseInt(process.env.PORT) || 3000;
const server = http.createServer(app);
server.listen(PORT, () => {
  logger.info(`API Gateway started`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    health: `http://localhost:${PORT}/health`,
    services: Object.keys(SERVICES).length,
  });
});

// Graceful shutdown
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down API gateway...`);
  server.close(() => {
    logger.info('API Gateway shut down gracefully');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app };
