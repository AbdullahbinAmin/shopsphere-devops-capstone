/**
 * ShopSphere — Master Seed Runner
 * Connects to databases or seeds via microservice APIs.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { CATEGORIES, PRODUCTS, SEED_USERS } = require('./seed-data');

const DB_PASSWORD = process.env.DB_PASSWORD || 'devpassword123';
const DB_USER = process.env.DB_USER || 'shopsphere_user';
const DB_HOST = process.env.DB_HOST || 'localhost';

async function seedIdentityAndUsers() {
  console.log('🔄 Seeding Identity & User Services...');
  const identityPool = new Pool({
    host: DB_HOST,
    port: parseInt(process.env.DB_IDENTITY_PORT) || 5432,
    database: 'shopsphere_identity',
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const userPool = new Pool({
    host: DB_HOST,
    port: parseInt(process.env.DB_USERS_PORT) || 5433,
    database: 'shopsphere_users',
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    for (const user of SEED_USERS) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // Upsert identity
      const idRes = await identityPool.query(
        `INSERT INTO identities (email, password_hash, role, is_active, is_verified)
         VALUES ($1, $2, $3, true, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $2, role = $3
         RETURNING id`,
        [user.email, passwordHash, user.role]
      );
      const identityId = idRes.rows[0].id;

      // Upsert user profile
      await userPool.query(
        `INSERT INTO user_profiles (id, email, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET email = $2, first_name = $3, last_name = $4, phone = $5`,
        [identityId, user.email, user.firstName, user.lastName, user.phone]
      );

      // Upsert address if exists
      if (user.address) {
        await userPool.query(
          `INSERT INTO user_addresses (user_id, label, full_name, address_line1, address_line2, city, state, postal_code, country, phone, is_default)
           VALUES ($1, 'Home', $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT DO NOTHING`,
          [
            identityId,
            user.address.recipientName,
            user.address.addressLine1,
            user.address.addressLine2,
            user.address.city,
            user.address.state,
            user.address.postalCode,
            user.address.country,
            user.address.phone,
            user.address.isDefault,
          ]
        );
      }
    }
    console.log('✅ Identity & Users seeded successfully.');
  } finally {
    await identityPool.end();
    await userPool.end();
  }
}

async function seedProductsAndInventory() {
  console.log('🔄 Seeding Catalog Products & Inventory Services...');
  const productPool = new Pool({
    host: DB_HOST,
    port: parseInt(process.env.DB_PRODUCTS_PORT) || 5434,
    database: 'shopsphere_products',
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const inventoryPool = new Pool({
    host: DB_HOST,
    port: parseInt(process.env.DB_INVENTORY_PORT) || 5435,
    database: 'shopsphere_inventory',
    user: DB_USER,
    password: DB_PASSWORD,
  });

  try {
    const categoryMap = {};

    // 1. Categories
    for (const cat of CATEGORIES) {
      const catRes = await productPool.query(
        `INSERT INTO categories (name, slug, description, image_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name = $1, description = $3, image_url = $4
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description, cat.imageUrl]
      );
      categoryMap[catRes.rows[0].slug] = catRes.rows[0].id;
    }

    // 2. Products & Inventory
    for (const prod of PRODUCTS) {
      const categoryId = categoryMap[prod.categorySlug];

      const prodRes = await productPool.query(
        `INSERT INTO products (sku, name, slug, description, short_description, category_id, brand, price, compare_at_price, discount_percent, is_featured, tags, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'ACTIVE')
         ON CONFLICT (sku) DO UPDATE SET name = $2, price = $8, is_featured = $11
         RETURNING id, sku, name`,
        [
          prod.sku,
          prod.name,
          prod.slug,
          prod.description,
          prod.short_description,
          categoryId,
          prod.brand,
          prod.price,
          prod.compare_at_price,
          prod.discount_percent,
          prod.is_featured,
          prod.tags,
        ]
      );

      const productId = prodRes.rows[0].id;

      // Add product image
      await productPool.query(
        `INSERT INTO product_images (product_id, url, is_primary, sort_order)
         VALUES ($1, $2, true, 0)
         ON CONFLICT DO NOTHING`,
        [productId, prod.imageUrl]
      );

      // Add inventory record
      await inventoryPool.query(
        `INSERT INTO inventory (product_id, sku, quantity_in_stock, quantity_reserved, low_stock_threshold)
         VALUES ($1, $2, $3, 0, 10)
         ON CONFLICT (product_id) DO UPDATE SET quantity_in_stock = $3`,
        [productId, prod.sku, prod.stock]
      );
    }

    console.log('✅ Products & Inventory seeded successfully.');
  } finally {
    await productPool.end();
    await inventoryPool.end();
  }
}

async function runSeed() {
  console.log('🌱 Starting ShopSphere Master Database Seed...');
  try {
    await seedIdentityAndUsers();
    await seedProductsAndInventory();
    console.log('🎉 ShopSphere seed process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.log('Note: Ensure databases are running before seeding (e.g. docker compose -f docker-compose.dev.yml up -d)');
    process.exit(1);
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
