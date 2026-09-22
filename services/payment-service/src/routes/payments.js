/**
 * Payment Service — Routes
 */
const express = require('express');
const paymentService = require('../services/paymentService');
const { sendSuccess, buildPagination } = require('../../shared/response');
const { AuthenticationError, AuthorizationError } = require('../../shared/errors');
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

// Internal: process payment (called by order service)
router.post('/', internalOnly, async (req, res, next) => {
  try {
    const payment = await paymentService.processPayment(req.body);
    sendSuccess(res, payment, 'Payment processed', 201);
  } catch (e) { next(e); }
});

// Authenticated: get my payment history
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const { payments, total } = await paymentService.getUserPayments(req.user.id, { page, limit });
    sendSuccess(res, payments, 'Payment history', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

// Authenticated: get payment by order ID
router.get('/order/:orderId', authenticate, async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
    sendSuccess(res, payment);
  } catch (e) { next(e); }
});

// Admin: get stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await paymentService.getPaymentStats();
    sendSuccess(res, stats);
  } catch (e) { next(e); }
});

// Admin: process refund
router.post('/:id/refund', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') return next(new AuthorizationError());
    const payment = await paymentService.processRefund(
      req.params.id, req.body.amount, req.body.reason, req.user.id
    );
    sendSuccess(res, payment, 'Refund processed');
  } catch (e) { next(e); }
});

// Admin: get payment by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    sendSuccess(res, payment);
  } catch (e) { next(e); }
});

module.exports = router;
