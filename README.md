# 🛍️ ShopSphere — Enterprise E-Commerce Microservices Platform

> **DevOps Capstone Project — Production-Ready Enterprise Application Codebase**  
> *Developed by the Application Development Team for DevOps Lifecycle Engineering.*

---

## 📖 Executive Summary

**ShopSphere** is a high-availability, cloud-native microservices e-commerce application designed to emulate enterprise software standards (such as Amazon, Shopify, or ASOS). 

The software development team has implemented all functional business layers:
- **Distributed Microservices Architecture** (9 decoupled backend services + API gateway)
- **Database-per-Service Pattern** (PostgreSQL databases with relational integrity + Redis caching)
- **JWT & Role-Based Access Control (RBAC)** (Customer & Admin permissions, refresh token rotation)
- **Saga Orchestration & Compensation Logic** (Inventory reservation, payments, order confirmation)
- **Production-Grade Frontend** (React 18 + Vite, custom glassmorphism design system, customer storefront + admin portal)
- **Observability Readiness** (Winston structured JSON logging, correlation IDs, Kubernetes health/readiness probes)

The **DevOps engineering team / students** receive this repository to design, containerize, orchestrate, automate (CI/CD), secure, and monitor the entire production lifecycle.

---

## 🏗️ Architecture Matrix

```
                                  ┌────────────────────────┐
                                  │   React 18 Frontend    │
                                  │ (Customer + Admin UI)  │
                                  │       Port: 5173       │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON
                                              ▼
                                  ┌────────────────────────┐
                                  │   API Gateway Proxy    │
                                  │       Port: 3000       │
                                  └───────────┬────────────┘
         ┌───────────────┬────────────────────┼───────────────────┬───────────────┐
         │               │                    │                   │               │
         ▼               ▼                    ▼                   ▼               ▼
┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Identity Service│ │ User Service │ │ Product Service │ │Inventory Service│ │  Cart Service   │
│   Port: 3001    │ │  Port: 3002  │ │   Port: 3003    │ │   Port: 3004    │ │   Port: 3005    │
│  PostgreSQL:5432│ │PostgreSQL:5433│ │ PostgreSQL:5434 │ │ PostgreSQL:5435 │ │   Redis:6379    │
└─────────────────┘ └──────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
                                              │                   │
                                              ▼                   ▼
                                     ┌─────────────────┐ ┌─────────────────┐
                                     │  Order Service  │ │ Payment Service │
                                     │   Port: 3006    │ │   Port: 3007    │
                                     │ PostgreSQL:5436 │ │ PostgreSQL:5437 │
                                     └────────┬────────┘ └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────────┐
                                     │Notification Service │
                                     │     Port: 3008      │
                                     │   PostgreSQL:5438   │
                                     └─────────────────────┘
```

---

## 🌐 Services & Port Allocation

| Component | Port | Technology | Primary Storage | Responsibility |
|---|---|---|---|---|
| **API Gateway** | `3000` | Express / Proxy | None | Routing, auth header propagation, correlation IDs |
| **Identity Service** | `3001` | Node / Express | PostgreSQL (`:5432`) | Registration, login, JWT issuance, token rotation |
| **User Service** | `3002` | Node / Express | PostgreSQL (`:5433`) | User profiles, address book, contact info |
| **Product Service** | `3003` | Node / Express | PostgreSQL (`:5434`) | Catalog, categories, search, filtering |
| **Inventory Service** | `3004` | Node / Express | PostgreSQL (`:5435`) | Warehouse stock, reservations, stock alerts |
| **Cart Service** | `3005` | Node / Express | Redis (`:6379`) | Fast session-backed persistent shopping cart |
| **Order Service** | `3006` | Node / Express | PostgreSQL (`:5436`) | Order checkout saga, status tracking, cancellations |
| **Payment Service** | `3007` | Node / Express | PostgreSQL (`:5437`) | Simulated payment authorization, refunds |
| **Notification Service** | `3008` | Node / Express | PostgreSQL (`:5438`) | Simulated transactional emails & notification logs |
| **Storefront & Admin UI** | `5173` | React 18 / Vite | Browser Storage | Responsive customer store & admin control panel |

---

## ⚡ Quickstart for Local Development

### 1. Prerequisites
- **Node.js**: v20.x LTS or higher
- **Docker & Docker Compose**: For local dev database containers
- **Git**

### 2. Clone and Setup
```bash
# Clone the repository
git clone <repo-url>
cd shopsphere

# Automated Setup for Windows
npm run setup:win

# Automated Setup for Linux / macOS
npm run setup:nix
```

### 3. Spin up Local Database Containers
```bash
npm run db:up
```

### 4. Run Migrations & Seed Sample Data
```bash
npm run seed
```

### 5. Launch the Application
```bash
# Launch all microservices & frontend
npm run start:win
```

### 6. Default Demo Credentials
| Role | Email | Password | Access |
|---|---|---|---|
| **Administrator** | `admin@shopsphere.io` | `AdminPassword@123!` | Storefront + Admin Dashboard (`/admin`) |
| **Customer** | `customer@shopsphere.io` | `CustomerPassword@123!` | Customer Storefront, Cart & Checkout |

---

## 📚 DevOps Handoff Documentation

This codebase comes with complete technical specifications for DevOps students:

- 📋 [**ARCHITECTURE.md**](./ARCHITECTURE.md) — Service interaction diagrams, sagas, failure scenarios.
- 🔌 [**API_DOCUMENTATION.md**](./API_DOCUMENTATION.md) — Comprehensive REST API routes, schemas, headers.
- 💻 [**LOCAL_DEVELOPMENT.md**](./LOCAL_DEVELOPMENT.md) — Environment variables, debugging, test instructions.
- 🚀 [**DEVOPS_HANDOFF.md**](./DEVOPS_HANDOFF.md) — Explicit capstone requirements, deliverables, scoring rubric.
- 🔒 [**SECURITY_REQUIREMENTS.md**](./SECURITY_REQUIREMENTS.md) — Secret handling, TLS, OWASP mitigation, JWT policies.
- 🗄️ [**DATABASE_DESIGN.md**](./DATABASE_DESIGN.md) — Schemas, ER diagrams, foreign keys, migrations.
- 🐳 [**DOCKERFILE_REQUIREMENTS.md**](./DOCKERFILE_REQUIREMENTS.md) — Multi-stage builds, non-root users, layer caching.
- 🧪 [**TESTING.md**](./TESTING.md) — Unit tests, integration tests, health probes, automated suites.
- 🛠️ [**TROUBLESHOOTING.md**](./TROUBLESHOOTING.md) — Common runtime errors, network gotchas, resolution steps.

---

## 🛡️ License
This project is licensed under the MIT License for educational and DevOps capstone evaluation.
