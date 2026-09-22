# 🔒 ShopSphere Security Requirements & Hardening Standards

## 1. Secrets Management Policy

- **Zero Plain-Text Secrets in Git**: No credentials, database passwords, or JWT keys may be committed to source control.
- **Environment Ingestion**: Secrets must be injected at runtime via Kubernetes Secrets, AWS Secrets Manager, or HashiCorp Vault.
- **Rotation Readiness**:
  - `JWT_SECRET`: Minimum 64 characters; supports rotation windows.
  - Database Passwords: Must be rotateable without service redeployment via connection pool recycling.

---

## 2. Authentication & Authorization Policies

- **Algorithm**: HMAC-SHA256 (HS256) or RSA Signature (RS256).
- **Access Tokens**: Short-lived (15 minutes expiry) containing minimal claims (`sub`, `email`, `role`).
- **Refresh Tokens**: Cryptographically random (64 hex characters), stored hashed in PostgreSQL with single-use rotation. If a revoked token is reused, all tokens for that user session are invalidated immediately.
- **Role-Based Access Control (RBAC)**:
  - `CUSTOMER`: Permitted to manage personal cart, own orders, own addresses, and submit reviews.
  - `ADMIN`: Permitted to inspect all orders, create/update catalog merchandise, adjust inventory counts, and view platform metrics.
- **Inter-Service Protection**: Direct invocations between internal services require the `X-Internal-API-Key` header.

---

## 3. OWASP Top 10 Mitigations Implemented

| Threat | Application Mitigation | DevOps Obligation |
|---|---|---|
| **Injection (SQLi)** | Parameterized queries via `pg` connection pool. | Database user least privilege (no `SUPERUSER`). |
| **Broken Authentication** | Bcrypt hashing (10 rounds), lockout after failed logins, refresh token rotation. | Enforce HTTPS/TLS everywhere; secure cookies. |
| **Sensitive Data Exposure** | Password hashes excluded from API responses; CVV and full card numbers never stored in DB. | Encrypt persistent volumes at rest; isolate database networks. |
| **Security Misconfiguration** | Helmet.js enabled (CSP, HSTS, X-Frame-Options); CORS restricted. | Disable default ports; remove default container shell access. |
| **Vulnerable Components** | Automated dependency audits (`npm audit`). | Container image vulnerability scanning (Trivy) in CI pipeline. |
| **Denial of Service** | Express rate-limiting middleware enabled at API Gateway. | Kubernetes resource requests & limits; Ingress rate limiting. |

---

## 4. Container Security Standards

- **Non-Root Execution**: Every Docker container must run as an unprivileged user (`USER node` or custom UID > 1000).
- **Read-Only Root Filesystem**: Where possible, containers should mount their root filesystem as read-only, using `tmpfs` for temporary files.
- **Minimal Base Images**: Use `node:20-alpine` or Google Distroless to eliminate unnecessary system binaries (e.g. `curl`, `wget`, `netcat`).
- **Drop Linux Capabilities**: Drop all default capabilities and only add `NET_BIND_SERVICE` if binding to ports < 1024.
