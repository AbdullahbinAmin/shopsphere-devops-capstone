# 🐳 Dockerfile Engineering Requirements & Student Specifications

> **Notice for DevOps Students**:  
> In accordance with course guidelines, **no production Dockerfiles are pre-packaged in this repository**.  
> You are required to author, optimize, security-harden, and maintain the Dockerfiles for each of the 9 backend microservices and the React frontend.

---

## 1. Universal Containerization Requirements

Every Dockerfile you produce must satisfy the following enterprise standards:

### A. Multi-Stage Build Architecture
- **Stage 1 (Builder)**: Install package dependencies, compile native addons (if applicable, e.g. for `bcrypt` in Identity Service), and run build steps.
- **Stage 2 (Runtime)**: Copy ONLY production artifacts (`node_modules`, `src`, `shared`, `package.json`). Do NOT include compilers, development dependencies, or source repository files in the final image.

### B. Security & Least Privilege
- **Non-Root Execution**: Under no circumstances should containers run as `root`. You must switch to `USER node` (UID 1000) or create an unprivileged service user.
- **Minimal Attack Surface**: Use `node:20-alpine` or Google Distroless base images. Do not use full Debian/Ubuntu images (`node:20`).
- **No In-Image Secrets**: Never burn environment variables, API keys, or JWT secrets into image layers via `ENV` or `ARG`.

### C. Layer Caching & Build Performance
- Copy `package.json` and `package-lock.json` before copying application source code.
- Run `npm ci --omit=dev` to ensure reproducible builds from lockfiles.
- Structure Dockerfile instructions from least frequently changed to most frequently changed.

### D. Process Management & Signal Handling
- Node.js running as PID 1 does not forward POSIX signals (`SIGTERM`, `SIGINT`) properly by default.
- You must incorporate `dumb-init` or Tini to ensure clean container shutdown and Kubernetes pod termination within the termination grace period.

### E. Container Healthchecks
- Every container must include an active `HEALTHCHECK` instruction querying the service's `/health/liveness` endpoint (e.g. using `wget --no-verbose --tries=1 --spider` on Alpine).

### F. `.dockerignore` Files
- Every service folder must include a `.dockerignore` excluding:
  - `node_modules`
  - `npm-debug.log*`
  - `.env*`
  - `coverage`
  - `.git`
  - `dist` (for frontend before build)

---

## 2. Per-Service Requirements Matrix

| Service | Base Image | Build Steps | Runtime Command | Exposed Port | Health Probe URL |
|---|---|---|---|---|---|
| **API Gateway** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3000` | `http://localhost:3000/health/liveness` |
| **Identity Service** | `node:20-alpine` | `apk add python3 make g++`, `npm ci --omit=dev` | `node src/server.js` | `3001` | `http://localhost:3001/health/liveness` |
| **User Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3002` | `http://localhost:3002/health/liveness` |
| **Product Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3003` | `http://localhost:3003/health/liveness` |
| **Inventory Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3004` | `http://localhost:3004/health/liveness` |
| **Cart Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3005` | `http://localhost:3005/health/liveness` |
| **Order Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3006` | `http://localhost:3006/health/liveness` |
| **Payment Service** | `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3007` | `http://localhost:3007/health/liveness` |
| **Notification Service**| `node:20-alpine` | `npm ci --omit=dev` | `node src/server.js` | `3008` | `http://localhost:3008/health/liveness` |
| **Frontend UI** | `nginx:1.25-alpine` | `npm ci`, `npm run build` | `nginx -g 'daemon off;'` | `80` | `http://localhost:80/` |

---

## 3. Image Optimization Goals

- **Target Size**:
  - Node.js backend microservices: `< 180 MB` uncompressed.
  - Frontend Nginx container: `< 35 MB` uncompressed.
- **Security Scan**:
  - Must pass `trivy image --severity HIGH,CRITICAL` with zero unpatched vulnerabilities.
