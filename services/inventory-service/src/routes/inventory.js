/**
 * Inventory Service — Routes
 */
const express = require('express');
const inventoryService = require('../services/inventoryService');
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

// Internal service key check
function internalOnly(req, res, next) {
  const key = req.headers['x-internal-api-key'];
  if (key !== process.env.INTERNAL_API_KEY) return next(new AuthorizationError('Internal endpoint'));
  next();
}

// Public: check availability for a product
router.get('/check/:productId', async (req, res, next) => {
  try {
    const qty = parseInt(req.query.quantity) || 1;
    const availability = await inventoryService.checkAvailability(req.params.productId, qty);
    sendSuccess(res, availability);
  } catch (e) { next(e); }
});

// Public: get inventory by product ID
router.get('/product/:productId', async (req, res, next) => {
  try {
    const inv = await inventoryService.getByProductId(req.params.productId);
    // Return limited public info
    sendSuccess(res, {
      productId: inv.product_id,
      quantityAvailable: inv.quantity_available,
      isLowStock: inv.quantity_available <= inv.low_stock_threshold,
      isInStock: inv.quantity_available > 0,
    });
  } catch (e) { next(e); }
});

// Internal: reserve stock (called by order service)
router.post('/reserve', internalOnly, async (req, res, next) => {
  try {
    const { productId, quantity, orderId } = req.body;
    const reservation = await inventoryService.reserveStock(productId, quantity, orderId);
    sendSuccess(res, reservation, 'Stock reserved', 201);
  } catch (e) { next(e); }
});

// Internal: commit reservation (called by order service on payment success)
router.post('/commit/:orderId', internalOnly, async (req, res, next) => {
  try {
    await inventoryService.commitReservation(req.params.orderId);
    sendSuccess(res, null, 'Reservation committed');
  } catch (e) { next(e); }
});

// Internal: release reservation (called by order service on payment failure)
router.post('/release/:orderId', internalOnly, async (req, res, next) => {
  try {
    await inventoryService.releaseReservation(req.params.orderId);
    sendSuccess(res, null, 'Reservation released');
  } catch (e) { next(e); }
});

// Internal: create inventory record for new product
router.post('/', internalOnly, async (req, res, next) => {
  try {
    const inv = await inventoryService.createInventory(req.body);
    sendSuccess(res, inv, 'Inventory record created', 201);
  } catch (e) { next(e); }
});

// Admin: get all inventory
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const lowStockOnly = req.query.lowStockOnly === 'true';
    const { inventory, total } = await inventoryService.getAllInventory({ page, limit, lowStockOnly });
    sendSuccess(res, inventory, 'Inventory retrieved', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

// Admin: get low stock alerts
router.get('/low-stock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const items = await inventoryService.getLowStockItems();
    sendSuccess(res, items);
  } catch (e) { next(e); }
});

// Admin: update stock
router.patch('/product/:productId/stock', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body;
    if (typeof adjustment !== 'number') return next(new Error('adjustment must be a number'));
    const inv = await inventoryService.updateStock(req.params.productId, adjustment, reason, req.user.id);
    sendSuccess(res, inv, 'Stock updated');
  } catch (e) { next(e); }
});

// Admin: cleanup expired reservations (can be called by cron)
router.post('/cleanup-expired', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const count = await inventoryService.cleanupExpiredReservations();
    sendSuccess(res, { releasedCount: count }, `Released ${count} expired reservations`);
  } catch (e) { next(e); }
});

module.exports = router;
