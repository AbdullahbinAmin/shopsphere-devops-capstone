/**
 * ShopSphere Shared Response Formatter
 * Ensures every service returns consistent JSON response shapes.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Send a successful response.
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} [message]
 * @param {number} [statusCode]
 * @param {object} [pagination]
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200, pagination = null) {
  const body = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  if (pagination) {
    body.pagination = pagination;
  }
  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} statusCode
 * @param {string} errorCode
 * @param {string} path
 * @param {string} [traceId]
 * @param {any} [details]
 */
function sendError(res, message, statusCode, errorCode, path, traceId, details = null) {
  const body = {
    success: false,
    timestamp: new Date().toISOString(),
    status: statusCode,
    error: errorCode,
    message,
    path,
    traceId: traceId || uuidv4(),
  };
  if (details) {
    body.details = details;
  }
  return res.status(statusCode).json(body);
}

/**
 * Build a pagination metadata object.
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrev: boolean }}
 */
function buildPagination(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { sendSuccess, sendError, buildPagination };
