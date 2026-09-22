# 📦 ShopSphere — Containerization Readiness Specification

This document provides the exact technical parameters needed by DevOps students to design and build production container images (`Dockerfiles`) and orchestration descriptors (`PodSpecs`, `Deployments`, `docker-compose`).

---

## 1. API Gateway

- **Service**: `api-gateway`
- **Port**: `3000`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3000`
  - `NODE_ENV`: `production`
  - `LOG_LEVEL`: `info`
  - `CORS_ORIGINS`: Allowed browser origins
  - `IDENTITY_SERVICE_URL`, `USER_SERVICE_URL`, `PRODUCT_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `CART_SERVICE_URL`, `ORDER_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`
- **Database dependency**: None
- **Redis dependency**: None
- **Other service dependencies**: Upstream microservices (3001-3008)
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Read-only root filesystem compatible, no persistent disk needed.
- **Expected graceful shutdown behavior**: Catches `SIGTERM` / `SIGINT`, stops accepting connections, drains inflight proxy requests within 30s timeout, exits cleanly.

---

## 2. Identity Service

- **Service**: `identity-service`
- **Port**: `3001`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine` (with `python3`, `make`, `g++` during build stage for bcrypt)
- **Environment variables**:
  - `PORT`: `3001`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
  - `BCRYPT_ROUNDS`: `10` (or `1` for automated testing)
- **Database dependency**: PostgreSQL (`shopsphere_identity`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Read-only compatible, no persistent disk needed.
- **Expected graceful shutdown behavior**: Closes PostgreSQL connection pool, drains active HTTP requests, exits with code 0.

---

## 3. User Service

- **Service**: `user-service`
- **Port**: `3002`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3002`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: PostgreSQL (`shopsphere_users`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Read-only compatible, no persistent disk needed.
- **Expected graceful shutdown behavior**: Drains HTTP pool, closes pg pool cleanly.

---

## 4. Product Service

- **Service**: `product-service`
- **Port**: `3003`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3003`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: PostgreSQL (`shopsphere_products`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Read-only compatible.
- **Expected graceful shutdown behavior**: Closes pg pool and terminates HTTP listeners.

---

## 5. Inventory Service

- **Service**: `inventory-service`
- **Port**: `3004`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3004`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `INTERNAL_API_KEY`: Secret string for inter-service calls
  - `RESERVATION_TTL_MINUTES`: `15`
- **Database dependency**: PostgreSQL (`shopsphere_inventory`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Read-only compatible.
- **Expected graceful shutdown behavior**: Clears interval timer for reservation cleanup, drains connection pool.

---

## 6. Cart Service

- **Service**: `cart-service`
- **Port**: `3005`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3005`
  - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
  - `PRODUCT_SERVICE_URL`, `INVENTORY_SERVICE_URL`
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: None
- **Redis dependency**: Redis 7.x (`shopsphere_cart`)
- **Other service dependencies**: Product Service (3003), Inventory Service (3004)
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Stateless.
- **Expected graceful shutdown behavior**: Closes Redis connection (`redis.quit()`), drains HTTP server.

---

## 7. Order Service

- **Service**: `order-service`
- **Port**: `3006`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3006`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `INTERNAL_API_KEY`: Secret string
  - `INVENTORY_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: PostgreSQL (`shopsphere_orders`)
- **Redis dependency**: None
- **Other service dependencies**: Inventory Service (3004), Payment Service (3007), Notification Service (3008)
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Stateless.
- **Expected graceful shutdown behavior**: Completes active saga database transactions, releases pg client pool, exits 0.

---

## 8. Payment Service

- **Service**: `payment-service`
- **Port**: `3007`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3007`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `INTERNAL_API_KEY`: Secret string
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: PostgreSQL (`shopsphere_payments`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Stateless.
- **Expected graceful shutdown behavior**: Closes pg pool gracefully.

---

## 9. Notification Service

- **Service**: `notification-service`
- **Port**: `3008`
- **Build command**: `npm ci --omit=dev`
- **Start command**: `node src/server.js`
- **Runtime**: `node:20-alpine`
- **Environment variables**:
  - `PORT`: `3008`
  - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`
  - `INTERNAL_API_KEY`: Secret string
  - `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`
- **Database dependency**: PostgreSQL (`shopsphere_notifications`)
- **Redis dependency**: None
- **Other service dependencies**: None
- **Health endpoint**: `GET /health`, `GET /health/liveness`, `GET /health/readiness`
- **Required filesystem**: Stateless.
- **Expected graceful shutdown behavior**: Drains notification event queue and closes database pool.

---

## 10. React Frontend (Vite)

- **Service**: `frontend`
- **Port**: `80` (when served via Nginx in container) or `5173` (Vite dev server)
- **Build command**: `npm ci && npm run build` (outputs to `/dist`)
- **Start command**: `nginx -g 'daemon off;'`
- **Runtime**: Multi-stage: `node:20-alpine` (builder) -> `nginx:1.25-alpine` (runtime)
- **Environment variables**:
  - `VITE_API_BASE_URL`: Base URL of the API Gateway (e.g. `http://api-gateway:3000` or public ingress URL)
- **Database dependency**: None
- **Redis dependency**: None
- **Other service dependencies**: API Gateway (3000)
- **Health endpoint**: `GET /` (HTTP 200 via Nginx index.html)
- **Required filesystem**: Static HTML/CSS/JS served from `/usr/share/nginx/html`.
