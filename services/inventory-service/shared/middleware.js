/**
 * ShopSphere Shared Middleware
 * Common Express middleware used across all services.
 */

const { v4: uuidv4 } = require('uuid');
const { AppError } = require('./errors');
const { sendError } = require('./response');

/**
 * Correlation ID middleware.
 * Reads X-Correlation-ID from incoming request or generates a new one.
 * Attaches to req.correlationId and forwards in response headers.
 */
function correlationIdMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const requestId = uuidv4();
  req.correlationId = correlationId;
  req.requestId = requestId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-Request-ID', requestId);
  next();
}

/**
 * Request logger middleware.
 * Logs incoming request details using the service's logger.
 * @param {import('winston').Logger} logger
 */
function requestLoggerMiddleware(logger) {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        correlationId: req.correlationId,
        requestId: req.requestId,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: req.user?.id || null,
      });
    });
    next();
  };
}

/**
 * Global error handler middleware.
 * Must be registered as the LAST middleware in Express.
 * @param {import('winston').Logger} logger
 */
function errorHandlerMiddleware(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const traceId = req.correlationId || uuidv4();
    const path = req.path;

    if (err instanceof AppError) {
      if (err.statusCode >= 500) {
        logger.error('Application error', { error: err.message, stack: err.stack, traceId });
      } else {
        logger.warn('Client error', { error: err.message, errorCode: err.errorCode, traceId });
      }
      return sendError(res, err.message, err.statusCode, err.errorCode, path, traceId, err.details);
    }

    // Handle validation errors from express-validator or Joi
    if (err.name === 'ValidationError') {
      return sendError(res, err.message, 400, 'VALIDATION_ERROR', path, traceId);
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return sendError(res, 'Invalid or expired token', 401, 'AUTHENTICATION_ERROR', path, traceId);
    }

    // Unknown errors
    logger.error('Unhandled error', { error: err.message, stack: err.stack, traceId });
    return sendError(res, 'An unexpected error occurred', 500, 'INTERNAL_ERROR', path, traceId);
  };
}

/**
 * 404 handler — must be placed after all routes.
 */
function notFoundMiddleware(req, res) {
  return sendError(
    res,
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND',
    req.path,
    req.correlationId
  );
}

/**
 * Graceful shutdown helper.
 * Call this with the HTTP server instance and cleanup functions.
 * @param {import('http').Server} server
 * @param {import('winston').Logger} logger
 * @param {Function[]} cleanupFns
 */
function setupGracefulShutdown(server, logger, cleanupFns = []) {
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed');
      for (const fn of cleanupFns) {
        try {
          await fn();
        } catch (e) {
          logger.error('Cleanup error during shutdown', { error: e.message });
        }
      }
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      logger.error('Graceful shutdown timeout. Forcing exit.');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = {
  correlationIdMiddleware,
  requestLoggerMiddleware,
  errorHandlerMiddleware,
  notFoundMiddleware,
  setupGracefulShutdown,
};
