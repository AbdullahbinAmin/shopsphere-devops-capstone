/**
 * Inventory Service — Unit & Integration Tests
 */
const request = require('supertest');

jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.PORT = '3094';
process.env.JWT_SECRET = 'test-secret-at-least-64-chars-long-for-testing-purposes-12345678';

const { app } = require('../src/server');
const pool = require('../src/db/pool');

describe('Inventory Service Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should report health check status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('inventory-service');
    });
  });

  describe('GET /api/v1/inventory/check/:productId', () => {
    it('should check if inventory is available', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          product_id: 'prod-123',
          quantity: 50,
          reserved_quantity: 5,
        }],
      });

      const res = await request(app).get('/api/v1/inventory/check/prod-123?quantity=10');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(true);
      expect(res.body.data.availableQuantity).toBe(45);
    });

    it('should report unavailable if requested quantity exceeds stock', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          product_id: 'prod-123',
          quantity: 10,
          reserved_quantity: 8,
        }],
      });

      const res = await request(app).get('/api/v1/inventory/check/prod-123?quantity=5');
      expect(res.status).toBe(200);
      expect(res.body.data.available).toBe(false);
    });
  });
});
