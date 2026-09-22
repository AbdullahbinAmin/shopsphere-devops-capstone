# 🗄️ ShopSphere Database Design Specification

## 1. Database-per-Service Architecture

ShopSphere implements strict domain boundaries. Each microservice connects exclusively to its own database schema. No service may query another service's database directly.

| Service | Engine | Database Name | Default Port |
|---|---|---|---|
| **Identity Service** | PostgreSQL 16 | `shopsphere_identity` | `5432` |
| **User Service** | PostgreSQL 16 | `shopsphere_users` | `5433` |
| **Product Service** | PostgreSQL 16 | `shopsphere_products` | `5434` |
| **Inventory Service** | PostgreSQL 16 | `shopsphere_inventory` | `5435` |
| **Cart Service** | Redis 7.2 | In-Memory (Key-Value) | `6379` |
| **Order Service** | PostgreSQL 16 | `shopsphere_orders` | `5436` |
| **Payment Service** | PostgreSQL 16 | `shopsphere_payments` | `5437` |
| **Notification Service**| PostgreSQL 16 | `shopsphere_notifications`| `5438` |

---

## 2. Relational Schemas & Entities

### 1. Identity Service (`shopsphere_identity`)
- **`identities`**: `id (UUID PK)`, `email (VARCHAR UNIQUE)`, `password_hash (VARCHAR)`, `role (VARCHAR: CUSTOMER, ADMIN)`, `is_active (BOOLEAN)`, `is_verified (BOOLEAN)`, `failed_login_attempts (INT)`, `locked_until (TIMESTAMPTZ)`, `created_at`, `updated_at`.
- **`refresh_tokens`**: `id (UUID PK)`, `identity_id (UUID FK)`, `token_hash (VARCHAR UNIQUE)`, `expires_at (TIMESTAMPTZ)`, `is_revoked (BOOLEAN)`, `created_at`.

### 2. User Service (`shopsphere_users`)
- **`profiles`**: `id (UUID PK - matches Identity UUID)`, `first_name (VARCHAR)`, `last_name (VARCHAR)`, `phone (VARCHAR)`, `avatar_url (TEXT)`, `created_at`, `updated_at`.
- **`addresses`**: `id (UUID PK)`, `user_id (UUID)`, `recipient_name (VARCHAR)`, `address_line1 (VARCHAR)`, `address_line2 (VARCHAR)`, `city (VARCHAR)`, `state (VARCHAR)`, `postal_code (VARCHAR)`, `country (VARCHAR)`, `phone (VARCHAR)`, `is_default (BOOLEAN)`.

### 3. Product Service (`shopsphere_products`)
- **`categories`**: `id (UUID PK)`, `name (VARCHAR UNIQUE)`, `slug (VARCHAR UNIQUE)`, `description (TEXT)`, `image_url (TEXT)`, `parent_id (UUID FK)`, `is_active (BOOLEAN)`.
- **`products`**: `id (UUID PK)`, `sku (VARCHAR UNIQUE)`, `name (VARCHAR)`, `slug (VARCHAR UNIQUE)`, `description (TEXT)`, `category_id (UUID FK)`, `brand (VARCHAR)`, `price (NUMERIC(12,2))`, `compare_at_price (NUMERIC(12,2))`, `discount_percent (NUMERIC(5,2))`, `is_featured (BOOLEAN)`, `tags (TEXT[])`, `status (VARCHAR)`.
- **`product_images`**: `id (UUID PK)`, `product_id (UUID FK)`, `url (TEXT)`, `is_primary (BOOLEAN)`, `sort_order (INT)`.
- **`reviews`**: `id (UUID PK)`, `product_id (UUID FK)`, `user_id (UUID)`, `rating (INT 1-5)`, `title (VARCHAR)`, `comment (TEXT)`, `created_at`.

### 4. Inventory Service (`shopsphere_inventory`)
- **`inventory`**: `id (UUID PK)`, `product_id (UUID UNIQUE)`, `sku (VARCHAR UNIQUE)`, `quantity (INT)`, `reserved_quantity (INT)`, `low_stock_threshold (INT)`, `updated_at`.
- **`reservations`**: `id (UUID PK)`, `reservation_id (UUID)`, `order_id (UUID)`, `product_id (UUID)`, `quantity (INT)`, `status (PENDING, COMMITTED, RELEASED)`, `expires_at (TIMESTAMPTZ)`.

### 5. Cart Service (Redis)
- **Key Pattern**: `cart:{userId}`
- **Data Type**: Hash or Serialized JSON document
- **TTL**: 14 days (automatically refreshed on cart interactions)

### 6. Order Service (`shopsphere_orders`)
- **`orders`**: `id (UUID PK)`, `order_number (VARCHAR UNIQUE)`, `user_id (UUID)`, `status (PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED)`, `subtotal (NUMERIC)`, `shipping_amount (NUMERIC)`, `tax_amount (NUMERIC)`, `total_amount (NUMERIC)`, `shipping_address (JSONB)`, `billing_address (JSONB)`, `payment_method (VARCHAR)`, `notes (TEXT)`, `created_at`, `updated_at`.
- **`order_items`**: `id (UUID PK)`, `order_id (UUID FK)`, `product_id (UUID)`, `name (VARCHAR)`, `sku (VARCHAR)`, `price (NUMERIC)`, `quantity (INT)`, `image_url (TEXT)`.

### 7. Payment Service (`shopsphere_payments`)
- **`transactions`**: `id (UUID PK)`, `order_id (UUID UNIQUE)`, `user_id (UUID)`, `amount (NUMERIC(12,2))`, `currency (VARCHAR: USD)`, `status (AUTHORIZED, CAPTURED, FAILED, REFUNDED)`, `payment_method (VARCHAR)`, `provider_reference (VARCHAR)`, `created_at`.

### 8. Notification Service (`shopsphere_notifications`)
- **`notifications`**: `id (UUID PK)`, `user_id (UUID)`, `type (EMAIL, SMS)`, `template (ORDER_CONFIRMATION, WELCOME, SHIPPING_UPDATE)`, `recipient (VARCHAR)`, `subject (VARCHAR)`, `content (TEXT)`, `status (SENT, FAILED)`, `sent_at`.
