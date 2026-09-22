# =============================================================================
# ShopSphere — Local Development Environment Setup Script (PowerShell)
# =============================================================================

Write-Host "🚀 Setting up ShopSphere Local Development Environment..." -ForegroundColor Cyan

# 1. Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "✓ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js is required (v20+ recommended). Please install Node.js." -ForegroundColor Red
    Exit 1
}

# 2. Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✓ Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker was not detected. Local databases can also be run natively." -ForegroundColor Yellow
}

# 3. Install Shared Dependencies
Write-Host "📦 Installing shared module dependencies..." -ForegroundColor Cyan
Push-Location "shared"
npm install --silent
Pop-Location

# 4. Install Services Dependencies
$services = @(
    "api-gateway",
    "identity-service",
    "user-service",
    "product-service",
    "inventory-service",
    "cart-service",
    "order-service",
    "payment-service",
    "notification-service"
)

foreach ($service in $services) {
    Write-Host "📦 Installing dependencies for $service..." -ForegroundColor Cyan
    Push-Location "services/$service"
    npm install --silent
    if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
        Copy-Item ".env.example" ".env"
        Write-Host "  → Created .env from .env.example for $service" -ForegroundColor Gray
    }
    Pop-Location
}

# 5. Install Frontend Dependencies
Write-Host "📦 Installing Frontend dependencies..." -ForegroundColor Cyan
Push-Location "frontend"
npm install --silent
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
}
Pop-Location

Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start development databases:  docker compose -f docker-compose.dev.yml up -d"
Write-Host "  2. Run database migrations:       npm run db:migrate (or node scripts/seed/index.js)"
Write-Host "  3. Start all services:           npm run dev (or ./scripts/setup/start-all.ps1)"
Write-Host "  4. Start frontend:               cd frontend; npm run dev"
