/**
 * User Service — Routes
 */

const express = require('express');
const userService = require('../services/userService');
const { sendSuccess, buildPagination } = require('../../shared/response');
const { AuthenticationError, AuthorizationError } = require('../../shared/errors');
const jwt = require('jsonwebtoken');

const router = express.Router();

// JWT auth middleware for user service
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
  } catch { next(new AuthenticationError('Invalid or expired token')); }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) return next(new AuthorizationError());
    next();
  };
}

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await userService.getProfileById(req.user.id);
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/v1/users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await userService.updateProfile(req.user.id, req.body);
    sendSuccess(res, profile, 'Profile updated');
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/v1/users/profile:
 *   post:
 *     summary: Create user profile (called internally after registration)
 *     tags: [Users]
 */
router.post('/profile', async (req, res, next) => {
  try {
    // This endpoint is called by the identity service / API gateway after registration
    // Protected by internal service API key
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return next(new AuthorizationError('Internal endpoint'));
    }
    const profile = await userService.createProfile(req.body);
    sendSuccess(res, profile, 'Profile created', 201);
  } catch (e) { next(e); }
});

// --- Addresses ---
router.get('/addresses', authenticate, async (req, res, next) => {
  try {
    const addresses = await userService.getAddresses(req.user.id);
    sendSuccess(res, addresses);
  } catch (e) { next(e); }
});

router.post('/addresses', authenticate, async (req, res, next) => {
  try {
    const address = await userService.addAddress(req.user.id, req.body);
    sendSuccess(res, address, 'Address added', 201);
  } catch (e) { next(e); }
});

router.put('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const address = await userService.updateAddress(req.user.id, req.params.id, req.body);
    sendSuccess(res, address, 'Address updated');
  } catch (e) { next(e); }
});

router.delete('/addresses/:id', authenticate, async (req, res, next) => {
  try {
    await userService.deleteAddress(req.user.id, req.params.id);
    sendSuccess(res, null, 'Address deleted');
  } catch (e) { next(e); }
});

// --- Public profile lookup by ID (used by other services) ---
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // Users can only view their own profile unless admin
    if (req.params.id !== req.user.id && req.user.role !== 'ADMIN') {
      return next(new AuthorizationError());
    }
    const profile = await userService.getProfileById(req.params.id);
    sendSuccess(res, profile);
  } catch (e) { next(e); }
});

// --- Admin routes ---
router.get('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const search = req.query.search || '';
    const { users, total } = await userService.getAllUsers({ page, limit, search });
    sendSuccess(res, users, 'Users retrieved', 200, buildPagination(total, page, limit));
  } catch (e) { next(e); }
});

module.exports = router;
