/**
 * Product Service — Unit & Integration Tests
 */
const request = require('supertest');

// Mock pool
jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.PORT = '3093';
process.env.JWT_SECRET = 'test-secret-at-least-64-chars-long-for-testing-purposes-12345678';

const { app } = require('../src/server');
const pool = require('../src/db/pool');

describe('Product Service Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.service).toBe('product-service');
    });
  });

  describe('GET /api/v1/products', () => {
    it('should return paginated products', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // total count
        .mockResolvedValueOnce({                           // products rows
          rows: [{
            id: 'prod-123',
            name: 'Noise Cancelling Headphones',
            slug: 'noise-cancelling-headphones',
            price: '299.99',
            category_id: 'cat-1',
            is_active: true,
          }],
        });

      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Noise Cancelling Headphones');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return 404 if product does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      const res = await request(app).get('/api/v1/products/non-existent-id');
      expect(res.status).toBe(404);
    });

    it('should return product details when found', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'prod-123',
          name: 'Noise Cancelling Headphones',
          price: '299.99',
          is_active: true,
        }],
      });
      const res = await request(app).get('/api/v1/products/prod-123');
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Noise Cancelling Headphones');
    });
  });
});
