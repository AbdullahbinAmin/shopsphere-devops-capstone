/**
 * ShopSphere — Product Detail Page
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star, ChevronLeft, Truck, Shield, RefreshCw, Minus, Plus, Share2 } from 'lucide-react';
import { productAPI, inventoryAPI } from '../../api/client';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await productAPI.getProduct(id);
        setProduct(res.data);
        // Fetch inventory
        try {
          const invRes = await inventoryAPI.getInventory(id);
          setInventory(invRes.data);
        } catch { setInventory({ quantityAvailable: 0, isInStock: false }); }
      } catch { navigate('/products'); }
      setLoading(false);
    })();
  }, [id]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      toast.success(`${quantity}x ${product.name} added to cart!`);
    } catch (err) {
      toast.error(err?.message || 'Failed to add item');
    } finally { setAdding(false); }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)' }}>
          <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)' }} />
          <div>
            <div className="skeleton" style={{ height: 32, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 24 }} />
            <div className="skeleton" style={{ height: 48, marginBottom: 16 }} />
            <div className="skeleton" style={{ height: 100, marginBottom: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const rating = parseFloat(product.average_rating) || 4.5;
  const reviewCount = parseInt(product.review_count) || 0;
  const isInStock = inventory?.isInStock ?? (inventory?.quantityAvailable > 0);
  const isLowStock = inventory?.isLowStock && isInStock;

  const formatPrice = (p) => `$${parseFloat(p).toFixed(2)}`;
  const discount = parseFloat(product.discount_percent) || 0;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <a href="/products">Products</a>
        {product.category_name && <>
          <span className="breadcrumb-sep">›</span>
          <a href={`/products?category=${product.category_slug}`}>{product.category_name}</a>
        </>}
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-current">{product.name}</span>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)', alignItems: 'start' }}>
        {/* Images */}
        <div>
          <div style={{
            background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-xl)',
            overflow: 'hidden', aspectRatio: '1', marginBottom: 'var(--space-4)',
          }}>
            <img
              src={product.images?.[selectedImage]?.url || primaryImage?.url || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600'}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=600'; }}
            />
          </div>
          {/* Thumbnail row */}
          {product.images?.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(i)}
                  style={{
                    width: 72, height: 72, flexShrink: 0,
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', background: 'var(--bg-surface-2)',
                    border: `2px solid ${i === selectedImage ? 'var(--color-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>{product.brand}</div>}
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 'var(--space-3)' }}>{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <div className="stars">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} size={16} fill={s <= Math.round(rating) ? 'currentColor' : 'none'} />
              ))}
            </div>
            <span style={{ fontWeight: 600 }}>{rating.toFixed(1)}</span>
            <span className="text-muted text-sm">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
          </div>

          {/* Price */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <div className="flex items-center gap-4">
              <span style={{ fontSize: '2.2rem', fontWeight: 800 }}>{formatPrice(product.price)}</span>
              {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
                <span className="price-original" style={{ fontSize: '1.2rem' }}>{formatPrice(product.compare_at_price)}</span>
              )}
              {discount > 0 && <span className="price-discount" style={{ fontSize: '0.9rem' }}>Save {discount}%</span>}
            </div>
          </div>

          {/* Short description */}
          {product.short_description && (
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-5)', fontSize: '0.95rem' }}>
              {product.short_description}
            </p>
          )}

          {/* Stock Status */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            {isInStock ? (
              <span className="badge badge-success">
                {isLowStock ? `⚠️ Low Stock — Only ${inventory?.quantityAvailable} left` : '✓ In Stock'}
              </span>
            ) : (
              <span className="badge badge-danger">✕ Out of Stock</span>
            )}
          </div>

          {/* SKU */}
          <div className="text-sm text-muted mb-5">
            SKU: <strong style={{ color: 'var(--text-secondary)' }}>{product.sku}</strong>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 mb-5">
            <div className="quantity-control">
              <button className="quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></button>
              <span className="quantity-value">{quantity}</span>
              <button className="quantity-btn" onClick={() => setQuantity(Math.min(99, quantity + 1))}><Plus size={14} /></button>
            </div>
            <span className="text-sm text-muted">Max 99 per order</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <button
              className="btn btn-primary btn-lg"
              style={{ flex: 1 }}
              onClick={handleAddToCart}
              disabled={!isInStock || adding}
              id="product-add-to-cart"
            >
              {adding ? <span className="spinner" /> : <ShoppingCart size={20} />}
              {adding ? 'Adding...' : isInStock ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <button className="btn btn-secondary btn-icon btn-lg" title="Add to wishlist" id="product-wishlist">
              <Heart size={20} />
            </button>
            <button className="btn btn-secondary btn-icon btn-lg" title="Share" id="product-share">
              <Share2 size={20} />
            </button>
          </div>

          {/* Trust items */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
            {[
              { icon: Truck, text: 'Free shipping over $99' },
              { icon: Shield, text: 'Secure payment' },
              { icon: RefreshCw, text: '30-day returns' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex flex-col items-center text-center gap-2">
                <Icon size={20} style={{ color: 'var(--color-primary-light)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 'var(--space-12)' }}>
        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
          {['description', 'reviews', 'details'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: 'var(--space-3) var(--space-5)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.9rem',
                color: activeTab === tab ? 'var(--color-primary-light)' : 'var(--text-muted)',
                borderBottom: `2px solid ${activeTab === tab ? 'var(--color-primary)' : 'transparent'}`,
                transition: 'all 0.2s ease',
                marginBottom: -1,
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '0.95rem', maxWidth: 800 }}>
            {product.description || <em>No description available.</em>}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            {product.reviews?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: 700 }}>
                {product.reviews.map((review) => (
                  <div key={review.id} className="card card-padded">
                    <div className="flex items-center justify-between mb-2">
                      <strong>{review.user_name}</strong>
                      <div className="stars">{[1,2,3,4,5].map((s) => <Star key={s} size={12} fill={s <= review.rating ? 'currentColor' : 'none'} />)}</div>
                    </div>
                    {review.title && <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>{review.title}</div>}
                    <p className="text-secondary">{review.body}</p>
                    <div className="text-xs text-muted mt-2">{new Date(review.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No reviews yet. Be the first to review this product!</p>
            )}
          </div>
        )}

        {activeTab === 'details' && (
          <div className="grid-2" style={{ maxWidth: 600 }}>
            {[
              ['SKU', product.sku],
              ['Brand', product.brand || '—'],
              ['Category', product.category_name || '—'],
              ['Weight', product.weight_grams ? `${product.weight_grams}g` : '—'],
              ['Status', product.status],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                <div className="text-xs text-muted mb-1">{label}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
