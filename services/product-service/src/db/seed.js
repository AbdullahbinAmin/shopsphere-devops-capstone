/**
 * Product Service — Seed Data
 * Realistic product catalog for ShopSphere.
 */

require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'shopsphere_products',
  user: process.env.DB_USER || 'shopsphere_user',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const categories = [
  { id: '11111111-0000-0000-0000-000000000001', name: 'Electronics', slug: 'electronics', description: 'Latest electronic gadgets and devices', image_url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400' },
  { id: '11111111-0000-0000-0000-000000000002', name: 'Smartphones', slug: 'smartphones', description: 'Mobile phones and accessories', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', parent_id: '11111111-0000-0000-0000-000000000001' },
  { id: '11111111-0000-0000-0000-000000000003', name: 'Laptops', slug: 'laptops', description: 'Laptops and ultrabooks', image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', parent_id: '11111111-0000-0000-0000-000000000001' },
  { id: '11111111-0000-0000-0000-000000000004', name: 'Clothing', slug: 'clothing', description: 'Fashion and apparel for all', image_url: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400' },
  { id: '11111111-0000-0000-0000-000000000005', name: "Men's Clothing", slug: 'mens-clothing', description: "Men's fashion collection", image_url: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400', parent_id: '11111111-0000-0000-0000-000000000004' },
  { id: '11111111-0000-0000-0000-000000000006', name: "Women's Clothing", slug: 'womens-clothing', description: "Women's fashion collection", image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400', parent_id: '11111111-0000-0000-0000-000000000004' },
  { id: '11111111-0000-0000-0000-000000000007', name: 'Home & Living', slug: 'home-living', description: 'Home decor and essentials', image_url: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400' },
  { id: '11111111-0000-0000-0000-000000000008', name: 'Sports & Outdoors', slug: 'sports-outdoors', description: 'Sports equipment and outdoor gear', image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400' },
  { id: '11111111-0000-0000-0000-000000000009', name: 'Books', slug: 'books', description: 'Books, textbooks, and more', image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400' },
  { id: '11111111-0000-0000-0000-000000000010', name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Skincare, makeup, and personal care', image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400' },
];

const products = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    sku: 'PHONE-001',
    name: 'ProMax X15 Smartphone',
    description: 'The latest flagship smartphone with a 6.7" OLED display, 50MP triple camera system, 5G connectivity, and all-day battery life. Powered by the latest octa-core processor with 12GB RAM and 256GB storage.',
    short_description: '6.7" OLED, 50MP camera, 5G, 12GB RAM',
    category_id: '11111111-0000-0000-0000-000000000002',
    brand: 'TechPro',
    price: 999.99,
    compare_at_price: 1199.99,
    discount_percent: 17,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['smartphone', '5g', 'flagship', 'android'],
    attributes: { color: 'Midnight Black', storage: '256GB', ram: '12GB', display: '6.7 inch OLED' },
    images: [
      { url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', alt_text: 'ProMax X15 Front', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600', alt_text: 'ProMax X15 Back' },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    sku: 'PHONE-002',
    name: 'SnapShot S23 Ultra',
    description: 'Professional-grade photography smartphone with 200MP main camera, built-in S-Pen, and massive 5000mAh battery. Ideal for content creators and power users.',
    short_description: '200MP camera, S-Pen included, 5000mAh',
    category_id: '11111111-0000-0000-0000-000000000002',
    brand: 'SnapTech',
    price: 1199.99,
    compare_at_price: null,
    discount_percent: 0,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['smartphone', 'camera', 's-pen', 'professional'],
    attributes: { color: 'Phantom White', storage: '512GB', ram: '12GB' },
    images: [
      { url: 'https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=600', alt_text: 'SnapShot S23 Ultra', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    sku: 'LAPTOP-001',
    name: 'UltraBook Pro 16',
    description: 'Professional ultrabook with 16" Retina display, M3 Pro chip, 32GB unified memory, and 512GB SSD. Built for creative professionals who demand performance and portability.',
    short_description: '16" Retina, M3 Pro, 32GB RAM, 512GB SSD',
    category_id: '11111111-0000-0000-0000-000000000003',
    brand: 'ApexBook',
    price: 2499.99,
    compare_at_price: 2799.99,
    discount_percent: 11,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['laptop', 'ultrabook', 'professional', 'creative'],
    attributes: { color: 'Space Gray', storage: '512GB SSD', ram: '32GB', display: '16 inch Retina', processor: 'M3 Pro' },
    images: [
      { url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600', alt_text: 'UltraBook Pro 16', is_primary: true },
      { url: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600', alt_text: 'UltraBook Pro 16 Open' },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    sku: 'LAPTOP-002',
    name: 'GamerForce RTX Laptop',
    description: 'Hardcore gaming laptop with NVIDIA RTX 4070 GPU, 15.6" 165Hz QHD display, Intel Core i7 processor, 16GB DDR5 RAM, and 1TB NVMe SSD. Dominate every game.',
    short_description: 'RTX 4070, 165Hz QHD, i7, 16GB DDR5',
    category_id: '11111111-0000-0000-0000-000000000003',
    brand: 'GamerForce',
    price: 1799.99,
    compare_at_price: 1999.99,
    discount_percent: 10,
    status: 'ACTIVE',
    is_featured: false,
    tags: ['laptop', 'gaming', 'rtx', 'high-performance'],
    attributes: { color: 'Stealth Black', storage: '1TB NVMe', ram: '16GB DDR5', gpu: 'RTX 4070', display: '15.6 inch 165Hz QHD' },
    images: [
      { url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600', alt_text: 'GamerForce RTX Laptop', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    sku: 'CLOTH-M-001',
    name: 'Classic Oxford Button-Down Shirt',
    description: 'Timeless Oxford cloth button-down shirt crafted from 100% cotton. Features a relaxed fit, chest pocket, and button-down collar. Perfect for smart-casual occasions.',
    short_description: '100% cotton, button-down, classic fit',
    category_id: '11111111-0000-0000-0000-000000000005',
    brand: 'ClassicWear',
    price: 59.99,
    compare_at_price: 79.99,
    discount_percent: 25,
    status: 'ACTIVE',
    is_featured: false,
    tags: ['shirt', 'oxford', 'cotton', 'smart-casual'],
    attributes: { color: 'White', sizes: ['S', 'M', 'L', 'XL', 'XXL'], material: '100% Cotton' },
    images: [
      { url: 'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600', alt_text: 'Oxford Shirt White', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000006',
    sku: 'CLOTH-W-001',
    name: 'Floral Wrap Midi Dress',
    description: 'Elegant floral wrap midi dress made from sustainable viscose fabric. Features a V-neckline, adjustable tie waist, and flutter sleeves. Suitable for brunch, garden parties, and casual evenings.',
    short_description: 'Floral print, wrap style, sustainable viscose',
    category_id: '11111111-0000-0000-0000-000000000006',
    brand: 'BloomStyle',
    price: 89.99,
    compare_at_price: null,
    discount_percent: 0,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['dress', 'floral', 'wrap', 'sustainable', 'midi'],
    attributes: { color: 'Garden Floral', sizes: ['XS', 'S', 'M', 'L', 'XL'], material: 'Sustainable Viscose' },
    images: [
      { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600', alt_text: 'Floral Wrap Dress', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000007',
    sku: 'HOME-001',
    name: 'Artisan Ceramic Coffee Mug Set',
    description: 'Handcrafted ceramic mug set of 4, each with a unique glaze finish. Microwave and dishwasher safe. Holds 14oz. Perfect for morning coffee, tea, or hot chocolate.',
    short_description: 'Set of 4, handcrafted, 14oz, dishwasher safe',
    category_id: '11111111-0000-0000-0000-000000000007',
    brand: 'ArtisanHome',
    price: 44.99,
    compare_at_price: 55.99,
    discount_percent: 20,
    status: 'ACTIVE',
    is_featured: false,
    tags: ['mug', 'ceramic', 'kitchen', 'coffee', 'handcrafted'],
    attributes: { pieces: 4, capacity: '14oz', material: 'Ceramic', dishwasher_safe: true },
    images: [
      { url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600', alt_text: 'Ceramic Mug Set', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000008',
    sku: 'SPORT-001',
    name: 'UltraFlex Running Shoes',
    description: 'Lightweight performance running shoes featuring a breathable mesh upper, responsive foam midsole, and durable rubber outsole. Suitable for road running and daily training.',
    short_description: 'Mesh upper, responsive foam, road running',
    category_id: '11111111-0000-0000-0000-000000000008',
    brand: 'FleetFoot',
    price: 129.99,
    compare_at_price: 159.99,
    discount_percent: 19,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['running', 'shoes', 'sports', 'fitness', 'training'],
    attributes: { color: 'Blue/White', sizes: ['6', '7', '8', '9', '10', '11', '12'], gender: 'Unisex' },
    images: [
      { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', alt_text: 'UltraFlex Running Shoes', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000009',
    sku: 'BOOK-001',
    name: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    description: 'Robert C. Martin\'s definitive guide to writing clean, readable, and maintainable code. Essential reading for every software developer who wants to improve their craft.',
    short_description: 'By Robert C. Martin — Essential developer reading',
    category_id: '11111111-0000-0000-0000-000000000009',
    brand: 'Prentice Hall',
    price: 34.99,
    compare_at_price: 44.99,
    discount_percent: 22,
    status: 'ACTIVE',
    is_featured: false,
    tags: ['programming', 'software', 'clean code', 'agile', 'development'],
    attributes: { author: 'Robert C. Martin', pages: 464, isbn: '978-0132350884', format: 'Paperback' },
    images: [
      { url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600', alt_text: 'Clean Code Book', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000010',
    sku: 'BEAUTY-001',
    name: 'HydraGlow Daily Moisturizer SPF30',
    description: 'Lightweight, non-comedogenic daily moisturizer with SPF 30 protection. Formulated with hyaluronic acid and vitamin C for hydration, brightening, and sun protection. Suitable for all skin types.',
    short_description: 'SPF30, hyaluronic acid, vitamin C, 50ml',
    category_id: '11111111-0000-0000-0000-000000000010',
    brand: 'HydraGlow',
    price: 48.99,
    compare_at_price: null,
    discount_percent: 0,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['skincare', 'moisturizer', 'spf', 'vitamin-c', 'daily'],
    attributes: { volume: '50ml', skin_type: 'All', spf: 30, key_ingredients: ['Hyaluronic Acid', 'Vitamin C', 'Niacinamide'] },
    images: [
      { url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600', alt_text: 'HydraGlow Moisturizer', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000011',
    sku: 'ELEC-001',
    name: 'SoundWave Pro Wireless Headphones',
    description: 'Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and Hi-Res Audio certification. Foldable design with carrying case included.',
    short_description: 'ANC, 40hr battery, Hi-Res Audio, foldable',
    category_id: '11111111-0000-0000-0000-000000000001',
    brand: 'SoundWave',
    price: 349.99,
    compare_at_price: 399.99,
    discount_percent: 13,
    status: 'ACTIVE',
    is_featured: true,
    tags: ['headphones', 'wireless', 'anc', 'audio', 'bluetooth'],
    attributes: { color: 'Midnight Blue', connectivity: 'Bluetooth 5.3', battery: '40 hours', driver: '40mm' },
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', alt_text: 'SoundWave Headphones', is_primary: true },
    ],
  },
  {
    id: '22222222-0000-0000-0000-000000000012',
    sku: 'SPORT-002',
    name: 'Performance Yoga Mat',
    description: 'Extra-thick 6mm non-slip yoga mat with alignment markings. Made from eco-friendly TPE material. Includes carrying strap. Suitable for yoga, pilates, and floor exercises.',
    short_description: '6mm thick, eco TPE, non-slip, with strap',
    category_id: '11111111-0000-0000-0000-000000000008',
    brand: 'ZenFit',
    price: 39.99,
    compare_at_price: 49.99,
    discount_percent: 20,
    status: 'ACTIVE',
    is_featured: false,
    tags: ['yoga', 'mat', 'fitness', 'eco-friendly', 'pilates'],
    attributes: { thickness: '6mm', material: 'Eco TPE', dimensions: '183cm x 61cm', color: 'Teal/Black' },
    images: [
      { url: 'https://images.unsplash.com/photo-1601925228881-bdb5ab8e16c1?w=600', alt_text: 'Performance Yoga Mat', is_primary: true },
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('[product-service] Seeding database...');
    await client.query('BEGIN');

    // Seed categories
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (id, name, slug, description, image_url, parent_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, slug=EXCLUDED.slug`,
        [cat.id, cat.name, cat.slug, cat.description || null, cat.image_url || null, cat.parent_id || null]
      );
      console.log(`  ✓ Category: ${cat.name}`);
    }

    // Seed products
    for (const p of products) {
      const slug = p.slug || slugify(p.name) + '-' + p.id.substring(0, 8);
      await client.query(
        `INSERT INTO products (id, sku, name, slug, description, short_description, category_id, brand, price, compare_at_price, discount_percent, status, is_featured, tags, attributes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, price=EXCLUDED.price, status=EXCLUDED.status`,
        [p.id, p.sku, p.name, slug, p.description, p.short_description, p.category_id, p.brand, p.price, p.compare_at_price, p.discount_percent, p.status, p.is_featured, p.tags, JSON.stringify(p.attributes)]
      );

      // Seed images
      for (let i = 0; i < p.images.length; i++) {
        const img = p.images[i];
        await client.query(
          `INSERT INTO product_images (product_id, url, alt_text, is_primary, sort_order)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING`,
          [p.id, img.url, img.alt_text, img.is_primary || false, i]
        );
      }
      console.log(`  ✓ Product: ${p.name}`);
    }

    await client.query('COMMIT');
    console.log('[product-service] Seed completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[product-service] Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
