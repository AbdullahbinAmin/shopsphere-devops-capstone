#!/usr/bin/env bash
# =============================================================================
# ShopSphere — Local Development Environment Setup Script (Bash)
# =============================================================================

set -e

echo "🚀 Setting up ShopSphere Local Development Environment..."

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js v20+."
    exit 1
fi
echo "✓ Node.js $(node -v) detected"

# 2. Check Docker
if command -v docker &> /dev/null; then
    echo "✓ Docker detected: $(docker --version)"
else
    echo "⚠ Docker was not detected. Local databases can also be run natively."
fi

# 3. Install Shared Dependencies
echo "📦 Installing shared module dependencies..."
cd shared && npm install --silent && cd ..

# 4. Install Services Dependencies
SERVICES=(
    "api-gateway"
    "identity-service"
    "user-service"
    "product-service"
    "inventory-service"
    "cart-service"
    "order-service"
    "payment-service"
    "notification-service"
)

for service in "${SERVICES[@]}"; do
    echo "📦 Installing dependencies for $service..."
    cd "services/$service"
    npm install --silent
    if [ ! -f .env ] && [ -f .env.example ]; then
        cp .env.example .env
        echo "  → Created .env from .env.example for $service"
    fi
    cd ../..
done

# 5. Install Frontend Dependencies
echo "📦 Installing Frontend dependencies..."
cd frontend
npm install --silent
if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
fi
cd ..

echo ""
echo "🎉 Setup Complete!"
echo "Next steps:"
echo "  1. Start development databases:  docker compose -f docker-compose.dev.yml up -d"
echo "  2. Run database migrations:       npm run db:migrate (or node scripts/seed/index.js)"
echo "  3. Start all services:           npm run dev (or ./scripts/setup/start-all.sh)"
echo "  4. Start frontend:               cd frontend && npm run dev"
