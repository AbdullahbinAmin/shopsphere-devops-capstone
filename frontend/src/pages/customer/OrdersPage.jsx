/**
 * ShopSphere — Customer Orders Page
 * Displays list of user's past and active orders with statuses and details.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, ChevronRight, Clock, CheckCircle2, AlertCircle, 
  Truck, ArrowRight, ShoppingBag, ExternalLink, Calendar, DollarSign 
} from 'lucide-react';
import { orderAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const { addToast } = useToast();

  const fetchOrders = async (page = 1, status = '') => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (status && status !== 'ALL') params.status = status;
      const res = await orderAPI.getOrders(params);
      setOrders(res.data || []);
      if (res.meta) setPagination(res.meta);
    } catch (err) {
      addToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, activeFilter);
  }, [activeFilter]);

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return <span className="badge badge-success"><CheckCircle2 size={12} style={{ marginRight: 4 }} /> Delivered</span>;
      case 'SHIPPED':
        return <span className="badge badge-info"><Truck size={12} style={{ marginRight: 4 }} /> In Transit</span>;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <span className="badge badge-primary"><Clock size={12} style={{ marginRight: 4 }} /> Processing</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger"><AlertCircle size={12} style={{ marginRight: 4 }} /> Cancelled</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8 }}>My Order History</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track shipments, view receipts, and manage your recent purchases.</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 28, borderBottom: '1px solid var(--border-default)' }}>
        {[
          { label: 'All Orders', value: 'ALL' },
          { label: 'Processing', value: 'PROCESSING' },
          { label: 'Shipped', value: 'SHIPPED' },
          { label: 'Delivered', value: 'DELIVERED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className="btn btn-ghost"
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              background: activeFilter === tab.value ? 'var(--color-primary)' : 'transparent',
              color: activeFilter === tab.value ? '#fff' : 'var(--text-secondary)',
              fontWeight: activeFilter === tab.value ? 600 : 400,
              fontSize: '0.9rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" style={{ width: 40, height: 40 }}></div>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <Package size={56} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>No Orders Found</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 24px' }}>
            {activeFilter === 'ALL'
              ? "You haven't placed any orders yet. Discover high quality products in our catalog!"
              : `You have no orders matching the "${activeFilter}" filter.`}
          </p>
          <Link to="/products" className="btn btn-primary">
            Start Shopping <ArrowRight size={16} style={{ marginLeft: 6 }} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {orders.map(order => (
            <div
              key={order.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                transition: 'border-color var(--transition-fast)'
              }}
            >
              {/* Order Header */}
              <div style={{ padding: '18px 24px', background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block' }}>Order Placed</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block' }}>Total Amount</span>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-primary)' }}>
                      ${parseFloat(order.totalAmount || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block' }}>Order Number</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                      {order.orderNumber || order.id.substring(0, 8)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {getStatusBadge(order.status)}
                  <Link
                    to={`/orders/${order.id}`}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.85rem', padding: '6px 14px', border: '1px solid var(--border-default)' }}
                  >
                    View Details <ChevronRight size={14} style={{ marginLeft: 4 }} />
                  </Link>
                </div>
              </div>

              {/* Order Items Preview */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {(order.items || []).map(item => (
                    <div key={item.id || item.productId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120'}
                          alt={item.name}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                        />
                        <div>
                          <Link to={`/products/${item.productId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                            {item.name}
                          </Link>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 2 }}>
                            Quantity: {item.quantity} • Unit Price: ${parseFloat(item.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => fetchOrders(p, activeFilter)}
                  className="btn btn-ghost"
                  style={{
                    width: 38,
                    height: 38,
                    padding: 0,
                    borderRadius: 'var(--radius-md)',
                    background: pagination.page === p ? 'var(--color-primary)' : 'var(--bg-surface)',
                    color: pagination.page === p ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-default)'
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
