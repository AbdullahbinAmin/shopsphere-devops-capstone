/**
 * ShopSphere — Home Page
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Truck, Star, ChevronRight, TrendingUp, Gift } from 'lucide-react';
import { productAPI } from '../../api/client';
import ProductCard from '../../components/product/ProductCard';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const [featRes, catRes] = await Promise.allSettled([
          productAPI.getFeatured(8),
          productAPI.getCategories(),
        ]);
        if (featRes.status === 'fulfilled') setFeaturedProducts(featRes.value.data || []);
        if (catRes.status === 'fulfilled') {
          const topLevel = catRes.value.data?.filter((c) => !c.parent_id) || [];
          setCategories(topLevel.slice(0, 6));
        }
      } catch { /* silent fail */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="animate-fade-in">
      {/* ---- Hero ---- */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              <span>New Collections Just Dropped</span>
            </div>
            <h1 className="hero-title">
              Discover Products <br />
              <span className="highlight">Beyond Ordinary</span>
            </h1>
            <p className="hero-description">
              Shop thousands of premium products across dozens of categories.
              Fast shipping, secure payments, and unbeatable prices — all in one place.
            </p>
            <div className="hero-actions">
              <Link to="/products" className="btn btn-primary btn-lg">
                Shop Now <ArrowRight size={18} />
              </Link>
              <Link to="/products?featured=true" className="btn btn-secondary btn-lg">
                View Featured
              </Link>
            </div>

            <div className="hero-stats">
              {[
                { value: '10K+', label: 'Products' },
                { value: '50K+', label: 'Customers' },
                { value: '4.9★', label: 'Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="hero-stat-value">{stat.value}</div>
                  <div className="hero-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Trust Badges ---- */}
      <section style={{ padding: 'var(--space-8) 0', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)' }}>
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over $99' },
              { icon: Shield, title: 'Secure Payment', desc: '256-bit SSL encryption' },
              { icon: Star, title: 'Quality Guarantee', desc: '100% authentic products' },
              { icon: Gift, title: 'Easy Returns', desc: '30-day return policy' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-4">
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  color: 'var(--color-primary-light)',
                }}>
                  <Icon size={22} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Categories ---- */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <div className="section-header">
              <div>
                <h2 className="section-title">Shop by Category</h2>
                <p className="section-subtitle">Explore our curated collection of categories</p>
              </div>
              <Link to="/products" className="btn btn-secondary btn-sm">
                All Categories <ChevronRight size={16} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="category-card"
                  onClick={() => navigate(`/products?category=${cat.slug}`)}
                >
                  <img
                    src={cat.image_url || `https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300`}
                    alt={cat.name}
                    className="category-card-image"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=300'; }}
                  />
                  <div className="category-card-name">{cat.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- Featured Products ---- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="hero-badge" style={{ marginBottom: 'var(--space-3)' }}>
                <TrendingUp size={14} /> <span>Trending Now</span>
              </div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Handpicked premium products just for you</p>
            </div>
            <Link to="/products?featured=true" className="btn btn-secondary btn-sm">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array(8).fill(0).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '1', marginBottom: '12px' }} />
                  <div className="skeleton" style={{ height: 16, marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: 16, width: '60%' }} />
                </div>
              ))}
            </div>
          ) : (
            <div className="products-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---- CTA Banner ---- */}
      <section style={{ padding: 'var(--space-12) 0' }}>
        <div className="container">
          <div style={{
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-12)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-30%', left: '-10%',
              width: '300px', height: '300px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-20%', right: '5%',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
            }} />
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 'var(--space-4)', position: 'relative' }}>
              Start Shopping Today
            </h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.85, marginBottom: 'var(--space-8)', position: 'relative' }}>
              Join over 50,000 satisfied customers. Free shipping on first order!
            </p>
            <div className="flex justify-center gap-4" style={{ position: 'relative' }}>
              <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: '#6C5CE7', fontWeight: 700 }}>
                Create Account Free
              </Link>
              <Link to="/products" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}>
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
