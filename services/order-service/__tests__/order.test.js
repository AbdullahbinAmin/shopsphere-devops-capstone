/**
 * Order Service — Unit & Integration Tests
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.PORT = '3096';
process.env.JWT_SECRET = 'test-secret-at-least-64-chars-long-for-testing-purposes-12345678';
process.env.JWT_ISSUER = 'shopsphere-identity';
process.env.JWT_AUDIENCE = 'shopsphere-services';

const { app } = require('../src/server');
const pool = require('../src/db/pool');

function createAuthToken(userId = 'usr-123', role = 'CUSTOMER') {
  return jwt.sign({ sub: userId, email: 'alex@example.com', role }, process.env.JWT_SECRET, {
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiresIn: '1h',
  });
}

describe('Order Service Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return service health', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('order-service');
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/v1/orders');
      expect(res.status).toBe(401);
    });

    it('should return user orders for authenticated requests', async () => {
      const token = createAuthToken();
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // total
        .mockResolvedValueOnce({                           // orders
          rows: [{
            id: 'ord-123',
            order_number: 'SS2026-00001',
            user_id: 'usr-123',
            status: 'CONFIRMED',
            total_amount: '99.99',
            created_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] });              // items for order

      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].order_number).toBe('SS2026-00001');
    });
  });
});
