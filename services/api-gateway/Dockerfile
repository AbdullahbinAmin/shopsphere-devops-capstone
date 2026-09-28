# ==========================================
# Stage 1: Build & Dependencies
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests first for optimal Docker layer caching
COPY package*.json ./

COPY shared/package*.json ./shared/

# Install production dependencies only (skip devDependencies)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:20-alpine AS runtime

WORKDIR /app

# Install dumb-init for POSIX signal forwarding and wget for healthchecks
RUN apk add --no-cache dumb-init wget

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000

# Copy node_modules from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy application source code and shared modules with non-root ownership
COPY --chown=node:node src ./src

COPY --chown=node:node shared ./shared

# Enforce least privilege: switch from root to unprivileged node user
USER node

# Expose API Gateway port
EXPOSE 3000

# Container healthcheck querying the liveness probe endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/liveness || exit 1

# Launch with dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "src/server.js"]
