/**
 * Identity Service — Unit & Integration Tests
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock the database pool before requiring the app
jest.mock('../src/db/pool', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  };
  return mockPool;
});

// Set required env vars before loading app
process.env.JWT_SECRET = 'test-secret-at-least-64-chars-long-for-testing-purposes-12345678';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_ISSUER = 'shopsphere-identity';
process.env.JWT_AUDIENCE = 'shopsphere-services';
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '1'; // Fast for tests

const { app } = require('../src/app');
const pool = require('../src/db/pool');

describe('Identity Service — Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Registration Tests ---
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // email check — not exists
        .mockResolvedValueOnce({            // insert identity
          rows: [{
            id: 'test-uuid',
            email: 'test@example.com',
            role: 'CUSTOMER',
            is_active: true,
            is_verified: false,
            created_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // insert refresh token

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password@123!',
          confirmPassword: 'Password@123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.identity).not.toHaveProperty('password_hash');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password@123!',
          confirmPassword: 'Password@123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          confirmPassword: 'weak',
        });

      expect(res.status).toBe(400);
    });

    it('should reject registration with mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password@123!',
          confirmPassword: 'Different@123!',
        });

      expect(res.status).toBe(400);
    });

    it('should reject duplicate email registration', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }); // email exists

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password@123!',
          confirmPassword: 'Password@123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
    });
  });

  // --- Login Tests ---
  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const passwordHash = await bcrypt.hash('Password@123!', 1);
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            password_hash: passwordHash,
            role: 'CUSTOMER',
            is_active: true,
            is_verified: true,
            failed_login_attempts: 0,
            locked_until: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }) // update last login
        .mockResolvedValueOnce({ rows: [] }); // insert refresh token

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password@123!' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject login with wrong password', async () => {
      const passwordHash = await bcrypt.hash('RealPassword@123!', 1);
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-id',
            email: 'test@example.com',
            password_hash: passwordHash,
            role: 'CUSTOMER',
            is_active: true,
            failed_login_attempts: 0,
            locked_until: null,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // update failed attempts

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword@123!' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject login for non-existent user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Password@123!' });

      expect(res.status).toBe(401);
    });

    it('should reject login for inactive account', async () => {
      const passwordHash = await bcrypt.hash('Password@123!', 1);
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'user-id',
          email: 'test@example.com',
          password_hash: passwordHash,
          role: 'CUSTOMER',
          is_active: false,
          failed_login_attempts: 0,
          locked_until: null,
        }],
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'Password@123!' });

      expect(res.status).toBe(401);
    });
  });

  // --- Health endpoint ---
  describe('GET /health', () => {
    it('should return health status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.service).toBe('identity-service');
    });
  });
});
