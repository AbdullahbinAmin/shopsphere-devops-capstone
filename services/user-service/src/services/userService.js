/**
 * User Service — User Profile & Address Service
 */

const pool = require('../db/pool');
const { NotFoundError, ConflictError, ValidationError } = require('../../shared/errors');

class UserService {
  /**
   * Create a user profile (called after identity service registration).
   */
  async createProfile(data) {
    const { id, email, firstName, lastName, phone } = data;

    const existing = await pool.query('SELECT id FROM user_profiles WHERE id = $1', [id]);
    if (existing.rows.length > 0) {
      throw new ConflictError('User profile already exists');
    }

    const result = await pool.query(
      `INSERT INTO user_profiles (id, email, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, email, firstName, lastName, phone || null]
    );
    return result.rows[0];
  }

  /**
   * Get a user profile by ID.
   */
  async getProfileById(userId) {
    const result = await pool.query('SELECT * FROM user_profiles WHERE id = $1', [userId]);
    if (result.rows.length === 0) throw new NotFoundError('User profile');
    return result.rows[0];
  }

  /**
   * Get a user profile by email.
   */
  async getProfileByEmail(email) {
    const result = await pool.query('SELECT * FROM user_profiles WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) throw new NotFoundError('User profile');
    return result.rows[0];
  }

  /**
   * Update a user profile.
   */
  async updateProfile(userId, data) {
    const allowed = ['first_name', 'last_name', 'phone', 'avatar_url', 'date_of_birth', 'gender', 'preferences'];
    const updates = [];
    const values = [];
    let idx = 1;

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      phone: 'phone',
      avatarUrl: 'avatar_url',
      dateOfBirth: 'date_of_birth',
      gender: 'gender',
      preferences: 'preferences',
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        updates.push(`${col} = $${idx++}`);
        values.push(data[key]);
      }
    }

    if (updates.length === 0) throw new ValidationError('No valid fields to update');

    values.push(userId);
    const result = await pool.query(
      `UPDATE user_profiles SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) throw new NotFoundError('User profile');
    return result.rows[0];
  }

  /**
   * Get all addresses for a user.
   */
  async getAddresses(userId) {
    const result = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return result.rows;
  }

  /**
   * Add a new address.
   */
  async addAddress(userId, data) {
    const { label, fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault } = data;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // If setting as default, clear existing defaults
      if (isDefault) {
        await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
      }

      const result = await client.query(
        `INSERT INTO user_addresses
           (user_id, label, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [userId, label || 'Home', fullName, phone || null, addressLine1, addressLine2 || null, city, state, postalCode, country || 'United States', isDefault || false]
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
   * Update an address.
   */
  async updateAddress(userId, addressId, data) {
    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    if (check.rows.length === 0) throw new NotFoundError('Address');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (data.isDefault) {
        await client.query('UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
      }

      const { fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, label, isDefault } = data;
      const result = await client.query(
        `UPDATE user_addresses SET
           label = COALESCE($1, label),
           full_name = COALESCE($2, full_name),
           phone = COALESCE($3, phone),
           address_line1 = COALESCE($4, address_line1),
           address_line2 = COALESCE($5, address_line2),
           city = COALESCE($6, city),
           state = COALESCE($7, state),
           postal_code = COALESCE($8, postal_code),
           country = COALESCE($9, country),
           is_default = COALESCE($10, is_default)
         WHERE id = $11 AND user_id = $12
         RETURNING *`,
        [label, fullName, phone, addressLine1, addressLine2, city, state, postalCode, country, isDefault, addressId, userId]
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
   * Delete an address.
   */
  async deleteAddress(userId, addressId) {
    const result = await pool.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING id',
      [addressId, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('Address');
  }

  /**
   * Get all users (admin only).
   */
  async getAllUsers({ page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const searchParam = `%${search}%`;

    const [users, count] = await Promise.all([
      pool.query(
        `SELECT id, email, first_name, last_name, phone, created_at
         FROM user_profiles
         WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchParam, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) FROM user_profiles WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`,
        [searchParam]
      ),
    ]);

    return {
      users: users.rows,
      total: parseInt(count.rows[0].count),
    };
  }
}

module.exports = new UserService();
