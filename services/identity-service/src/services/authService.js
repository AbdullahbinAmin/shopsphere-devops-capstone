/**
 * Identity Service — Auth Service
 * Core business logic for authentication operations.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  AppError,
} = require('../../shared/errors');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || 'shopsphere-identity';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'shopsphere-services';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

class AuthService {
  /**
   * Register a new user.
   * @param {{ email: string, password: string, role?: string }} data
   * @returns {{ identity: object, accessToken: string, refreshToken: string }}
   */
  async register(data) {
    const { email, password, role = 'CUSTOMER' } = data;

    // Check for existing email
    const existing = await pool.query('SELECT id FROM identities WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO identities (id, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, role, is_active, is_verified, created_at`,
      [id, email.toLowerCase(), passwordHash, role]
    );

    const identity = result.rows[0];
    const tokens = await this._generateTokens(identity);

    return { identity: this._sanitize(identity), ...tokens };
  }

  /**
   * Login with email and password.
   * @param {{ email: string, password: string, userAgent?: string, ipAddress?: string }} data
   * @returns {{ identity: object, accessToken: string, refreshToken: string }}
   */
  async login(data) {
    const { email, password, userAgent, ipAddress } = data;

    const result = await pool.query(
      `SELECT id, email, password_hash, role, is_active, is_verified,
              failed_login_attempts, locked_until, last_login_at
       FROM identities WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Avoid timing attacks — still hash even on miss
      await bcrypt.hash('dummy-password', 10);
      throw new AuthenticationError('Invalid email or password');
    }

    const identity = result.rows[0];

    // Check account lock
    if (identity.locked_until && new Date(identity.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(identity.locked_until) - new Date()) / 60000);
      throw new AuthenticationError(`Account temporarily locked. Try again in ${remaining} minutes.`);
    }

    // Check active status
    if (!identity.is_active) {
      throw new AuthenticationError('Account is deactivated. Please contact support.');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, identity.password_hash);
    if (!passwordMatch) {
      await this._handleFailedLogin(identity.id, identity.failed_login_attempts);
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset failed attempts and update last login
    await pool.query(
      `UPDATE identities SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW()
       WHERE id = $1`,
      [identity.id]
    );

    const tokens = await this._generateTokens(identity, userAgent, ipAddress);
    return { identity: this._sanitize(identity), ...tokens };
  }

  /**
   * Refresh an access token using a refresh token.
   * @param {string} refreshToken
   * @returns {{ accessToken: string, refreshToken: string }}
   */
  async refreshToken(refreshToken) {
    const tokenHash = this._hashToken(refreshToken);

    const result = await pool.query(
      `SELECT rt.id, rt.identity_id, rt.expires_at, rt.revoked,
              i.email, i.role, i.is_active
       FROM refresh_tokens rt
       JOIN identities i ON i.id = rt.identity_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const tokenRecord = result.rows[0];

    if (tokenRecord.revoked) {
      // Token reuse detected — revoke all tokens for this user (security measure)
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE identity_id = $1', [tokenRecord.identity_id]);
      throw new AuthenticationError('Token reuse detected. Please log in again.');
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      throw new AuthenticationError('Refresh token expired. Please log in again.');
    }

    if (!tokenRecord.is_active) {
      throw new AuthenticationError('Account is deactivated.');
    }

    // Rotate refresh token — revoke old, issue new
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE id = $1', [tokenRecord.id]);

    const identity = { id: tokenRecord.identity_id, email: tokenRecord.email, role: tokenRecord.role };
    return this._generateTokens(identity);
  }

  /**
   * Logout — revokes a specific refresh token.
   * @param {string} refreshToken
   */
  async logout(refreshToken) {
    const tokenHash = this._hashToken(refreshToken);
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token_hash = $1',
      [tokenHash]
    );
  }

  /**
   * Logout all sessions — revokes all refresh tokens for an identity.
   * @param {string} identityId
   */
  async logoutAll(identityId) {
    await pool.query(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE identity_id = $1 AND revoked = FALSE',
      [identityId]
    );
  }

  /**
   * Validate an access token and return the decoded payload.
   * @param {string} token
   * @returns {{ id: string, email: string, role: string }}
   */
  validateAccessToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      return { id: decoded.sub, email: decoded.email, role: decoded.role };
    } catch (err) {
      throw new AuthenticationError('Invalid or expired access token');
    }
  }

  /**
   * Get identity by ID.
   * @param {string} id
   */
  async getIdentityById(id) {
    const result = await pool.query(
      'SELECT id, email, role, is_active, is_verified, last_login_at, created_at FROM identities WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) throw new NotFoundError('Identity');
    return result.rows[0];
  }

  /**
   * Change password for an authenticated user.
   * @param {string} identityId
   * @param {{ currentPassword: string, newPassword: string }} data
   */
  async changePassword(identityId, data) {
    const { currentPassword, newPassword } = data;

    const result = await pool.query('SELECT id, password_hash FROM identities WHERE id = $1', [identityId]);
    if (result.rows.length === 0) throw new NotFoundError('Identity');

    const identity = result.rows[0];
    const isValid = await bcrypt.compare(currentPassword, identity.password_hash);
    if (!isValid) throw new ValidationError('Current password is incorrect');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE identities SET password_hash = $1 WHERE id = $2', [newHash, identityId]);

    // Revoke all existing refresh tokens for security
    await this.logoutAll(identityId);
  }

  /**
   * Update user role (admin operation).
   * @param {string} identityId
   * @param {string} newRole
   */
  async updateRole(identityId, newRole) {
    const validRoles = ['CUSTOMER', 'ADMIN', 'MODERATOR'];
    if (!validRoles.includes(newRole)) {
      throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const result = await pool.query(
      'UPDATE identities SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [newRole, identityId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Identity');
    return result.rows[0];
  }

  /**
   * Toggle account active status (admin operation).
   * @param {string} identityId
   * @param {boolean} isActive
   */
  async setAccountStatus(identityId, isActive) {
    const result = await pool.query(
      'UPDATE identities SET is_active = $1 WHERE id = $2 RETURNING id, email, is_active',
      [isActive, identityId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Identity');
    if (!isActive) await this.logoutAll(identityId);
    return result.rows[0];
  }

  // ---- Private helpers ----

  async _generateTokens(identity, userAgent = null, ipAddress = null) {
    const accessToken = jwt.sign(
      { email: identity.email, role: identity.role },
      JWT_SECRET,
      {
        subject: identity.id,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        expiresIn: JWT_ACCESS_EXPIRES_IN,
      }
    );

    // Generate opaque refresh token, store hash
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this._hashToken(refreshToken);

    // Parse refresh expiry
    const expiresAt = new Date();
    const days = parseInt(JWT_REFRESH_EXPIRES_IN) || 7;
    expiresAt.setDate(expiresAt.getDate() + days);

    await pool.query(
      `INSERT INTO refresh_tokens (identity_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [identity.id, tokenHash, expiresAt, userAgent, ipAddress]
    );

    return { accessToken, refreshToken };
  }

  async _handleFailedLogin(identityId, currentAttempts) {
    const newAttempts = currentAttempts + 1;
    let lockedUntil = null;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }

    await pool.query(
      'UPDATE identities SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
      [newAttempts, lockedUntil, identityId]
    );
  }

  _hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  _sanitize(identity) {
    const { password_hash, ...safe } = identity;
    return safe;
  }
}

module.exports = new AuthService();
