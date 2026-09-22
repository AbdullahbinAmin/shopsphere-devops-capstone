# 🎓 ShopSphere — DevOps Engineering Handoff & Capstone Requirements

> **Crucial Notice for DevOps Students & Evaluators**:  
> **The application is already developed.**  
> The software engineering team has completed all microservice code, business logic, APIs, database migrations, and the frontend web application.  
> **Your job begins at source control, containerization, orchestration, automation, and production deployment.**

---

## 🏛️ Boundary of Responsibilities

```
=============================================================================
                          DEVELOPMENT TEAM (Completed)
                          - ShopSphere Microservices (9 Services)
                          - React 18 Storefront & Admin Portal
                          - Database Migrations & Relational Schemas
                          - Inter-Service Sagas & Compensation Logic
                          - Health Check Endpoints & Structured Logs
                          - Developer Local Environment (docker-compose.dev.yml)
=============================================================================
                                      │
                                      ▼  HANDOFF
=============================================================================
                           DEVOPS TEAM (Students' Job)
                          - Git Repository Governance & Branching
                          - Linux Server & Host Hardening
                          - Docker Containerization & Optimization
                          - Container Registry Automation
                          - CI/CD Pipelines (Test, Scan, Build, Deploy)
                          - Cloud Infrastructure & Networking
                          - Infrastructure as Code (Terraform / OpenTofu)
                          - Kubernetes Cluster Orchestration & Helm
                          - GitOps (ArgoCD / Flux)
                          - Monitoring (Prometheus & Metrics Exporters)
                          - Visualization & Dashboards (Grafana)
                          - Alerting & Incident Response (Alertmanager)
                          - Production Troubleshooting & Chaos Testing
=============================================================================
```

---

## 🎯 Capstone Milestones & Deliverables

### Milestone 1: Git Workflow & Repository Governance
- Establish a branch protection strategy (`main`, `staging`, `feature/*`).
- Enforce pull request reviews, linear git history, and commit convention (Conventional Commits).
- Configure automated branch validation triggers.

### Milestone 2: Linux Server Preparation & Host Hardening
- Provision and configure minimal Linux hosts (Ubuntu LTS / Rocky Linux).
- Configure firewall rules (`UFW` / `iptables`), SSH key-based authentication, non-root user accounts, and package updates.
- Install and configure Docker Engine, Containerd, and system log rotations.

### Milestone 3: Docker Containerization
- Author multi-stage `Dockerfile` definitions for all 9 Node.js services and React frontend.
- Implement layer caching, minimal Alpine base images, and `dumb-init` signal handling.
- Ensure all containers execute under non-root users (`USER node`).
- Produce zero critical/high CVE findings in vulnerability scans.

### Milestone 4: Container Registry Integration
- Set up secure authentication to a container registry (Docker Hub, GitHub Container Registry GHCR, or AWS ECR).
- Tag images with Git commit SHA and semantic version tags (`v1.0.0-sha`).
- Configure automated image cleanup/retention policies.

### Milestone 5: CI (Continuous Integration) Pipeline
- Automate pull request workflows:
  - Run linting and unit test suites (`npm test`).
  - Run security SAST and container vulnerability scans (Trivy).
  - Build images in parallel using build caches.
  - Push tested images to the container registry on merge to `main`.

### Milestone 6: Cloud Infrastructure & Networking
- Design a Virtual Private Cloud (VPC) with public and private subnets across multiple Availability Zones.
- Configure NAT Gateways, Internet Gateways, Route Tables, and Security Groups.
- Isolate databases in private subnets with no public internet ingress.

### Milestone 7: Infrastructure as Code (IaC) with Terraform
- Codify all cloud infrastructure using Terraform or OpenTofu.
- Manage remote state with state locking (e.g. S3 + DynamoDB or Terraform Cloud).
- Implement modular design: `vpc`, `database`, `compute`, `kubernetes`.

### Milestone 8: Kubernetes Orchestration & Helm Packaging
- Deploy ShopSphere onto a Kubernetes cluster (EKS, GKE, or local KinD/Minikube).
- Write Helm charts or Kube manifests:
  - `Deployment` with CPU/memory requests and limits.
  - `HorizontalPodAutoscaler` (HPA) based on CPU/memory utilization.
  - `ConfigMap` and `Secret` for environment configurations.
  - `ClusterIP` for internal microservices; `Ingress` with TLS for Gateway and Frontend.
  - Configure `livenessProbe` (`/health/liveness`) and `readinessProbe` (`/health/readiness`).

### Milestone 9: GitOps Continuous Delivery with ArgoCD
- Install ArgoCD or Flux on the Kubernetes cluster.
- Connect the GitOps repository containing environment overlays (Dev, Staging, Prod).
- Implement automated synchronization and self-healing for cluster manifests.

### Milestone 10: Observability & Monitoring with Prometheus
- Deploy Prometheus Operator and scrape metrics from:
  - Kubernetes nodes and pods (Node Exporter, cAdvisor).
  - PostgreSQL databases (postgres-exporter).
  - Redis cache (redis-exporter).
  - Microservices HTTP request rates, error rates, and durations.

### Milestone 11: Visualization & Alerting with Grafana & Alertmanager
- Create executive and engineering Grafana dashboards:
  - RED metrics (Rate, Errors, Duration) per microservice.
  - Resource consumption (CPU, RAM, Disk, Network) per node and pod.
  - Database connection pool saturation and query latencies.
- Configure Alertmanager alerts routed to Slack, Discord, or Email for service outages, high error rates (>5%), or crash loops.

### Milestone 12: Production Troubleshooting & Chaos Resilience
- Validate application recovery during simulated failures (see [DEVOPS_CHALLENGES.md](./DEVOPS_CHALLENGES.md)).
- Perform a rolling upgrade of a microservice with zero dropped customer requests.
- Document runbooks for disaster recovery and operational playbooks.

---

## 📊 Evaluation Rubric

| Domain | Weight | Standard for Full Marks |
|---|---|---|
| **Containerization** | 15% | Multi-stage, non-root user, <180MB size, zero critical CVEs, proper healthchecks. |
| **CI/CD Pipeline** | 20% | Automated test, scan, build, and deploy pipeline with no manual interventions. |
| **Kubernetes / IaC** | 25% | Modular Terraform, valid Helm charts, HPA autoscaling, zero-downtime rollouts. |
| **Observability** | 20% | Real-time Grafana dashboards, Prometheus exporters, and functional alerts. |
| **Security Hardening**| 10% | Zero secrets in git; network policies; least privilege IAM and service accounts. |
| **Incident Response** | 10% | Successfully diagnosing and resolving realistic DevOps challenges with runbooks. |
