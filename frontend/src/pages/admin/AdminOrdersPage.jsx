/**
 * ShopSphere — Admin Orders Management Page
 * View global orders, inspect buyer info, and update fulfillment milestones.
 */
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Search, Filter, ChevronRight, 
  Clock, CheckCircle2, Truck, AlertCircle, Eye, RefreshCw 
} from 'lucide-react';
import { orderAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const { addToast } = useToast();

  const fetchOrders = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await orderAPI.getAllOrders(params);
      setOrders(res.data || []);
      if (res.meta) setPagination(res.meta);
    } catch (err) {
      addToast('Failed to load customer orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [statusFilter]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      await orderAPI.updateOrderStatus(orderId, { status: newStatus });
      addToast(`Order marked as ${newStatus}`, 'success');
      fetchOrders(pagination.page);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      addToast(err.message || 'Failed to update order status', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      case 'SHIPPED':
        return <span className="badge badge-info">Shipped</span>;
      case 'CONFIRMED':
      case 'PROCESSING':
        return <span className="badge badge-primary">Processing</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-warning">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Order Operations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review buyer transactions, process fulfillment, and update delivery statuses.</p>
        </div>
        <button
          onClick={() => fetchOrders(pagination.page)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-default)' }}
        >
          <RefreshCw size={16} /> Refresh Orders
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { label: 'All Orders', value: '' },
          { label: 'Pending', value: 'PENDING' },
          { label: 'Confirmed', value: 'CONFIRMED' },
          { label: 'Shipped', value: 'SHIPPED' },
          { label: 'Delivered', value: 'DELIVERED' },
          { label: 'Cancelled', value: 'CANCELLED' },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className="btn btn-ghost"
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: statusFilter === tab.value ? 'var(--color-primary)' : 'var(--bg-surface)',
              color: statusFilter === tab.value ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              fontSize: '0.85rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }}></div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ShoppingCart size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No orders found matching the selected filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>ORDER #</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>DATE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>CUSTOMER / ITEMS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>TOTAL</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>CURRENT STATUS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>SET STATUS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>DETAILS</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace' }}>
                      {order.orderNumber || order.id.substring(0, 8)}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{order.shippingAddress?.fullName || 'Customer'}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'items'}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                      ${parseFloat(order.totalAmount || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {getStatusBadge(order.status)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <select
                        value={order.status}
                        disabled={updatingId === order.id || order.status === 'CANCELLED'}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.82rem', height: 32 }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="btn btn-ghost"
                        style={{ padding: '6px 10px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Inspect Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Order #{selectedOrder.orderNumber || selectedOrder.id.substring(0, 8)}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Placed {new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
              <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: 6 }}>Shipping Details:</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div>{selectedOrder.shippingAddress?.fullName}</div>
                <div>{selectedOrder.shippingAddress?.addressLine1}</div>
                <div>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}</div>
                <div>{selectedOrder.shippingAddress?.country}</div>
              </div>
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Purchased Items</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {(selectedOrder.items || []).map(i => (
                <div key={i.id || i.productId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{i.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {i.quantity} × ${parseFloat(i.price).toFixed(2)}</div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    ${(parseFloat(i.price) * i.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: 16, marginBottom: 24 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total Paid:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>${parseFloat(selectedOrder.totalAmount || 0).toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
