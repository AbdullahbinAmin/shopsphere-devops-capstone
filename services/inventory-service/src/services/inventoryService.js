/**
 * Inventory Service — Inventory Service (Business Logic)
 * Handles stock checking, reservation, commitment, and release.
 * Uses database-level locking to prevent race conditions.
 */

const pool = require('../db/pool');
const { NotFoundError, InsufficientStockError, AppError } = require('../../shared/errors');

const RESERVATION_TTL_MINUTES = parseInt(process.env.RESERVATION_TTL_MINUTES) || 15;

class InventoryService {
  /**
   * Get inventory for a product.
   * @param {string} productId
   */
  async getByProductId(productId) {
    const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);
    if (result.rows.length === 0) throw new NotFoundError('Inventory record');
    return result.rows[0];
  }

  /**
   * Get inventory by SKU.
   */
  async getBySku(sku) {
    const result = await pool.query('SELECT * FROM inventory WHERE sku = $1', [sku]);
    if (result.rows.length === 0) throw new NotFoundError('Inventory record');
    return result.rows[0];
  }

  /**
   * Check availability for a product without reserving.
   * @param {string} productId
   * @param {number} quantity
   * @returns {{ available: boolean, quantityAvailable: number }}
   */
  async checkAvailability(productId, quantity) {
    const result = await pool.query(
      'SELECT quantity_available FROM inventory WHERE product_id = $1',
      [productId]
    );
    if (result.rows.length === 0) {
      return { available: false, quantityAvailable: 0, reason: 'Product not in inventory' };
    }
    const available = result.rows[0].quantity_available;
    return {
      available: available >= quantity,
      quantityAvailable: available,
      requested: quantity,
    };
  }

  /**
   * Reserve stock for an order (soft lock).
   * Uses SELECT FOR UPDATE to prevent concurrent over-reservation.
   * @param {string} productId
   * @param {number} quantity
   * @param {string} orderId
   * @returns {object} reservation record
   */
  async reserveStock(productId, quantity, orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock the inventory row
      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      if (inventoryResult.rows.length === 0) {
        throw new NotFoundError('Inventory record');
      }

      const inventory = inventoryResult.rows[0];
      const available = inventory.quantity_in_stock - inventory.quantity_reserved;

      if (available < quantity) {
        throw new InsufficientStockError(productId);
      }

      // Update reserved quantity
      await client.query(
        'UPDATE inventory SET quantity_reserved = quantity_reserved + $1 WHERE id = $2',
        [quantity, inventory.id]
      );

      // Create reservation record
      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
      const reservationResult = await client.query(
        `INSERT INTO inventory_reservations (inventory_id, order_id, quantity, expires_at)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [inventory.id, orderId, quantity, expiresAt]
      );

      // Log movement
      await client.query(
        `INSERT INTO inventory_movements (inventory_id, type, quantity, reference_id, reason, snapshot_before, snapshot_after)
         VALUES ($1,'RESERVATION',$2,$3,'Order reservation',$4,$5)`,
        [
          inventory.id, quantity, orderId,
          JSON.stringify({ in_stock: inventory.quantity_in_stock, reserved: inventory.quantity_reserved }),
          JSON.stringify({ in_stock: inventory.quantity_in_stock, reserved: inventory.quantity_reserved + quantity }),
        ]
      );

      await client.query('COMMIT');
      return reservationResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Commit a reservation (when order payment succeeds).
   * Reduces actual stock and removes reservation.
   */
  async commitReservation(orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find all active reservations for this order
      const reservations = await client.query(
        `SELECT ir.*, i.quantity_in_stock, i.quantity_reserved
         FROM inventory_reservations ir
         JOIN inventory i ON i.id = ir.inventory_id
         WHERE ir.order_id = $1 AND ir.status = 'ACTIVE'
         FOR UPDATE OF i`,
        [orderId]
      );

      for (const res of reservations.rows) {
        // Reduce in_stock and reserved quantities
        await client.query(
          `UPDATE inventory SET
             quantity_in_stock = quantity_in_stock - $1,
             quantity_reserved = quantity_reserved - $1
           WHERE id = $2`,
          [res.quantity, res.inventory_id]
        );

        // Mark reservation as committed
        await client.query(
          "UPDATE inventory_reservations SET status = 'COMMITTED' WHERE id = $1",
          [res.id]
        );

        // Log movement
        await client.query(
          `INSERT INTO inventory_movements (inventory_id, type, quantity, reference_id, reason)
           VALUES ($1,'COMMIT',$2,$3,'Order committed — stock deducted')`,
          [res.inventory_id, -res.quantity, orderId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Release a reservation (when order fails or is cancelled).
   */
  async releaseReservation(orderId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const reservations = await client.query(
        `SELECT ir.* FROM inventory_reservations ir
         WHERE ir.order_id = $1 AND ir.status = 'ACTIVE'`,
        [orderId]
      );

      for (const res of reservations.rows) {
        await client.query(
          'UPDATE inventory SET quantity_reserved = quantity_reserved - $1 WHERE id = $2',
          [res.quantity, res.inventory_id]
        );

        await client.query(
          "UPDATE inventory_reservations SET status = 'RELEASED' WHERE id = $1",
          [res.id]
        );

        await client.query(
          `INSERT INTO inventory_movements (inventory_id, type, quantity, reference_id, reason)
           VALUES ($1,'RELEASE',$2,$3,'Reservation released')`,
          [res.inventory_id, res.quantity, orderId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update stock quantity (admin operation).
   */
  async updateStock(productId, adjustment, reason = 'Manual adjustment', performedBy = null) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const inventoryResult = await client.query(
        'SELECT * FROM inventory WHERE product_id = $1 FOR UPDATE',
        [productId]
      );

      if (inventoryResult.rows.length === 0) throw new NotFoundError('Inventory record');
      const inv = inventoryResult.rows[0];

      const newQty = inv.quantity_in_stock + adjustment;
      if (newQty < 0) throw new AppError('Cannot reduce stock below 0', 422, 'INSUFFICIENT_STOCK');

      const result = await client.query(
        'UPDATE inventory SET quantity_in_stock = $1 WHERE id = $2 RETURNING *',
        [newQty, inv.id]
      );

      await client.query(
        `INSERT INTO inventory_movements (inventory_id, type, quantity, reason, performed_by, snapshot_before, snapshot_after)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          inv.id,
          adjustment > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          adjustment,
          reason,
          performedBy,
          JSON.stringify({ quantity_in_stock: inv.quantity_in_stock }),
          JSON.stringify({ quantity_in_stock: newQty }),
        ]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Create inventory record for a new product.
   */
  async createInventory(data) {
    const { productId, sku, quantityInStock = 0, lowStockThreshold = 10, reorderPoint = 5 } = data;
    const result = await pool.query(
      `INSERT INTO inventory (product_id, sku, quantity_in_stock, low_stock_threshold, reorder_point)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (product_id) DO UPDATE SET sku = EXCLUDED.sku
       RETURNING *`,
      [productId, sku, quantityInStock, lowStockThreshold, reorderPoint]
    );
    return result.rows[0];
  }

  /**
   * Get all inventory with filtering.
   */
  async getAllInventory({ page = 1, limit = 50, lowStockOnly = false }) {
    const offset = (page - 1) * limit;
    const whereClause = lowStockOnly ? 'WHERE quantity_available <= low_stock_threshold' : '';

    const [items, count] = await Promise.all([
      pool.query(
        `SELECT * FROM inventory ${whereClause} ORDER BY sku LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM inventory ${whereClause}`),
    ]);

    return { inventory: items.rows, total: parseInt(count.rows[0].count) };
  }

  /**
   * Get low stock items.
   */
  async getLowStockItems() {
    const result = await pool.query(
      `SELECT * FROM inventory
       WHERE quantity_available <= low_stock_threshold AND is_tracked = TRUE
       ORDER BY quantity_available ASC`
    );
    return result.rows;
  }

  /**
   * Clean up expired reservations.
   */
  async cleanupExpiredReservations() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const expired = await client.query(
        `SELECT ir.* FROM inventory_reservations ir
         WHERE ir.status = 'ACTIVE' AND ir.expires_at < NOW()`
      );

      for (const res of expired.rows) {
        await client.query(
          'UPDATE inventory SET quantity_reserved = quantity_reserved - $1 WHERE id = $2',
          [res.quantity, res.inventory_id]
        );
        await client.query(
          "UPDATE inventory_reservations SET status = 'EXPIRED' WHERE id = $1",
          [res.id]
        );
      }

      await client.query('COMMIT');
      return expired.rows.length;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new InventoryService();
