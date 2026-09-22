/**
 * ShopSphere — Product Card Component
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProductCard({ product }) {
  const [adding, setAdding] = useState(false);
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const hasDiscount = product.discount_percent > 0;
  const isNew = new Date(product.created_at) > new Date(Date.now() - 14 * 24 * 3600 * 1000);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    setAdding(true);
    try {
      await addItem(product.id, 1);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const formatPrice = (price) => `$${parseFloat(price).toFixed(2)}`;
  const rating = parseFloat(product.average_rating) || 4.5;
  const reviewCount = parseInt(product.review_count) || 0;

  return (
    <Link to={`/products/${product.id}`} className="product-card" style={{ display: 'block' }}>
      <div className="product-card-image">
        {primaryImage ? (
          <img
            src={primaryImage.url}
            alt={primaryImage.alt_text || product.name}
            loading="lazy"
            onError={(e) => { e.target.src = `https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400`; }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No Image
          </div>
        )}

        {/* Badges */}
        {hasDiscount && (
          <span className="product-card-badge badge-sale">-{product.discount_percent}%</span>
        )}
        {!hasDiscount && isNew && (
          <span className="product-card-badge badge-new">New</span>
        )}
        {product.is_featured && !hasDiscount && !isNew && (
          <span className="product-card-badge badge-featured">Featured</span>
        )}

        {/* Wishlist */}
        <button className="product-card-wishlist" onClick={(e) => e.preventDefault()} aria-label="Add to wishlist">
          <Heart size={14} />
        </button>
      </div>

      <div className="product-card-body">
        {product.category_name && (
          <div className="product-card-category">{product.category_name}</div>
        )}
        <div className="product-card-name">{product.name}</div>

        {/* Rating */}
        <div className="product-card-rating">
          <div className="stars">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} size={12} fill={s <= Math.round(rating) ? 'currentColor' : 'none'} />
            ))}
          </div>
          {reviewCount > 0 && <span className="rating-count">({reviewCount})</span>}
        </div>

        <div className="product-card-pricing">
          <span className="price-current">{formatPrice(product.price)}</span>
          {product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) && (
            <>
              <span className="price-original">{formatPrice(product.compare_at_price)}</span>
              <span className="price-discount">Save {formatPrice(parseFloat(product.compare_at_price) - parseFloat(product.price))}</span>
            </>
          )}
        </div>
      </div>

      <div className="product-card-footer">
        <button
          className="product-card-add-btn"
          onClick={handleAddToCart}
          disabled={adding}
          id={`add-to-cart-${product.id}`}
        >
          {adding ? (
            <span className="spinner" style={{ width: 16, height: 16 }} />
          ) : (
            <ShoppingCart size={16} />
          )}
          {adding ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
}
