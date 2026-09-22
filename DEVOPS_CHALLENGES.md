# 🚨 ShopSphere — DevOps Operational Challenges & Incident Scenarios

> **For DevOps Students**:  
> Once you have deployed ShopSphere to staging or production Kubernetes clusters, you will be evaluated on your ability to detect, diagnose, and remediate realistic production incidents.  
> **Solutions are intentionally omitted.** You must formulate your own root-cause analysis (RCA) and operational runbooks.

---

## Incident 1: Product Service Outage & Catalog Blackout

### Symptom:
Customers browsing the homepage or product listing page see `503 Service Unavailable` or empty catalog skeletons. The API Gateway logs `ECONNREFUSED` or proxy timeout errors when forwarding to `/api/v1/products`.

### Expected Student Investigation:
1. **Kubernetes Cluster State**:
   - Inspect Pod status: `kubectl get pods -l app=product-service` (Are pods `Running`, `Pending`, or `Terminating`?).
   - Inspect Service & Endpoints: `kubectl get svc product-service` and `kubectl get endpoints product-service` (Is the service selector matching active pods?).
2. **Health Check Probes**:
   - Check if `readinessProbe` or `livenessProbe` is failing and restarting the container.
   - Inspect probe failure messages in `kubectl describe pod <product-pod>`.
3. **Database Connectivity**:
   - Check if the Product Service pod can resolve and reach PostgreSQL on port 5434.
   - Verify whether database credentials or connection pool limits were exceeded.
4. **Log Analysis**:
   - Examine container stdout logs: `kubectl logs -l app=product-service --tail=100`.

---

## Incident 2: Checkout Latency Spike & Gateway Timeouts

### Symptom:
Customers report that clicking "Place Order" hangs for 30+ seconds and intermittently returns `504 Gateway Timeout`.

### Expected Student Investigation:
1. **Distributed Tracing & Correlation**:
   - Trace the request using the `X-Correlation-ID` header across API Gateway, Order Service, Inventory Service, and Payment Service.
2. **Service Bottlenecks**:
   - Is the delay happening during inventory reservation or payment processing?
   - Check response times and timeouts configured on inter-service HTTP requests.
3. **Database Saturation**:
   - Check PostgreSQL connection pool utilization for `shopsphere_orders` and `shopsphere_inventory`.
   - Inspect database lock contention: Are concurrent `SELECT FOR UPDATE` queries in Inventory Service queuing up behind slow transactions?
4. **Metrics & Resource Saturation**:
   - Inspect CPU/Memory saturation on the Order Service and Payment Service pods via Prometheus and Grafana dashboards.

---

## Incident 3: Pod Enters `CrashLoopBackOff` on Startup

### Symptom:
A newly deployed microservice pod repeatedly restarts and enters `CrashLoopBackOff` without ever becoming ready.

### Expected Student Investigation:
1. **Container Startup Logs**:
   - Run `kubectl logs <pod-name> --previous` to see why the previous instance died before crashing.
2. **Configuration & Secrets**:
   - Are required environment variables missing (e.g. `JWT_SECRET`, `DB_PASSWORD`, `PORT`)?
   - Did a ConfigMap or Secret fail to mount or contain a typo?
3. **Dependency Initialization**:
   - Does the service fail to connect to its database upon startup?
   - Did the database container/pod finish initializing before the service started? (Explore Kubernetes `initContainers` or connection retry strategies).
4. **Filesystem & Permission Issues**:
   - Does the service attempt to write to a read-only filesystem or bind to an unprivileged port without permissions?

---

## Incident 4: New Release Works Locally but Fails in Kubernetes

### Symptom:
A new service build passes all local development tests and runs fine with `node src/server.js`, but after pushing to the cluster, the application fails to route requests or throws unexpected 500 errors.

### Expected Student Investigation:
1. **DNS & Service Discovery**:
   - In local dev, services communicate via `localhost:PORT`. In Kubernetes, services must communicate using cluster DNS names (e.g. `http://inventory-service:3004`).
   - Did the deployment manifest provide the correct cluster DNS URLs in environment variables?
2. **Container Build Artifacts**:
   - Did the multi-stage Docker build omit required files (e.g. the `shared/` directory or native dependencies like `bcrypt`)?
   - Inspect the inside of the container: `kubectl exec -it <pod-name> -- sh`.
3. **Ingress & TLS Termination**:
   - Are Ingress routing rules correctly mapping `/api/v1/*` paths to the API Gateway?
   - Are headers like `X-Forwarded-For` and `Host` being preserved through the Ingress controller?

---

## Incident 5: Flash Sale Traffic Surge & High Load

### Symptom:
Traffic spikes by 10x due to a marketing promotion. Microservice pod memory climbs to 100%, CPU throttles, and customers experience elevated HTTP 429 and 502 responses.

### Expected Student Investigation:
1. **Horizontal Pod Autoscaling (HPA)**:
   - Is an `HorizontalPodAutoscaler` defined for high-traffic services (Gateway, Product, Cart, Order)?
   - Are resource requests (`resources.requests.cpu`) properly defined so Kubernetes metrics-server can compute utilization percentages?
2. **Rate Limiting & Throttling**:
   - Is the API Gateway rate limiter throttling legitimate traffic, or is it protecting the backend services from total collapse?
3. **Connection Pool Sizing**:
   - If pods scale from 2 to 20 replicas, will the PostgreSQL database connection limit (`max_connections`) be exceeded?
   - How should connection pooling (e.g. PgBouncer) be introduced to handle horizontal scaling?
4. **Cache Offloading**:
   - Can product catalog reads be cached more aggressively to protect the Product Service database?
