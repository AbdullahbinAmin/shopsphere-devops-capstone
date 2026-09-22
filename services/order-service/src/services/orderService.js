/**
 * Order Service — Order Orchestration Business Logic
 *
 * The order service orchestrates:
 * 1. Cart validation
 * 2. Inventory reservation
 * 3. Payment initiation
 * 4. Order confirmation
 * 5. Inventory commitment
 * 6. Notification dispatch
 *
 * Implements compensation logic (saga pattern) for failure scenarios.
 */

const axios = require('axios');
const pool = require('../db/pool');
const { NotFoundError, AppError, AuthorizationError, ValidationError } = require('../../shared/errors');
const { createServiceLogger } = require('../../shared/logger');

const logger = createServiceLogger('order-service');

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3007';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

const SHIPPING_RATE = 9.99;
const TAX_RATE = 0.08; // 8%
const FREE_SHIPPING_THRESHOLD = 99.99;

function generateOrderNumber() {
  const date = new Date();
  const prefix = `SS${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}-${random}`;
}

class OrderService {
  /**
   * Create an order from cart items.
   * Full saga: reserve → payment → confirm/rollback.
   */
  async createOrder(userId, orderData) {
    const { items, shippingAddress, billingAddress, notes, paymentMethod, paymentDetails } = orderData;

    if (!items || items.length === 0) {
      throw new ValidationError('Order must contain at least one item');
    }

    // Calculate totals
    const subtotal = items.reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
    const shippingAmount = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_RATE;
    const taxAmount = Math.round(subtotal * TAX_RATE * 100) / 100;
    const totalAmount = Math.round((subtotal + shippingAmount + taxAmount) * 100) / 100;

    // Create order in PENDING state
    const orderNumber = generateOrderNumber();
    const client = await pool.connect();
    let order;
    let reservedProducts = [];

    try {
      await client.query('BEGIN');

      const orderResult = await client.query(
        `INSERT INTO orders (order_number, user_id, status, subtotal, shipping_amount, tax_amount, total_amount, shipping_address, billing_address, notes)
         VALUES ($1,$2,'PENDING',$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [orderNumber, userId, Math.round(subtotal * 100) / 100, shippingAmount, taxAmount, totalAmount,
         JSON.stringify(shippingAddress), JSON.stringify(billingAddress || shippingAddress), notes || null]
      );

      order = orderResult.rows[0];

      // Insert order items
      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, sku, name, price, quantity, subtotal, image_url)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.id, item.productId, item.sku, item.name, item.price, item.quantity,
           Math.round(parseFloat(item.price) * item.quantity * 100) / 100, item.imageUrl || item.image || null]
        );
      }

      // Log initial status
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, note)
         VALUES ($1, NULL, 'PENDING', 'Order created')`,
        [order.id]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    logger.info('Order created', { orderId: order.id, orderNumber, userId, totalAmount });

    // ---- SAGA STEP 1: Reserve inventory ----
    try {
      for (const item of items) {
        await axios.post(
          `${INVENTORY_SERVICE_URL}/api/v1/inventory/reserve`,
          { productId: item.productId, quantity: item.quantity, orderId: order.id },
          { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 5000 }
        );
        reservedProducts.push(item.productId);
      }
      logger.info('Inventory reserved', { orderId: order.id, products: reservedProducts.length });
    } catch (err) {
      // Compensation: release any successful reservations
      await this._releaseInventory(order.id, reservedProducts);
      await this._updateOrderStatus(order.id, 'FAILED', 'Inventory reservation failed', null);
      const message = err.response?.data?.message || 'Product out of stock';
      throw new AppError(message, err.response?.status || 422, 'INSUFFICIENT_STOCK');
    }

    // ---- SAGA STEP 2: Process payment ----
    let payment;
    try {
      const paymentResponse = await axios.post(
        `${PAYMENT_SERVICE_URL}/api/v1/payments`,
        {
          orderId: order.id,
          amount: totalAmount,
          currency: 'USD',
          userId,
          method: paymentMethod || 'CARD',
          details: paymentDetails || {},
        },
        { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 10000 }
      );
      payment = paymentResponse.data.data;
      logger.info('Payment processed', { orderId: order.id, paymentId: payment.id, status: payment.status });
    } catch (err) {
      // Compensation: release inventory
      await this._releaseInventory(order.id, reservedProducts);
      await this._updateOrderStatus(order.id, 'FAILED', 'Payment processing failed', null);
      const message = err.response?.data?.message || 'Payment failed';
      throw new AppError(message, err.response?.status || 422, 'PAYMENT_ERROR');
    }

    // ---- SAGA STEP 3: Handle payment result ----
    if (payment.status === 'SUCCESS' || payment.status === 'AUTHORIZED') {
      // Commit inventory
      try {
        await axios.post(
          `${INVENTORY_SERVICE_URL}/api/v1/inventory/commit/${order.id}`,
          {},
          { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 5000 }
        );
      } catch (err) {
        logger.error('Inventory commit failed — manual intervention required', { orderId: order.id, error: err.message });
        // Don't fail the order — payment was successful; flag for manual review
      }

      // Update order to CONFIRMED
      await this._updateOrderStatus(order.id, 'CONFIRMED', 'Payment confirmed', payment.id, { paymentStatus: payment.status });

      // Send notification (non-blocking)
      this._sendNotification({
        type: 'ORDER_CONFIRMED',
        userId,
        orderId: order.id,
        orderNumber,
        totalAmount,
        items,
      }).catch((err) => logger.warn('Notification failed', { error: err.message }));

      return await this.getOrderById(order.id, userId);
    } else {
      // Payment failed
      await this._releaseInventory(order.id, reservedProducts);
      await this._updateOrderStatus(order.id, 'FAILED', 'Payment failed', payment.id, { paymentStatus: payment.status });

      this._sendNotification({
        type: 'PAYMENT_FAILED',
        userId,
        orderId: order.id,
        orderNumber,
        totalAmount,
      }).catch(() => {});

      throw new AppError('Payment was declined. Please try a different payment method.', 422, 'PAYMENT_DECLINED');
    }
  }

  /**
   * Get order by ID. Users can only view their own orders.
   */
  async getOrderById(orderId, userId, isAdmin = false) {
    const result = await pool.query(
      `SELECT o.*,
              json_agg(oi ORDER BY oi.name) AS items,
              json_agg(osh ORDER BY osh.created_at) AS status_history
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN order_status_history osh ON osh.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orderId]
    );

    if (result.rows.length === 0) throw new NotFoundError('Order');
    const order = result.rows[0];

    if (!isAdmin && order.user_id !== userId) throw new AuthorizationError();
    return order;
  }

  /**
   * Get orders for a user with pagination.
   */
  async getUserOrders(userId, { page = 1, limit = 10, status = null }) {
    const offset = (page - 1) * limit;
    const conditions = ['o.user_id = $1'];
    const values = [userId];
    let idx = 2;

    if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [orders, count] = await Promise.all([
      pool.query(
        `SELECT o.*, json_agg(oi ORDER BY oi.name) AS items
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         ${where}
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM orders o ${where}`, values),
    ]);

    return { orders: orders.rows, total: parseInt(count.rows[0].count) };
  }

  /**
   * Cancel an order. Only PENDING or CONFIRMED orders can be cancelled.
   */
  async cancelOrder(orderId, userId, reason, isAdmin = false) {
    const order = await this.getOrderById(orderId, userId, isAdmin);

    const cancellableStatuses = ['PENDING', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new ValidationError(`Cannot cancel an order with status ${order.status}`);
    }

    // Release inventory if order was confirmed
    if (order.status === 'CONFIRMED') {
      try {
        await axios.post(
          `${INVENTORY_SERVICE_URL}/api/v1/inventory/release/${orderId}`,
          {},
          { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 5000 }
        );
      } catch (err) {
        logger.error('Inventory release failed during cancellation', { orderId, error: err.message });
      }
    }

    await this._updateOrderStatus(orderId, 'CANCELLED', reason || 'Cancelled by user', null);
    await pool.query(
      'UPDATE orders SET cancelled_at = NOW(), cancellation_reason = $1 WHERE id = $2',
      [reason, orderId]
    );

    this._sendNotification({ type: 'ORDER_CANCELLED', userId: order.user_id, orderId, orderNumber: order.order_number }).catch(() => {});

    return await this.getOrderById(orderId, userId, isAdmin);
  }

  /**
   * Update order status (admin).
   */
  async updateOrderStatus(orderId, newStatus, note, adminId) {
    const result = await pool.query('SELECT id, status, user_id FROM orders WHERE id = $1', [orderId]);
    if (result.rows.length === 0) throw new NotFoundError('Order');
    const order = result.rows[0];

    await this._updateOrderStatus(orderId, newStatus, note, null, {}, adminId);

    // Send shipping notification
    if (newStatus === 'SHIPPED') {
      this._sendNotification({ type: 'ORDER_SHIPPED', userId: order.user_id, orderId }).catch(() => {});
    } else if (newStatus === 'DELIVERED') {
      this._sendNotification({ type: 'ORDER_DELIVERED', userId: order.user_id, orderId }).catch(() => {});
    }

    return await this.getOrderById(orderId, order.user_id, true);
  }

  /**
   * Get all orders (admin).
   */
  async getAllOrders({ page = 1, limit = 20, status = null, userId = null }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (status) { conditions.push(`o.status = $${idx++}`); values.push(status); }
    if (userId) { conditions.push(`o.user_id = $${idx++}`); values.push(userId); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [orders, count] = await Promise.all([
      pool.query(
        `SELECT o.*, COUNT(oi.id) AS item_count
         FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         ${where}
         GROUP BY o.id
         ORDER BY o.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM orders o ${where}`, values),
    ]);

    return { orders: orders.rows, total: parseInt(count.rows[0].count) };
  }

  async getOrderStats() {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total_orders,
        SUM(total_amount) AS total_revenue,
        AVG(total_amount) AS avg_order_value,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'PROCESSING') AS processing,
        COUNT(*) FILTER (WHERE status = 'SHIPPED') AS shipped,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
        COUNT(*) FILTER (WHERE status = 'FAILED') AS failed
      FROM orders
    `);
    return result.rows[0];
  }

  // ---- Private helpers ----

  async _updateOrderStatus(orderId, newStatus, note, paymentId, extraUpdates = {}, performedBy = null) {
    const orderResult = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
    const fromStatus = orderResult.rows[0]?.status;

    const updateFields = ['status = $1'];
    const values = [newStatus];
    let idx = 2;

    if (paymentId) { updateFields.push(`payment_id = $${idx++}`); values.push(paymentId); }
    if (extraUpdates.paymentStatus) { updateFields.push(`payment_status = $${idx++}`); values.push(extraUpdates.paymentStatus); }

    values.push(orderId);
    await pool.query(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${idx}`, values);

    await pool.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, note, created_by) VALUES ($1,$2,$3,$4,$5)`,
      [orderId, fromStatus, newStatus, note, performedBy]
    );

    logger.info('Order status updated', { orderId, fromStatus, toStatus: newStatus });
  }

  async _releaseInventory(orderId, productIds) {
    try {
      await axios.post(
        `${INVENTORY_SERVICE_URL}/api/v1/inventory/release/${orderId}`,
        {},
        { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 5000 }
      );
      logger.info('Inventory released for failed order', { orderId });
    } catch (err) {
      logger.error('Failed to release inventory — manual intervention required', { orderId, error: err.message });
    }
  }

  async _sendNotification(data) {
    return axios.post(
      `${NOTIFICATION_SERVICE_URL}/api/v1/notifications/send`,
      data,
      { headers: { 'x-internal-api-key': INTERNAL_API_KEY }, timeout: 5000 }
    );
  }
}

module.exports = new OrderService();
