/**
 * ShopSphere — Cart Page
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ArrowRight, Tag, RefreshCw } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export default function CartPage() {
  const { cart, updateItem, removeItem, clearCart, fetchCart } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [removing, setRemoving] = useState({});

  const handleRemove = async (productId) => {
    setRemoving((prev) => ({ ...prev, [productId]: true }));
    try {
      await removeItem(productId);
      toast.success('Item removed from cart');
    } catch { toast.error('Failed to remove item'); }
    setRemoving((prev) => ({ ...prev, [productId]: false }));
  };

  const handleQuantityChange = async (productId, quantity) => {
    try { await updateItem(productId, quantity); } catch { toast.error('Failed to update quantity'); }
  };

  const handleSync = async () => {
    setSyncing(true);
    await fetchCart();
    setSyncing(false);
    toast.info('Cart prices updated');
  };

  const formatPrice = (p) => `$${parseFloat(p || 0).toFixed(2)}`;

  if (cart.items?.length === 0) {
    return (
      <div className="container animate-fade-in" style={{ paddingTop: 'var(--space-16)', paddingBottom: 'var(--space-16)', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: 'var(--space-6)' }}>🛒</div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: 'var(--space-4)' }}>Your cart is empty</h2>
        <p className="text-muted mb-8">Looks like you haven't added anything yet. Start shopping!</p>
        <Link to="/products" className="btn btn-primary btn-lg">
          <ShoppingCart size={20} /> Start Shopping
        </Link>
      </div>
    );
  }

  const shippingFree = cart.subtotal >= 99.99;
  const shippingCost = shippingFree ? 0 : 9.99;
  const tax = Math.round(cart.subtotal * 0.08 * 100) / 100;
  const total = Math.round((cart.subtotal + shippingCost + tax) * 100) / 100;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Shopping Cart</h1>
        <div className="flex gap-3">
          <button className="btn btn-secondary btn-sm" onClick={handleSync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync Prices
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearCart}>
            <Trash2 size={14} /> Clear All
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-8)', alignItems: 'start' }}>
        {/* Cart Items */}
        <div>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 130px 100px 40px',
            gap: 'var(--space-4)', padding: '0 var(--space-4) var(--space-3)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {['Product', 'Quantity', 'Price', ''].map((h) => (
              <span key={h} style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{h}</span>
            ))}
          </div>

          {cart.items.map((item) => (
            <div key={item.productId} style={{
              display: 'grid', gridTemplateColumns: '1fr 130px 100px 40px',
              gap: 'var(--space-4)', alignItems: 'center',
              padding: 'var(--space-4)', borderBottom: '1px solid var(--border-subtle)',
              opacity: removing[item.productId] ? 0.5 : 1, transition: 'opacity 0.2s',
            }}>
              {/* Product Info */}
              <div className="flex gap-4 items-center">
                <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-surface-2)', flexShrink: 0 }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                </div>
                <div>
                  <Link to={`/products/${item.productId}`} style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '4px', fontSize: '0.9rem' }}>
                    {item.name}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-primary-light)', marginTop: '4px' }}>
                    {formatPrice(item.price)} each
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div className="quantity-control">
                <button className="quantity-btn" onClick={() => handleQuantityChange(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}>
                  <Minus size={12} />
                </button>
                <span className="quantity-value">{item.quantity}</span>
                <button className="quantity-btn" onClick={() => handleQuantityChange(item.productId, item.quantity + 1)} disabled={item.quantity >= 99}>
                  <Plus size={12} />
                </button>
              </div>

              {/* Subtotal */}
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                {formatPrice(item.price * item.quantity)}
              </div>

              {/* Remove */}
              <button
                className="btn btn-danger btn-icon btn-sm"
                onClick={() => handleRemove(item.productId)}
                disabled={removing[item.productId]}
                id={`remove-cart-item-${item.productId}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div className="flex justify-between mt-6">
            <Link to="/products" className="btn btn-secondary">
              <ArrowLeft size={16} /> Continue Shopping
            </Link>
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ position: 'sticky', top: 88 }}>
          <div className="card card-padded">
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-5)' }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Subtotal ({cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''})</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Shipping</span>
                <span style={{ fontWeight: 600, color: shippingFree ? 'var(--color-success)' : undefined }}>
                  {shippingFree ? 'FREE' : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary">Tax (8%)</span>
                <span style={{ fontWeight: 600 }}>{formatPrice(tax)}</span>
              </div>
              {cart.savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">You Save</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>-{formatPrice(cart.savings)}</span>
                </div>
              )}
            </div>

            <div className="divider" />

            <div className="flex justify-between mb-6">
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: '1.4rem' }}>{formatPrice(total)}</span>
            </div>

            {!shippingFree && (
              <div style={{ background: 'var(--color-primary-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-5)', fontSize: '0.8rem', color: 'var(--color-primary-light)' }}>
                <Tag size={14} style={{ display: 'inline', marginRight: 6 }} />
                Add {formatPrice(99.99 - cart.subtotal)} more for free shipping!
              </div>
            )}

            <button
              className="btn btn-primary w-full btn-lg"
              onClick={() => navigate('/checkout')}
              id="proceed-to-checkout"
            >
              Proceed to Checkout <ArrowRight size={18} />
            </button>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🔒 Secure checkout with SSL encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
