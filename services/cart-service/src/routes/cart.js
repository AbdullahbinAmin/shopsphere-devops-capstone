/**
 * Cart Service — Routes
 */
const express = require('express');
const cartService = require('../services/cartService');
const { sendSuccess } = require('../../shared/response');
const { AuthenticationError } = require('../../shared/errors');
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

router.get('/', authenticate, async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user.id);
    sendSuccess(res, cart);
  } catch (e) { next(e); }
});

router.post('/items', authenticate, async (req, res, next) => {
  try {
    const cart = await cartService.addItem(req.user.id, req.body);
    sendSuccess(res, cart, 'Item added to cart', 201);
  } catch (e) { next(e); }
});

router.put('/items/:productId', authenticate, async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.user.id, req.params.productId, parseInt(quantity));
    sendSuccess(res, cart, 'Cart updated');
  } catch (e) { next(e); }
});

router.delete('/items/:productId', authenticate, async (req, res, next) => {
  try {
    const cart = await cartService.removeItem(req.user.id, req.params.productId);
    sendSuccess(res, cart, 'Item removed from cart');
  } catch (e) { next(e); }
});

router.delete('/', authenticate, async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.user.id);
    sendSuccess(res, cart, 'Cart cleared');
  } catch (e) { next(e); }
});

router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const cart = await cartService.syncPrices(req.user.id);
    sendSuccess(res, cart, 'Cart prices synced');
  } catch (e) { next(e); }
});

module.exports = router;
