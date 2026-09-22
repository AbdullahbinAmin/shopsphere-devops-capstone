/**
 * Product Service — Product & Category Service
 * Full business logic for catalog management.
 */

const pool = require('../db/pool');
const { NotFoundError, ConflictError, ValidationError } = require('../../shared/errors');
const { buildPagination } = require('../../shared/response');

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

class ProductService {
  // ==================== CATEGORIES ====================

  async getAllCategories({ includeInactive = false } = {}) {
    const whereClause = includeInactive ? '' : 'WHERE is_active = TRUE';
    const result = await pool.query(
      `SELECT * FROM categories ${whereClause} ORDER BY parent_id NULLS FIRST, sort_order, name`
    );
    return result.rows;
  }

  async getCategoryBySlug(slug) {
    const result = await pool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
    if (result.rows.length === 0) throw new NotFoundError('Category');
    return result.rows[0];
  }

  async getCategoryById(id) {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (result.rows.length === 0) throw new NotFoundError('Category');
    return result.rows[0];
  }

  async createCategory(data) {
    const { name, description, imageUrl, parentId, sortOrder } = data;
    const slug = slugify(name);

    const existing = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) throw new ConflictError(`Category with name "${name}" already exists`);

    const result = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url, parent_id, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, slug, description || null, imageUrl || null, parentId || null, sortOrder || 0]
    );
    return result.rows[0];
  }

  async updateCategory(id, data) {
    const existing = await this.getCategoryById(id);
    const { name, description, imageUrl, parentId, sortOrder, isActive } = data;
    const slug = name ? slugify(name) : existing.slug;

    const result = await pool.query(
      `UPDATE categories SET
         name = COALESCE($1, name),
         slug = $2,
         description = COALESCE($3, description),
         image_url = COALESCE($4, image_url),
         parent_id = COALESCE($5, parent_id),
         sort_order = COALESCE($6, sort_order),
         is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [name, slug, description, imageUrl, parentId, sortOrder, isActive, id]
    );
    return result.rows[0];
  }

  // ==================== PRODUCTS ====================

  async getProducts({ page = 1, limit = 20, search = '', categoryId = null, categorySlug = null, brand = null, minPrice = null, maxPrice = null, sortBy = 'created_at', sortOrder = 'DESC', status = 'ACTIVE', featured = null }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) { conditions.push(`p.status = $${idx++}`); values.push(status); }
    if (categoryId) { conditions.push(`p.category_id = $${idx++}`); values.push(categoryId); }
    if (categorySlug) {
      const cat = await pool.query('SELECT id FROM categories WHERE slug = $1', [categorySlug]);
      if (cat.rows.length > 0) { conditions.push(`p.category_id = $${idx++}`); values.push(cat.rows[0].id); }
    }
    if (brand) { conditions.push(`p.brand ILIKE $${idx++}`); values.push(`%${brand}%`); }
    if (minPrice !== null) { conditions.push(`p.price >= $${idx++}`); values.push(minPrice); }
    if (maxPrice !== null) { conditions.push(`p.price <= $${idx++}`); values.push(maxPrice); }
    if (featured === true) { conditions.push('p.is_featured = TRUE'); }
    if (search) {
      conditions.push(`to_tsvector('english', p.name || ' ' || COALESCE(p.description, '') || ' ' || COALESCE(p.brand, '')) @@ plainto_tsquery('english', $${idx++})`);
      values.push(search);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortFields = { price: 'p.price', name: 'p.name', created_at: 'p.created_at', discount: 'p.discount_percent' };
    const sortField = validSortFields[sortBy] || 'p.created_at';
    const sortDir = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const [products, countResult] = await Promise.all([
      pool.query(
        `SELECT p.*,
                c.name AS category_name, c.slug AS category_slug,
                COALESCE(json_agg(pi ORDER BY pi.sort_order) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         ${whereClause}
         GROUP BY p.id, c.name, c.slug
         ORDER BY ${sortField} ${sortDir}
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM products p ${whereClause}`, values),
    ]);

    return {
      products: products.rows,
      pagination: buildPagination(parseInt(countResult.rows[0].count), page, limit),
    };
  }

  async getProductById(id) {
    const result = await pool.query(
      `SELECT p.*,
              c.name AS category_name, c.slug AS category_slug,
              COALESCE(json_agg(DISTINCT pi) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('id', pr.id, 'user_name', pr.user_name, 'rating', pr.rating, 'title', pr.title, 'body', pr.body, 'created_at', pr.created_at))
                FILTER (WHERE pr.id IS NOT NULL), '[]'
              ) AS reviews,
              ROUND(AVG(pr.rating), 1) AS average_rating,
              COUNT(DISTINCT pr.id) AS review_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, c.name, c.slug`,
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Product');
    return result.rows[0];
  }

  async getProductBySlug(slug) {
    const result = await pool.query(
      `SELECT p.*,
              c.name AS category_name, c.slug AS category_slug,
              COALESCE(json_agg(DISTINCT pi) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images,
              ROUND(AVG(pr.rating), 1) AS average_rating,
              COUNT(DISTINCT pr.id) AS review_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       LEFT JOIN product_reviews pr ON pr.product_id = p.id
       WHERE p.slug = $1
       GROUP BY p.id, c.name, c.slug`,
      [slug]
    );
    if (result.rows.length === 0) throw new NotFoundError('Product');
    return result.rows[0];
  }

  async getProductBySku(sku) {
    const result = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
    if (result.rows.length === 0) throw new NotFoundError('Product');
    return result.rows[0];
  }

  async createProduct(data) {
    const { sku, name, description, shortDescription, categoryId, brand, price, compareAtPrice, discountPercent, status, isFeatured, tags, attributes, weightGrams, metaTitle, metaDescription } = data;

    // Check SKU uniqueness
    const existing = await pool.query('SELECT id FROM products WHERE sku = $1', [sku]);
    if (existing.rows.length > 0) throw new ConflictError(`Product with SKU "${sku}" already exists`);

    const slug = slugify(name) + '-' + Date.now().toString(36);

    const result = await pool.query(
      `INSERT INTO products (sku, name, slug, description, short_description, category_id, brand, price, compare_at_price, discount_percent, status, is_featured, tags, attributes, weight_grams, meta_title, meta_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [sku, name, slug, description || null, shortDescription || null, categoryId || null, brand || null, price, compareAtPrice || null, discountPercent || 0, status || 'DRAFT', isFeatured || false, tags || [], JSON.stringify(attributes || {}), weightGrams || null, metaTitle || null, metaDescription || null]
    );
    return result.rows[0];
  }

  async updateProduct(id, data) {
    // Build dynamic update
    const fieldMap = {
      name: 'name', description: 'description', shortDescription: 'short_description',
      categoryId: 'category_id', brand: 'brand', price: 'price', compareAtPrice: 'compare_at_price',
      discountPercent: 'discount_percent', status: 'status', isFeatured: 'is_featured',
      tags: 'tags', attributes: 'attributes', weightGrams: 'weight_grams',
      metaTitle: 'meta_title', metaDescription: 'meta_description',
    };

    const updates = [];
    const values = [];
    let idx = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${col} = $${idx++}`);
        values.push(key === 'attributes' ? JSON.stringify(data[key]) : data[key]);
      }
    }

    if (updates.length === 0) throw new ValidationError('No valid fields to update');

    values.push(id);
    const result = await pool.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new NotFoundError('Product');
    return result.rows[0];
  }

  async deleteProduct(id) {
    const result = await pool.query(
      "UPDATE products SET status = 'ARCHIVED' WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Product');
  }

  async addProductImage(productId, imageData) {
    const { url, altText, isPrimary, sortOrder } = imageData;
    if (isPrimary) {
      await pool.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [productId]);
    }
    const result = await pool.query(
      `INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [productId, url, altText || null, isPrimary || false, sortOrder || 0]
    );
    return result.rows[0];
  }

  async addReview(productId, reviewData) {
    const { userId, userName, rating, title, body } = reviewData;
    const result = await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, user_name, rating, title, body)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [productId, userId, userName, rating, title || null, body || null]
    );
    return result.rows[0];
  }

  async getFeaturedProducts(limit = 8) {
    const result = await pool.query(
      `SELECT p.*, c.name AS category_name,
              COALESCE(json_agg(pi ORDER BY pi.sort_order) FILTER (WHERE pi.id IS NOT NULL), '[]') AS images
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN product_images pi ON pi.product_id = p.id
       WHERE p.is_featured = TRUE AND p.status = 'ACTIVE'
       GROUP BY p.id, c.name
       ORDER BY p.updated_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getProductStats() {
    const [total, byStatus, byCategory, topBrands] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM products'),
      pool.query(`SELECT status, COUNT(*) AS count FROM products GROUP BY status`),
      pool.query(`SELECT c.name, COUNT(p.id) AS product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id, c.name ORDER BY product_count DESC LIMIT 10`),
      pool.query(`SELECT brand, COUNT(*) AS count FROM products WHERE brand IS NOT NULL GROUP BY brand ORDER BY count DESC LIMIT 10`),
    ]);

    return {
      totalProducts: parseInt(total.rows[0].total),
      byStatus: byStatus.rows,
      byCategory: byCategory.rows,
      topBrands: topBrands.rows,
    };
  }
}

module.exports = new ProductService();
