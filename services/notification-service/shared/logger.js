/**
 * ShopSphere Shared Logger
 * Structured JSON logging using Winston.
 * Each service instantiates this with its own service name.
 */

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = format;

/**
 * Creates a structured logger for a microservice.
 * @param {string} serviceName - Name of the service (e.g. 'identity-service')
 * @returns {import('winston').Logger}
 */
function createServiceLogger(serviceName) {
  const isDev = process.env.NODE_ENV !== 'production';

  const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] [${serviceName}] ${level}: ${message} ${metaStr}`;
    })
  );

  const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
  );

  return createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    format: isDev ? devFormat : prodFormat,
    transports: [
      new transports.Console(),
    ],
    // Do not exit on uncaught exceptions — let the process manager handle it
    exitOnError: false,
  });
}

/**
 * Creates a request-scoped child logger with correlation/request IDs.
 * @param {import('winston').Logger} logger
 * @param {object} context - { requestId, correlationId, userId, operation }
 * @returns {import('winston').Logger}
 */
function createRequestLogger(logger, context = {}) {
  return logger.child(context);
}

module.exports = { createServiceLogger, createRequestLogger };
