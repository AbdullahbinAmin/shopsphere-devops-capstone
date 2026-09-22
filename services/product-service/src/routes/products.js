/**
 * Product Service — Routes
 */

const express = require('express');
const productService = require('../services/productService');
const { sendSuccess } = require('../../shared/response');
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

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), process.env.JWT_SECRET);
      req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    } catch { /* ignore */ }
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new AuthorizationError());
    next();
  };
}

// ---- Categories ----
router.get('/categories', async (req, res, next) => {
  try {
    const categories = await productService.getAllCategories({ includeInactive: req.query.all === 'true' });
    sendSuccess(res, categories);
  } catch (e) { next(e); }
});

router.get('/categories/:slug', async (req, res, next) => {
  try {
    const category = await productService.getCategoryBySlug(req.params.slug);
    sendSuccess(res, category);
  } catch (e) { next(e); }
});

router.post('/categories', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const category = await productService.createCategory(req.body);
    sendSuccess(res, category, 'Category created', 201);
  } catch (e) { next(e); }
});

router.put('/categories/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const category = await productService.updateCategory(req.params.id, req.body);
    sendSuccess(res, category, 'Category updated');
  } catch (e) { next(e); }
});

// ---- Products ----

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: List products with filtering, sorting, and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug
 *       - in: query
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [price, name, created_at, discount] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: featured
 *         schema: { type: boolean }
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { page, limit, search, category, brand, minPrice, maxPrice, sortBy, sortOrder, featured } = req.query;
    const statusFilter = req.user?.role === 'ADMIN' ? req.query.status : 'ACTIVE';

    const result = await productService.getProducts({
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100),
      search: search || '',
      categorySlug: category || null,
      brand: brand || null,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      sortBy: sortBy || 'created_at',
      sortOrder: sortOrder || 'DESC',
      status: statusFilter || 'ACTIVE',
      featured: featured === 'true' ? true : null,
    });

    sendSuccess(res, result.products, 'Products retrieved', 200, result.pagination);
  } catch (e) { next(e); }
});

router.get('/featured', async (req, res, next) => {
  try {
    const products = await productService.getFeaturedProducts(parseInt(req.query.limit) || 8);
    sendSuccess(res, products);
  } catch (e) { next(e); }
});

router.get('/stats', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const stats = await productService.getProductStats();
    sendSuccess(res, stats);
  } catch (e) { next(e); }
});

router.get('/sku/:sku', async (req, res, next) => {
  try {
    const product = await productService.getProductBySku(req.params.sku);
    sendSuccess(res, product);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    sendSuccess(res, product);
  } catch (e) { next(e); }
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    sendSuccess(res, product, 'Product created', 201);
  } catch (e) { next(e); }
});

router.put('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    sendSuccess(res, product, 'Product updated');
  } catch (e) { next(e); }
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    sendSuccess(res, null, 'Product archived');
  } catch (e) { next(e); }
});

router.post('/:id/images', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const image = await productService.addProductImage(req.params.id, req.body);
    sendSuccess(res, image, 'Image added', 201);
  } catch (e) { next(e); }
});

router.post('/:id/reviews', authenticate, async (req, res, next) => {
  try {
    const review = await productService.addReview(req.params.id, {
      ...req.body,
      userId: req.user.id,
    });
    sendSuccess(res, review, 'Review added', 201);
  } catch (e) { next(e); }
});

module.exports = router;
