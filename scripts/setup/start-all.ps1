# =============================================================================
# ShopSphere — Local Microservices Process Launcher (PowerShell)
# =============================================================================

Write-Host "🌟 Launching ShopSphere Microservices Ecosystem..." -ForegroundColor Cyan

$services = @(
    @{ Name = "API Gateway"; Path = "services/api-gateway"; Port = 3000 },
    @{ Name = "Identity Service"; Path = "services/identity-service"; Port = 3001 },
    @{ Name = "User Service"; Path = "services/user-service"; Port = 3002 },
    @{ Name = "Product Service"; Path = "services/product-service"; Port = 3003 },
    @{ Name = "Inventory Service"; Path = "services/inventory-service"; Port = 3004 },
    @{ Name = "Cart Service"; Path = "services/cart-service"; Port = 3005 },
    @{ Name = "Order Service"; Path = "services/order-service"; Port = 3006 },
    @{ Name = "Payment Service"; Path = "services/payment-service"; Port = 3007 },
    @{ Name = "Notification Service"; Path = "services/notification-service"; Port = 3008 }
)

Write-Host "Services will launch in background terminal processes:" -ForegroundColor Gray
foreach ($svc in $services) {
    Write-Host "  → $($svc.Name) on port $($svc.Port)" -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($svc.Path)'; npm run dev"
}

Write-Host "`nLaunching Frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'frontend'; npm run dev"

Write-Host "✨ All 9 microservices and Vite frontend launched!" -ForegroundColor Green
Write-Host "Access Storefront at: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Access API Gateway at: http://localhost:3000" -ForegroundColor Yellow
