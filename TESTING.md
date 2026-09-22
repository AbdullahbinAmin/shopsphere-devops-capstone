# 🧪 ShopSphere Testing Strategy & Quality Assurance Guide

ShopSphere enforces a strict test pyramid to ensure microservice reliability, data consistency, and seamless inter-service contracts.

---

## 1. Test Pyramid Overview

```
              ┌─────────────┐
              │   E2E Flow  │  End-to-End User Scenarios (Postman / Newman)
              └──────┬──────┘
                     │
            ┌────────┴────────┐
            │   Integration   │  Supertest HTTP Contracts & Mock Pools
            └────────┬────────┘
                     │
          ┌──────────┴──────────┐
          │     Unit Tests      │  Pure functions, validators, calculations
          └─────────────────────┘
```

---

## 2. Test Execution Commands

### Run All Microservice Test Suites
```bash
npm test
```

### Run Tests with Coverage Reports
```bash
npm --prefix services/identity-service run test -- --coverage
npm --prefix services/product-service run test -- --coverage
npm --prefix services/inventory-service run test -- --coverage
npm --prefix services/order-service run test -- --coverage
```

### Run E2E Health Verification Across Live Services
```bash
# Automated health check scan across all active microservices
node -e "
const http = require('http');
[3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008].forEach(port => {
  http.get('http://localhost:' + port + '/health', res => {
    console.log('Port ' + port + ' Status: ' + res.statusCode);
  }).on('error', err => console.log('Port ' + port + ' Offline'));
});
"
```

---

## 3. Mocking Strategy

To keep unit and integration tests fast, hermetic, and independent of running databases or external networks:

1. **Database Pools**: Mocked via `jest.mock('../src/db/pool', () => ({ query: jest.fn(), connect: jest.fn(), end: jest.fn() }))`.
2. **Inter-Service Axios Calls**: Mocked using Jest mocks or Axios interceptor mocks to simulate upstream microservice successes and network failures.
3. **Password Hashing**: Bcrypt salt rounds are reduced to `1` in test environments (`process.env.BCRYPT_ROUNDS = '1'`) for high-speed execution.

---

## 4. Key Test Scenarios Covered

| Service | Test Suite | Scenarios Validated |
|---|---|---|
| **Identity Service** | `auth.test.js` | User registration, password complexity validation, duplicate email rejection, login authentication, invalid credential lockout, token issuance, health probe. |
| **Product Service** | `products.test.js` | Catalog pagination, category filtering, product lookup by ID, 404 handling, database health probe. |
| **Inventory Service** | `inventory.test.js` | Real-time stock check, available stock calculation, reservation deduction, out-of-stock boundary conditions. |
| **Order Service** | `order.test.js` | Unauthenticated rejection (401), authenticated order listing, order creation saga orchestration, total amount calculation. |

---

## 5. CI Pipeline Test Integration

In the CI/CD pipeline (GitHub Actions / GitLab CI), tests must execute before container image building:
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm run setup:nix
      - run: npm test
```
Images are only tagged and pushed to the container registry if all tests pass.
