# 🛠️ ShopSphere Troubleshooting & Debugging Playbook

This playbook documents common issues encountered during local development, containerization, and Kubernetes deployments, along with step-by-step remediation procedures.

---

## 1. Port Conflicts

### Symptom:
`Error: listen EADDRINUSE: address already in use :::3000` (or `:::5432`, `:::6379`)

### Cause:
Another service or a previous background process is holding the port.

### Resolution:
- **Windows PowerShell**:
  ```powershell
  # Find PID holding port 3000
  netstat -ano | findstr :3000
  # Terminate process by PID
  Stop-Process -Id <PID> -Force
  ```
- **macOS / Linux**:
  ```bash
  lsof -i :3000
  kill -9 <PID>
  ```

---

## 2. Database Connection Refused (`ECONNREFUSED`)

### Symptom:
`connect ECONNREFUSED 127.0.0.1:5432` or `PostgreSQL healthcheck failed`

### Remediation:
1. Verify the Docker containers are running:
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```
2. Check container logs for initialization failures:
   ```bash
   docker logs shopsphere-db-identity
   ```
3. Test direct PostgreSQL connectivity:
   ```bash
   # From host:
   docker exec -it shopsphere-db-identity pg_isready -U shopsphere_user -d shopsphere_identity
   ```
4. If containers failed due to corrupted data volumes, clean and restart:
   ```bash
   docker compose -f docker-compose.dev.yml down -v
   docker compose -f docker-compose.dev.yml up -d
   npm run seed
   ```

---

## 3. Redis Connection Failures

### Symptom:
`Error: Redis connection to localhost:6379 failed - connect ECONNREFUSED`

### Remediation:
1. Verify Redis is running:
   ```bash
   docker exec -it shopsphere-redis redis-cli ping
   # Expected response: PONG
   ```
2. Verify Redis memory usage:
   ```bash
   docker exec -it shopsphere-redis redis-cli info memory
   ```

---

## 4. Inter-Service Communication Failures (HTTP 500 / 503)

### Symptom:
Order checkout fails with `500 Internal Server Error: Failed to reach Inventory Service`.

### Root Cause Analysis:
1. When running directly on host, services communicate via `http://localhost:PORT`.
2. When running inside Docker or Kubernetes, services must communicate using **container names** or **Kubernetes service names** (e.g. `http://inventory-service:3004`).
3. Ensure `.env` or Kubernetes ConfigMap defines:
   ```env
   INVENTORY_SERVICE_URL=http://inventory-service:3004
   PAYMENT_SERVICE_URL=http://payment-service:3007
   NOTIFICATION_SERVICE_URL=http://notification-service:3008
   ```

---

## 5. Token Expiry & Authentication Loop

### Symptom:
User is repeatedly redirected to `/login` despite logging in.

### Cause:
1. System clock drift between containers or host.
2. Expired access token with missing or invalid `refreshToken` in localStorage.
3. Inconsistent `JWT_SECRET` across services.

### Verification:
Ensure every microservice's `.env` uses the exact same `JWT_SECRET` string. In Kubernetes, mount this secret from a single shared `Secret` resource.

---

## 6. Quick Health Probes CLI Reference

```bash
# Test API Gateway
curl -i http://localhost:3000/health

# Test Individual Services
curl -i http://localhost:3001/health  # Identity
curl -i http://localhost:3003/health  # Product
curl -i http://localhost:3004/health  # Inventory
curl -i http://localhost:3006/health  # Order
```
