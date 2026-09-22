# 💻 ShopSphere Local Development Guide

This guide covers running, testing, and debugging ShopSphere directly on a local workstation.

---

## 1. System Requirements

- **Node.js**: `v20.x` LTS
- **Docker Desktop** (or Docker Engine + Compose plugin)
- **Git**
- **PowerShell** (Windows) or **Bash** (macOS/Linux)

---

## 2. Infrastructure Setup (Databases & Redis)

Start the developer dependency containers:
```bash
# Start all 7 PostgreSQL databases and Redis
docker compose -f docker-compose.dev.yml up -d

# Verify all containers are healthy
docker compose -f docker-compose.dev.yml ps
```

To stop containers:
```bash
docker compose -f docker-compose.dev.yml down
```

To reset databases completely:
```bash
docker compose -f docker-compose.dev.yml down -v
```

---

## 3. Environment Variables Reference

Each service contains a `.env.example` in its directory. Key shared variables:

| Variable | Default Value | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime mode (`development`, `test`, `production`) |
| `PORT` | See port matrix | Port number the service binds to |
| `DB_HOST` | `localhost` | Hostname for PostgreSQL instance |
| `DB_USER` | `shopsphere_user` | Database username |
| `DB_PASSWORD` | `devpassword123` | Database password |
| `REDIS_HOST` | `localhost` | Redis host (used by Cart Service) |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | 64+ char string | Shared secret for signing/verifying JWTs |
| `INTERNAL_API_KEY` | `dev-internal-key-999` | Secret header for internal inter-service calls |

---

## 4. Running Migrations & Seeding

```bash
# Run master seed script to populate categories, products, inventory, and users
node scripts/seed/index.js
```

---

## 5. Starting Services Locally

### Automated Startup
- **Windows**:
  ```powershell
  npm run start:win
  ```
- **macOS / Linux**:
  ```bash
  npm run start:nix
  ```

### Manual Individual Startup
To debug an individual service (e.g., `product-service`):
```bash
cd services/product-service
npm install
npm run dev
```

To run the frontend:
```bash
cd frontend
npm install
npm run dev
```
Storefront URL: `http://localhost:5173`  
API Gateway URL: `http://localhost:3000`

---

## 6. Running Test Suites

Run all automated unit & integration test suites:
```bash
npm test
```

Or run tests in a specific service:
```bash
cd services/identity-service && npm test
cd services/product-service && npm test
cd services/inventory-service && npm test
cd services/order-service && npm test
```
