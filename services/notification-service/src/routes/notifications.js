/**
 * Notification Service — Routes + Server
 */
const express = require('express');
const notificationService = require('../services/notificationService');
const { sendSuccess, buildPagination } = require('../../shared/response');
const { AuthorizationError, AuthenticationError } = require('../../shared/errors');
const jwt = require('jsonwebtoken');

const router = express.Router();

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return next(new AuthenticationError());
  try {
    const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER || 'shopsphere-identity',
      audience: process.env.JWT_AUDIENCE || 'shopsphere-services',
    });
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch { next(new AuthenticationError()); }
}

function internalOnly(req, res, next) {
  const key = req.headers['x-internal-api-key'];
  if (key !== process.env.INTERNAL_API_KEY) return next(new AuthorizationError('Internal endpoint'));
  next();
}

// Internal: send notification (called by other services)
router.post('/send', internalOnly, async (req, res, next) => {
  try {
    const result = await notificationService.send(req.body);
    sendSuccess(res, result, 'Notification dispatched', 201);
  } catch (e) { next(e); }
});

// User: get my notifications
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const { notifications, total } = await notificationService.getUserNotifications(req.user.id, { page, limit });
    sendSuccess(res, notifications, 'Notifications', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

// Admin: get all notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') return next(new AuthorizationError());
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const { notifications, total } = await notificationService.getAllNotifications({ page, limit, type: req.query.type });
    sendSuccess(res, notifications, 'All notifications', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

module.exports = router;
