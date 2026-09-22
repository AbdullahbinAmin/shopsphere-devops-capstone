# 🏛️ ShopSphere System Architecture Specification

## 1. Architectural Philosophy & Principles

ShopSphere is engineered in accordance with modern 12-factor cloud-native enterprise design patterns:

1. **Decoupled Autonomous Services**: Each service owns its domain logic, routes, and business rules without tight in-process coupling.
2. **Database-per-Service**: Services strictly own their data stores. Cross-database foreign keys and queries are explicitly forbidden; cross-domain data is referenced by immutable UUIDs and synchronized via API orchestration.
3. **Stateless Backend Processing**: All application state resides in durable PostgreSQL databases or distributed Redis caches. Any service replica can handle any incoming request.
4. **Standardized Communication Contracts**: All inter-service and external communications utilize predictable JSON REST payloads wrapped in standard response envelopes.
5. **Observability Readiness**: Every request arriving at the API Gateway is tagged with a unique `X-Correlation-ID` header, propagated across internal network hops, and included in Winston structured JSON logs.
6. **Graceful Degradation & Resilience**: Upstream failures are isolated with bounded timeouts and saga rollback compensation to prevent cascading failures.

---

## 2. Component Topology & Service Boundaries

```
                             [ User Browser / Client ]
                                         │
                                         ▼ HTTPS
                            ┌────────────────────────┐
                            │      API Gateway       │  Port: 3000
                            │ (Rate Limit, Routing)  │
                            └────────────┬───────────┘
                                         │
        ┌───────────────┬────────────────┼────────────────┬───────────────┐
        │               │                │                │               │
        ▼               ▼                ▼                ▼               ▼
┌───────────────┐┌───────────────┐┌───────────────┐┌───────────────┐┌───────────────┐
│Identity Svc   ││User Svc       ││Product Svc    ││Inventory Svc  ││Cart Svc       │
│Port: 3001     ││Port: 3002     ││Port: 3003     ││Port: 3004     ││Port: 3005     │
│DB: pg_identity││DB: pg_users   ││DB: pg_product ││DB: pg_invent  ││Store: Redis   │
└───────────────┘└───────────────┘└───────────────┘└───────┬───────┘└───────────────┘
                                                           │
                                                           │ (Internal HTTP)
                                                           ▼
                                                  ┌─────────────────┐
                                                  │Order Service    │
                                                  │Port: 3006       │
                                                  │DB: pg_orders    │
                                                  └────────┬────────┘
                                                           │
                                            ┌──────────────┴──────────────┐
                                            │ (Internal HTTP)             │ (Internal HTTP)
                                            ▼                             ▼
                                   ┌─────────────────┐           ┌─────────────────┐
                                   │Payment Service  │           │Notification Svc │
                                   │Port: 3007       │           │Port: 3008       │
                                   │DB: pg_payments  │           │DB: pg_notif     │
                                   └─────────────────┘           └─────────────────┘
```

---

## 3. Order Checkout Orchestration (Saga Pattern)

When a customer checks out, the **Order Service** acts as the Saga Orchestrator to guarantee consistency across distributed services.

### Successful Checkout Flow:
```
Client             Gateway          Order Svc         Inventory Svc      Payment Svc      Notification Svc
  │                   │                 │                   │                 │                  │
  │─── POST /orders ─►│─── Forward ────►│                   │                 │                  │
  │                   │                 │── 1. Reserve ────►│                 │                  │
  │                   │                 │◄── Reserved OK ───│                 │                  │
  │                   │                 │                                     │                  │
  │                   │                 │── 2. Authorize Payment ────────────►│                  │
  │                   │                 │◄── Payment Confirmed ───────────────│                  │
  │                   │                 │                                                        │
  │                   │                 │── 3. Commit Reservation ─────────►│                  │
  │                   │                 │                                                        │
  │                   │                 │── 4. Dispatch Email Async ────────────────────────────►│
  │                   │                 │                                                        │
  │◄── 201 Created ───│◄── 201 Created ─│                                                        │
```

### Failure & Compensation Flow (e.g. Payment Fails):
```
Client             Order Svc         Inventory Svc          Payment Svc
  │                    │                   │                     │
  │─── POST /orders ──►│                   │                     │
  │                    │── 1. Reserve ────►│                     │
  │                    │◄── Reserved OK ───│                     │
  │                    │                                         │
  │                    │── 2. Authorize ────────────────────────►│
  │                    │◄── 402 Declined / Failed ───────────────│
  │                    │
  │                    │── 3. SAGA ROLLBACK: Release Reserve ───►│
  │                    │◄── Released OK ─────────────────────────│
  │                    │
  │◄── 400/402 Failed ─│ (Order marked CANCELLED/FAILED in DB)
```

---

## 4. Security Architecture & Token Delegation

1. **Authentication**: Identity Service verifies credentials against bcrypt hashes (salt rounds = 10).
2. **Token Issuance**:
   - `accessToken`: Short-lived JWT (15 minutes), payload contains `sub` (User ID), `email`, `role` (`CUSTOMER` or `ADMIN`).
   - `refreshToken`: Cryptographically secure random hex string (7 days), stored hashed in PostgreSQL with single-use rotation.
3. **Verification**: Other services verify JWT using the shared secret (`JWT_SECRET`) or public key without making round-trips to Identity Service.
4. **Inter-Service Communication**: Critical internal service endpoints enforce `X-Internal-API-Key` headers to prevent unauthorized direct invocations.

---

## 5. Health Check & Kubernetes Readiness Design

Every service implements standards-compliant health endpoints compatible with Kubernetes probes:

- **`GET /health`**: Full diagnostic report. Executes live `SELECT 1` against PostgreSQL or `PING` against Redis. Returns HTTP 200 if all dependencies are healthy; HTTP 503 if any dependency is degraded.
- **`GET /health/liveness`**: Returns HTTP 200 immediately if process event loop is active.
- **`GET /health/readiness`**: Confirms database connection pools are initialized and accepting traffic.

```json
{
  "status": "healthy",
  "service": "product-service",
  "version": "1.0.0",
  "uptime": 1420.5,
  "timestamp": "2026-09-21T07:15:00.000Z",
  "checks": [
    {
      "name": "postgres",
      "status": "up",
      "responseTimeMs": 4.2
    }
  ]
}
```

---

## 6. Graceful Shutdown Protocol

All services intercept `SIGTERM` and `SIGINT` signals:
1. Stop accepting new incoming HTTP connections (`server.close()`).
2. Allow active requests a 10-second drain window.
3. Gracefully close PostgreSQL connection pools (`pool.end()`) and Redis connections (`redis.quit()`).
4. Flush Winston log streams.
5. Exit process with code 0.
