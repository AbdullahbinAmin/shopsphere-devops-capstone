/**
 * Notification Service — Notification Service
 *
 * Email notifications are SIMULATED by default (logged to console/DB).
 * Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to enable real delivery via nodemailer.
 *
 * This design allows DevOps teams to:
 * 1. Configure real SMTP via environment variables
 * 2. Route to external email providers (SendGrid, SES, etc.)
 * 3. Add SMS/push channel providers without code changes
 */

const nodemailer = require('nodemailer');
const pool = require('../db/pool');
const { createServiceLogger } = require('../../shared/logger');

const logger = createServiceLogger('notification-service');

// Email templates
const TEMPLATES = {
  ORDER_CONFIRMED: (data) => ({
    subject: `Order Confirmed — #${data.orderNumber}`,
    body: `
Hi there!

Your order #${data.orderNumber} has been confirmed. 🎉

Order Total: $${data.totalAmount?.toFixed(2) || '—'}
Items: ${data.items?.length || 0} item(s)

Your order is now being processed. You'll receive another email when it ships.

Thank you for shopping with ShopSphere!
    `.trim(),
  }),

  ORDER_SHIPPED: (data) => ({
    subject: `Your Order is On Its Way! — #${data.orderNumber || ''}`,
    body: `Great news! Your order has been shipped and is on its way to you. Tracking information will be available soon.`,
  }),

  ORDER_DELIVERED: (data) => ({
    subject: `Order Delivered — #${data.orderNumber || ''}`,
    body: `Your order has been delivered! We hope you love your purchase. Please consider leaving a review.`,
  }),

  ORDER_CANCELLED: (data) => ({
    subject: `Order Cancelled — #${data.orderNumber || ''}`,
    body: `Your order #${data.orderNumber || ''} has been cancelled. If a payment was made, a refund will be processed within 3-5 business days.`,
  }),

  PAYMENT_FAILED: (data) => ({
    subject: `Payment Failed — Order #${data.orderNumber || ''}`,
    body: `Unfortunately, your payment for order #${data.orderNumber || ''} could not be processed. Please try again with a different payment method.`,
  }),

  ACCOUNT_CREATED: (data) => ({
    subject: 'Welcome to ShopSphere! 🛍️',
    body: `Welcome to ShopSphere! Your account has been created successfully. Start exploring our catalog at http://localhost:5173`,
  }),
};

class NotificationService {
  constructor() {
    this.transporter = this._createTransporter();
    this.isRealEmailEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
  }

  _createTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      logger.info('Email transporter initialized with SMTP', { host: process.env.SMTP_HOST });
      return nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    // Simulation mode — use nodemailer ethereal (or just log)
    logger.info('Notification service running in SIMULATION MODE (no SMTP configured)');
    return null;
  }

  /**
   * Send a notification.
   * Dispatches to appropriate channel handler.
   */
  async send(data) {
    const { type, userId, orderId, orderNumber, ...rest } = data;

    const template = TEMPLATES[type];
    const { subject, body } = template ? template({ orderId, orderNumber, ...rest }) : {
      subject: `Notification: ${type}`,
      body: JSON.stringify(data),
    };

    // Log to database first (guaranteed delivery record)
    const notificationResult = await pool.query(
      `INSERT INTO notifications (user_id, type, channel, subject, body, metadata, status)
       VALUES ($1,$2,'EMAIL',$3,$4,$5,'PENDING')
       RETURNING *`,
      [userId, type, subject, body, JSON.stringify({ orderId, orderNumber, ...rest })]
    );
    const notification = notificationResult.rows[0];

    // Attempt delivery
    let status = 'SIMULATED';
    let error = null;

    if (this.isRealEmailEnabled && data.recipientEmail) {
      try {
        await this.transporter.sendMail({
          from: process.env.EMAIL_FROM || '"ShopSphere" <noreply@shopsphere.com>',
          to: data.recipientEmail,
          subject,
          text: body,
        });
        status = 'SENT';
        logger.info('Email sent', { notificationId: notification.id, type, recipientEmail: data.recipientEmail });
      } catch (err) {
        status = 'FAILED';
        error = err.message;
        logger.error('Email delivery failed', { notificationId: notification.id, error: err.message });
      }
    } else {
      // Simulation: log as if sent
      logger.info(`[SIMULATED EMAIL] Type: ${type} | User: ${userId} | Subject: ${subject}`);
      logger.info(`[SIMULATED EMAIL BODY]\n${body}`);
    }

    // Update status
    await pool.query(
      `UPDATE notifications SET status = $1, error = $2, sent_at = $3 WHERE id = $4`,
      [status, error, status !== 'PENDING' ? new Date() : null, notification.id]
    );

    return { ...notification, status };
  }

  /**
   * Get notifications for a user.
   */
  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [notifications, count] = await Promise.all([
      pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
        [userId, limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]),
    ]);
    return { notifications: notifications.rows, total: parseInt(count.rows[0].count) };
  }

  /**
   * Get all notifications (admin).
   */
  async getAllNotifications({ page = 1, limit = 50, type = null } = {}) {
    const offset = (page - 1) * limit;
    const where = type ? `WHERE type = $3` : '';
    const values = type ? [limit, offset, type] : [limit, offset];

    const [notifications, count] = await Promise.all([
      pool.query(`SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, values),
      pool.query(`SELECT COUNT(*) FROM notifications ${where}`, type ? [type] : []),
    ]);
    return { notifications: notifications.rows, total: parseInt(count.rows[0].count) };
  }
}

module.exports = new NotificationService();
