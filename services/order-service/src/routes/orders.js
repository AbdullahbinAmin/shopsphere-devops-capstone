/**
 * Order Service — Routes
 */
const express = require('express');
const orderService = require('../services/orderService');
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

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AuthorizationError());
    next();
  };
}

// Create order (checkout)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.id, req.body);
    sendSuccess(res, order, 'Order placed successfully', 201);
  } catch (e) { next(e); }
});

// Get user's orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';

    if (isAdmin && req.query.all === 'true') {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { orders, total } = await orderService.getAllOrders({
        page, limit, status: req.query.status, userId: req.query.userId
      });
      return sendSuccess(res, orders, 'Orders retrieved', 200, buildPagination(total, page, limit));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const { orders, total } = await orderService.getUserOrders(req.user.id, {
      page, limit, status: req.query.status
    });
    sendSuccess(res, orders, 'Orders retrieved', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

// Admin: get order stats
router.get('/stats', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const stats = await orderService.getOrderStats();
    sendSuccess(res, stats);
  } catch (e) { next(e); }
});

// Get single order
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const order = await orderService.getOrderById(req.params.id, req.user.id, isAdmin);
    sendSuccess(res, order);
  } catch (e) { next(e); }
});

// Cancel order
router.post('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const order = await orderService.cancelOrder(req.params.id, req.user.id, req.body.reason, isAdmin);
    sendSuccess(res, order, 'Order cancelled');
  } catch (e) { next(e); }
});

// Admin: update order status
router.patch('/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status, req.body.note, req.user.id);
    sendSuccess(res, order, 'Order status updated');
  } catch (e) { next(e); }
});

module.exports = router;
