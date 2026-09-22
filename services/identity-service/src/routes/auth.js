/**
 * Identity Service — Auth Routes
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and token management
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const { authenticate, authorize } = require('../middleware/auth');
const {
  validate,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  updateRoleSchema,
} = require('../validators/authValidators');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 300000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests. Please try again later.' },
  keyGenerator: (req) => req.ip,
});

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new customer account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, confirmPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: customer@example.com
 *               password:
 *                 type: string
 *                 example: "Password@123!"
 *               confirmPassword:
 *                 type: string
 *                 example: "Password@123!"
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 'Account created successfully', 201);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful — returns access and refresh tokens
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({
      ...req.body,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });
    return sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const tokens = await authService.refreshToken(req.body.refreshToken);
    return sendSuccess(res, tokens, 'Token refreshed successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout (revoke refresh token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);
    return sendSuccess(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/validate:
 *   post:
 *     summary: Validate an access token (used internally by other services via API Gateway)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate', authenticate, (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Token is valid');
});

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user identity
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const identity = await authService.getIdentityById(req.user.id);
    return sendSuccess(res, identity, 'Identity retrieved');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change authenticated user's password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req, res, next) => {
  try {
    await authService.changePassword(req.user.id, req.body);
    return sendSuccess(res, null, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
});

// ---- Admin-only routes ----

/**
 * @swagger
 * /api/v1/auth/admin/users/{id}/role:
 *   patch:
 *     summary: Update user role (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/users/:id/role', authenticate, authorize('ADMIN'), validate(updateRoleSchema), async (req, res, next) => {
  try {
    const updated = await authService.updateRole(req.params.id, req.body.role);
    return sendSuccess(res, updated, 'Role updated successfully');
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/auth/admin/users/{id}/status:
 *   patch:
 *     summary: Activate or deactivate an account (admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/admin/users/:id/status', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return next(new Error('isActive must be a boolean'));
    }
    const updated = await authService.setAccountStatus(req.params.id, isActive);
    return sendSuccess(res, updated, `Account ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
