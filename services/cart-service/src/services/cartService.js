/**
 * Cart Service — Cart Service (Business Logic)
 * Carts are stored in Redis as JSON with a TTL.
 * Cart key format: cart:{userId}
 */

const axios = require('axios');
const redis = require('../redis');
const { NotFoundError, ValidationError, AppError } = require('../../shared/errors');

const CART_TTL_SECONDS = parseInt(process.env.CART_TTL_SECONDS) || 7 * 24 * 3600; // 7 days
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';

class CartService {
  _cartKey(userId) {
    return `cart:${userId}`;
  }

  /**
   * Get a cart. Returns empty cart if not found.
   * @param {string} userId
   */
  async getCart(userId) {
    const data = await redis.get(this._cartKey(userId));
    if (!data) {
      return { userId, items: [], itemCount: 0, subtotal: 0 };
    }
    const cart = JSON.parse(data);
    return this._calculateTotals(cart);
  }

  /**
   * Add item to cart. Fetches product info to validate and store.
   * @param {string} userId
   * @param {{ productId: string, quantity: number }} itemData
   */
  async addItem(userId, itemData) {
    const { productId, quantity = 1 } = itemData;

    if (quantity < 1 || quantity > 99) {
      throw new ValidationError('Quantity must be between 1 and 99');
    }

    // Fetch product info
    let product;
    try {
      const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}`, { timeout: 5000 });
      product = response.data.data;
    } catch (err) {
      if (err.response?.status === 404) throw new NotFoundError('Product');
      throw new AppError('Could not fetch product information. Please try again.', 503, 'SERVICE_UNAVAILABLE');
    }

    if (product.status !== 'ACTIVE') {
      throw new ValidationError('Product is not available for purchase');
    }

    // Get current cart
    const cart = await this._getRawCart(userId);

    // Find existing item
    const existingIndex = cart.items.findIndex((i) => i.productId === productId);
    const existingQty = existingIndex >= 0 ? cart.items[existingIndex].quantity : 0;
    const newQty = existingQty + quantity;

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].price = parseFloat(product.price);
      cart.items[existingIndex].updatedAt = new Date().toISOString();
    } else {
      cart.items.push({
        productId,
        sku: product.sku,
        name: product.name,
        price: parseFloat(product.price),
        compareAtPrice: product.compare_at_price ? parseFloat(product.compare_at_price) : null,
        image: product.images?.[0]?.url || null,
        quantity,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    cart.updatedAt = new Date().toISOString();
    await redis.setex(this._cartKey(userId), CART_TTL_SECONDS, JSON.stringify(cart));
    return this._calculateTotals(cart);
  }

  /**
   * Update quantity for a specific item.
   */
  async updateItemQuantity(userId, productId, quantity) {
    if (quantity < 0 || quantity > 99) throw new ValidationError('Quantity must be between 0 and 99');

    const cart = await this._getRawCart(userId);
    const index = cart.items.findIndex((i) => i.productId === productId);

    if (index === -1) throw new NotFoundError('Cart item');

    if (quantity === 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = quantity;
      cart.items[index].updatedAt = new Date().toISOString();
    }

    cart.updatedAt = new Date().toISOString();
    await redis.setex(this._cartKey(userId), CART_TTL_SECONDS, JSON.stringify(cart));
    return this._calculateTotals(cart);
  }

  /**
   * Remove a specific item from cart.
   */
  async removeItem(userId, productId) {
    const cart = await this._getRawCart(userId);
    const index = cart.items.findIndex((i) => i.productId === productId);
    if (index === -1) throw new NotFoundError('Cart item');

    cart.items.splice(index, 1);
    cart.updatedAt = new Date().toISOString();
    await redis.setex(this._cartKey(userId), CART_TTL_SECONDS, JSON.stringify(cart));
    return this._calculateTotals(cart);
  }

  /**
   * Clear all items from cart.
   */
  async clearCart(userId) {
    await redis.del(this._cartKey(userId));
    return { userId, items: [], itemCount: 0, subtotal: 0 };
  }

  /**
   * Sync cart prices with current product prices (call before checkout).
   */
  async syncPrices(userId) {
    const cart = await this._getRawCart(userId);
    if (cart.items.length === 0) return this._calculateTotals(cart);

    for (const item of cart.items) {
      try {
        const resp = await axios.get(`${PRODUCT_SERVICE_URL}/api/v1/products/${item.productId}`, { timeout: 5000 });
        const product = resp.data.data;
        item.price = parseFloat(product.price);
        item.compareAtPrice = product.compare_at_price ? parseFloat(product.compare_at_price) : null;
        item.name = product.name;
        item.status = product.status;
        item.image = product.images?.[0]?.url || item.image;
      } catch { /* keep existing price if product service is unavailable */ }
    }

    cart.updatedAt = new Date().toISOString();
    await redis.setex(this._cartKey(userId), CART_TTL_SECONDS, JSON.stringify(cart));
    return this._calculateTotals(cart);
  }

  // ---- Private helpers ----

  async _getRawCart(userId) {
    const data = await redis.get(this._cartKey(userId));
    if (!data) return { userId, items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    return JSON.parse(data);
  }

  _calculateTotals(cart) {
    const items = cart.items || [];
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const savings = items.reduce((sum, i) => {
      if (i.compareAtPrice && i.compareAtPrice > i.price) {
        return sum + (i.compareAtPrice - i.price) * i.quantity;
      }
      return sum;
    }, 0);

    return {
      ...cart,
      itemCount,
      subtotal: Math.round(subtotal * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      estimatedTotal: Math.round(subtotal * 100) / 100,
    };
  }
}

module.exports = new CartService();
