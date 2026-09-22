/**
 * Payment Service — Simulated Payment Processor
 *
 * This is a realistic SIMULATION of a payment gateway.
 * It is designed so a real payment provider (Stripe, PayPal, etc.)
 * could replace the simulation logic without changing the API contract.
 *
 * Simulation behavior:
 * - Cards starting with 4111 → Always succeed
 * - Cards starting with 4000 → Always fail
 * - Other cards → Random success/failure (90% success rate for realism)
 * - PAYMENT_SUCCESS_RATE env var controls simulated success rate (0.0 to 1.0)
 */

const crypto = require('crypto');
const pool = require('../db/pool');
const { NotFoundError, PaymentError, AppError } = require('../../shared/errors');
const { createServiceLogger } = require('../../shared/logger');

const logger = createServiceLogger('payment-service');
const SUCCESS_RATE = parseFloat(process.env.PAYMENT_SUCCESS_RATE) || 0.9;
const PROCESSING_DELAY_MS = parseInt(process.env.PAYMENT_PROCESSING_DELAY_MS) || 800;

function generateTransactionId() {
  return `TXN-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function maskCardNumber(cardNumber) {
  if (!cardNumber) return null;
  const clean = String(cardNumber).replace(/\s/g, '');
  return `****-****-****-${clean.slice(-4)}`;
}

class PaymentService {
  /**
   * Process a payment.
   * This is the main entry point — simulates the full payment lifecycle.
   */
  async processPayment(data) {
    const { orderId, amount, currency = 'USD', userId, method = 'CARD', details = {} } = data;

    // Check for duplicate payment attempt
    const existing = await pool.query('SELECT id, status FROM payments WHERE order_id = $1', [orderId]);
    if (existing.rows.length > 0) {
      const existingPayment = existing.rows[0];
      if (existingPayment.status === 'SUCCESS') {
        throw new AppError('Payment already processed for this order', 409, 'DUPLICATE_PAYMENT');
      }
      // Allow retry for failed payments
    }

    const transactionId = generateTransactionId();
    const maskedDetails = this._maskPaymentDetails(method, details);

    // Create PENDING payment record
    const paymentResult = await pool.query(
      `INSERT INTO payments (order_id, user_id, transaction_id, amount, currency, method, status, payment_details)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING',$7)
       ON CONFLICT (order_id) DO UPDATE SET
         transaction_id = EXCLUDED.transaction_id,
         status = 'PENDING',
         updated_at = NOW()
       RETURNING *`,
      [orderId, userId, transactionId, amount, currency, method, JSON.stringify(maskedDetails)]
    );
    const payment = paymentResult.rows[0];

    logger.info('Payment processing started', { paymentId: payment.id, orderId, amount, method });

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAY_MS));

    // Simulate payment decision
    const success = this._simulatePaymentDecision(method, details);

    if (success) {
      const updated = await pool.query(
        `UPDATE payments SET
           status = 'SUCCESS',
           authorized_at = NOW(),
           captured_at = NOW(),
           gateway_response = $1
         WHERE id = $2 RETURNING *`,
        [
          JSON.stringify({
            gateway: 'ShopSphere Simulated Gateway v1',
            code: 'PAYMENT_AUTHORIZED',
            authCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
            timestamp: new Date().toISOString(),
          }),
          payment.id,
        ]
      );
      logger.info('Payment successful', { paymentId: payment.id, transactionId, amount });
      return updated.rows[0];
    } else {
      const failureReasons = [
        'Card declined by issuing bank',
        'Insufficient funds',
        'Card number verification failed',
        'Transaction limit exceeded',
        'Suspected fraud — contact your bank',
      ];
      const reason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      const updated = await pool.query(
        `UPDATE payments SET
           status = 'FAILED',
           failed_at = NOW(),
           failure_reason = $1,
           gateway_response = $2
         WHERE id = $3 RETURNING *`,
        [
          reason,
          JSON.stringify({
            gateway: 'ShopSphere Simulated Gateway v1',
            code: 'PAYMENT_DECLINED',
            reason,
            timestamp: new Date().toISOString(),
          }),
          payment.id,
        ]
      );
      logger.warn('Payment failed', { paymentId: payment.id, reason });
      return updated.rows[0];
    }
  }

  /**
   * Get payment by order ID.
   */
  async getPaymentByOrderId(orderId) {
    const result = await pool.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    if (result.rows.length === 0) throw new NotFoundError('Payment');
    return result.rows[0];
  }

  /**
   * Get payment by ID.
   */
  async getPaymentById(paymentId) {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    if (result.rows.length === 0) throw new NotFoundError('Payment');
    return result.rows[0];
  }

  /**
   * Get payment history for a user.
   */
  async getUserPayments(userId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const [payments, count] = await Promise.all([
      pool.query(
        'SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM payments WHERE user_id = $1', [userId]),
    ]);
    return { payments: payments.rows, total: parseInt(count.rows[0].count) };
  }

  /**
   * Process a refund.
   */
  async processRefund(paymentId, amount, reason, processedBy) {
    const payment = await this.getPaymentById(paymentId);

    if (payment.status !== 'SUCCESS') {
      throw new PaymentError('Can only refund successful payments');
    }

    if (amount > parseFloat(payment.amount)) {
      throw new PaymentError('Refund amount cannot exceed original payment amount');
    }

    const refundAmount = amount || parseFloat(payment.amount);
    const isFullRefund = refundAmount >= parseFloat(payment.amount);

    await pool.query(
      `UPDATE payments SET
         status = $1,
         refunded_at = NOW(),
         refund_amount = $2,
         refund_reason = $3
       WHERE id = $4`,
      [isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED', refundAmount, reason, paymentId]
    );

    await pool.query(
      `INSERT INTO refunds (payment_id, amount, reason, status, processed_by) VALUES ($1,$2,$3,'APPROVED',$4)`,
      [paymentId, refundAmount, reason, processedBy]
    );

    logger.info('Refund processed', { paymentId, refundAmount, isFullRefund });
    return await this.getPaymentById(paymentId);
  }

  async getPaymentStats() {
    const result = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(amount) FILTER (WHERE status = 'SUCCESS') AS total_revenue,
        COUNT(*) FILTER (WHERE status = 'SUCCESS') AS successful,
        COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
        COUNT(*) FILTER (WHERE status IN ('REFUNDED','PARTIALLY_REFUNDED')) AS refunded,
        ROUND(COUNT(*) FILTER (WHERE status = 'SUCCESS')::numeric / NULLIF(COUNT(*), 0) * 100, 2) AS success_rate
      FROM payments
    `);
    return result.rows[0];
  }

  // ---- Private helpers ----

  _simulatePaymentDecision(method, details) {
    const cardNumber = String(details.cardNumber || '').replace(/\s/g, '');

    // Test card rules
    if (cardNumber.startsWith('4111')) return true;   // Always succeed
    if (cardNumber.startsWith('4000')) return false;  // Always fail

    // Random success based on configured rate
    return Math.random() < SUCCESS_RATE;
  }

  _maskPaymentDetails(method, details) {
    if (method === 'CARD') {
      return {
        method: 'CARD',
        lastFour: String(details.cardNumber || '').replace(/\s/g, '').slice(-4) || null,
        maskedCard: maskCardNumber(details.cardNumber),
        cardholderName: details.cardholderName || null,
        expiryMonth: details.expiryMonth || null,
        expiryYear: details.expiryYear || null,
        brand: this._detectCardBrand(details.cardNumber),
      };
    }
    if (method === 'PAYPAL') {
      return { method: 'PAYPAL', email: details.email ? `${details.email.substring(0, 3)}***` : null };
    }
    return { method };
  }

  _detectCardBrand(cardNumber) {
    const num = String(cardNumber || '').replace(/\s/g, '');
    if (/^4/.test(num)) return 'VISA';
    if (/^5[1-5]/.test(num)) return 'MASTERCARD';
    if (/^3[47]/.test(num)) return 'AMEX';
    if (/^6(?:011|5)/.test(num)) return 'DISCOVER';
    return 'UNKNOWN';
  }
}

module.exports = new PaymentService();
