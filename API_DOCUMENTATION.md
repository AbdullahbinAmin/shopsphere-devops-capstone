# 🔌 ShopSphere REST API Reference

All requests and responses pass through the **API Gateway** on port `3000` via `/api/v1/*` routes or directly to specific microservice ports.

---

## Standard Response Envelopes

### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource retrieved successfully",
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

### Error Envelope (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "The request body failed validation constraints.",
  "details": [
    { "field": "price", "message": "Price must be a positive number" }
  ],
  "correlationId": "c9284210-91bf-4b92-9112-9218201a01b2",
  "timestamp": "2026-09-21T07:20:00.000Z"
}
```

---

## 1. Identity Service (Port 3001)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | None | Public | Register new user account |
| `POST` | `/api/v1/auth/login` | None | Public | Authenticate user & return JWT tokens |
| `POST` | `/api/v1/auth/refresh` | None | Public | Rotate refresh token and get new access token |
| `POST` | `/api/v1/auth/logout` | Bearer | User | Revoke refresh token |
| `GET` | `/api/v1/auth/me` | Bearer | User | Retrieve authenticated token identity |
| `POST` | `/api/v1/auth/change-password` | Bearer | User | Update account password |

---

## 2. User Service (Port 3002)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/users/profile` | Bearer | User | Retrieve current user profile details |
| `PUT` | `/api/v1/users/profile` | Bearer | User | Update profile (first name, last name, phone) |
| `GET` | `/api/v1/users/addresses` | Bearer | User | List all saved delivery addresses |
| `POST` | `/api/v1/users/addresses` | Bearer | User | Add new shipping address |
| `PUT` | `/api/v1/users/addresses/:id` | Bearer | User | Update existing address |
| `DELETE` | `/api/v1/users/addresses/:id` | Bearer | User | Delete address |
| `GET` | `/api/v1/users` | Bearer | Admin | List all registered users (paginated) |

---

## 3. Product Service (Port 3003)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/products` | None | Public | Browse catalog with search, filter, and pagination |
| `GET` | `/api/v1/products/featured` | None | Public | Get featured products for homepage carousel |
| `GET` | `/api/v1/products/categories` | None | Public | Get product category tree |
| `GET` | `/api/v1/products/:id` | None | Public | Get single product specifications and reviews |
| `POST` | `/api/v1/products` | Bearer | Admin | Create a new catalog merchandise item |
| `PUT` | `/api/v1/products/:id` | Bearer | Admin | Update existing product details |
| `DELETE` | `/api/v1/products/:id` | Bearer | Admin | Soft-delete / deactivate product |
| `GET` | `/api/v1/products/stats` | Bearer | Admin | Get catalog counts & metrics |

---

## 4. Inventory Service (Port 3004)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/inventory` | Bearer | Admin | List stock levels for all products |
| `GET` | `/api/v1/inventory/check/:productId` | None | Public | Check if quantity is currently available |
| `GET` | `/api/v1/inventory/low-stock` | Bearer | Admin | Get list of items below low-stock threshold |
| `PATCH`| `/api/v1/inventory/product/:id/stock`| Bearer | Admin | Increment, decrement, or set warehouse stock |
| `POST` | `/api/v1/inventory/reserve` | Internal | System | Reserve inventory during checkout saga |
| `POST` | `/api/v1/inventory/commit` | Internal | System | Finalize stock deduction after payment |
| `POST` | `/api/v1/inventory/release` | Internal | System | Rollback reservation upon payment failure |

---

## 5. Cart Service (Port 3005)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/v1/cart` | Bearer | User | Retrieve current user's Redis-backed shopping cart |
| `POST` | `/api/v1/cart/items` | Bearer | User | Add product to cart |
| `PUT` | `/api/v1/cart/items/:productId` | Bearer | User | Update quantity of cart item |
| `DELETE`| `/api/v1/cart/items/:productId`| Bearer | User | Remove item from cart |
| `DELETE`| `/api/v1/cart` | Bearer | User | Clear entire cart |
| `POST` | `/api/v1/cart/sync` | Bearer | User | Re-synchronize product prices with Product Service |

---

## 6. Order Service (Port 3006)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/orders` | Bearer | User | Execute checkout saga and place order |
| `GET` | `/api/v1/orders` | Bearer | User | View current user's order history |
| `GET` | `/api/v1/orders/:id` | Bearer | User | Get complete order details, timeline & items |
| `POST` | `/api/v1/orders/:id/cancel` | Bearer | User | Cancel order & trigger inventory compensation |
| `GET` | `/api/v1/orders?all=true` | Bearer | Admin | View all orders placed across system |
| `PATCH`| `/api/v1/orders/:id/status` | Bearer | Admin | Update status (PROCESSING, SHIPPED, DELIVERED) |

---

## 7. Payment Service (Port 3007)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/payments/process` | Internal | System | Authorize & settle transaction |
| `GET` | `/api/v1/payments/order/:orderId`| Bearer | User/Admin| Get payment transaction details by order ID |
| `POST` | `/api/v1/payments/:id/refund` | Bearer | Admin | Process partial or full transaction refund |
| `GET` | `/api/v1/payments/stats` | Bearer | Admin | Financial gross statistics |

---

## 8. Notification Service (Port 3008)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/v1/notifications/send` | Internal | System | Dispatch simulated transactional email |
| `GET` | `/api/v1/notifications/user/:userId`| Bearer | User | View notification history log |
