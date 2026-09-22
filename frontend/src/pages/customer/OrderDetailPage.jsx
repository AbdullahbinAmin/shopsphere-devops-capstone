/**
 * ShopSphere — Order Detail Page
 * Comprehensive view of an order with shipment timeline, line items, and cancellation.
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, Truck, CheckCircle2, Clock, 
  AlertCircle, MapPin, CreditCard, ShieldAlert, Ban 
} from 'lucide-react';
import { orderAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const { addToast } = useToast();

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await orderAPI.getOrder(id);
      setOrder(res.data);
    } catch (err) {
      addToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      addToast('Please provide a reason for cancellation', 'error');
      return;
    }

    setCancelling(true);
    try {
      await orderAPI.cancelOrder(id, cancelReason);
      addToast('Order has been cancelled successfully', 'success');
      setShowCancelModal(false);
      fetchOrder();
    } catch (err) {
      addToast(err.message || 'Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 44, height: 44 }}></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2>Order Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>The requested order does not exist or you lack access.</p>
        <Link to="/orders" className="btn btn-primary" style={{ marginTop: 24, display: 'inline-block' }}>
          Back to Orders
        </Link>
      </div>
    );
  }

  const steps = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const currentStepIdx = steps.indexOf((order.status || '').toUpperCase());
  const isCancelled = order.status?.toUpperCase() === 'CANCELLED';

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to My Orders
      </Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Order #{order.orderNumber || order.id.substring(0, 8)}</h1>
            {isCancelled ? (
              <span className="badge badge-danger">Cancelled</span>
            ) : (
              <span className="badge badge-primary">{order.status}</span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Cancellation Button if eligible */}
        {!isCancelled && ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status?.toUpperCase()) && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="btn btn-outline"
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
          >
            <Ban size={16} style={{ marginRight: 6 }} /> Cancel Order
          </button>
        )}
      </div>

      {/* Shipment Timeline / Progress Tracker */}
      {!isCancelled && (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '28px 32px', marginBottom: 32 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24 }}>Fulfillment Status</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            {steps.map((st, idx) => {
              const isCompleted = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, width: 100, textAlign: 'center' }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--color-primary)' : 'var(--bg-surface-2)',
                      border: `2px solid ${isCompleted ? 'var(--color-primary)' : 'var(--border-default)'}`,
                      color: isCompleted ? '#fff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 8,
                      boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none'
                    }}
                  >
                    {idx === 0 && <Clock size={18} />}
                    {idx === 1 && <CheckCircle2 size={18} />}
                    {idx === 2 && <Truck size={18} />}
                    {idx === 3 && <Package size={18} />}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: isCompleted ? 600 : 400, color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {st === 'PENDING' ? 'Order Placed' : st === 'CONFIRMED' ? 'Confirmed' : st === 'SHIPPED' ? 'Shipped' : 'Delivered'}
                  </span>
                </div>
              );
            })}
            {/* Progress line */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 50,
                right: 50,
                height: 3,
                background: 'var(--bg-surface-3)',
                zIndex: 1
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: 'var(--color-primary)',
                  width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%`,
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grid: Order Info & Items */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 32 }}>
        
        {/* Left Column: Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Order Items</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {(order.items || []).map(item => (
                <div key={item.id || item.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=140'}
                      alt={item.name}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                    />
                    <div>
                      <Link to={`/products/${item.productId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
                        {item.name}
                      </Link>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>
                        SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku || 'N/A'}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Qty: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Payment Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--color-primary)' }}>
                <MapPin size={20} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Shipping Address</h4>
              </div>
              {order.shippingAddress ? (
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{order.shippingAddress.fullName}</strong>
                  <div>{order.shippingAddress.addressLine1}</div>
                  {order.shippingAddress.addressLine2 && <div>{order.shippingAddress.addressLine2}</div>}
                  <div>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</div>
                  <div>{order.shippingAddress.country}</div>
                  {order.shippingAddress.phone && <div style={{ marginTop: 4 }}>Phone: {order.shippingAddress.phone}</div>}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Standard Shipping Address</p>
              )}
            </div>

            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--color-secondary)' }}>
                <CreditCard size={20} />
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Payment Details</h4>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>Method: <strong style={{ color: 'var(--text-primary)' }}>{order.paymentMethod || 'Credit Card'}</strong></div>
                <div>Payment Status: <span className="badge badge-success" style={{ marginLeft: 6 }}>Paid</span></div>
                <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Transaction processed securely via simulated payment gateway.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Financial Summary */}
        <div>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24, position: 'sticky', top: 96 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 20 }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span style={{ color: 'var(--text-primary)' }}>${parseFloat(order.subtotal || order.totalAmount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Shipping</span>
                <span style={{ color: 'var(--text-primary)' }}>${parseFloat(order.shippingAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Tax</span>
                <span style={{ color: 'var(--text-primary)' }}>${parseFloat(order.taxAmount || 0).toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 800 }}>
                <span>Total Paid</span>
                <span style={{ color: 'var(--color-primary)' }}>${parseFloat(order.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>

            {order.notes && (
              <div style={{ marginTop: 24, padding: 14, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Order Notes:</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{order.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 480, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <ShieldAlert size={28} style={{ color: 'var(--color-danger)' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Cancel Order #{order.orderNumber}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              Are you sure you want to cancel this order? This will release the reserved inventory and process a refund to your original payment method.
            </p>

            <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.88rem', fontWeight: 600 }}>Reason for cancellation *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input-field"
              rows="3"
              placeholder="e.g. Changed my mind, found a better price, ordered by mistake..."
              style={{ width: '100%', resize: 'none', marginBottom: 24 }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn btn-ghost"
                disabled={cancelling}
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="btn btn-danger"
                disabled={cancelling}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
