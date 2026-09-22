/**
 * ShopSphere — Admin Dashboard Overview Page
 * Real-time business metrics, active orders, inventory alerts, and microservice status.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, ShoppingBag, DollarSign, AlertTriangle, 
  Package, Users, ArrowUpRight, CheckCircle2, Clock, Truck 
} from 'lucide-react';
import { orderAPI, productAPI, inventoryAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [ordersRes, productsRes, inventoryRes] = await Promise.allSettled([
          orderAPI.getAllOrders({ page: 1, limit: 5 }),
          productAPI.getProductStats(),
          inventoryAPI.getLowStock(),
        ]);

        let orders = [];
        let totalOrdersCount = 0;
        let revenue = 0;

        if (ordersRes.status === 'fulfilled') {
          orders = ordersRes.value.data || [];
          totalOrdersCount = ordersRes.value.meta?.total || orders.length;
          revenue = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || 0), 0);
          setRecentOrders(orders);
        }

        let totalProds = 0;
        if (productsRes.status === 'fulfilled') {
          totalProds = productsRes.value.data?.totalProducts || 0;
        }

        let lowStock = [];
        if (inventoryRes.status === 'fulfilled') {
          lowStock = inventoryRes.value.data || [];
          setLowStockItems(lowStock.slice(0, 5));
        }

        setStats({
          totalSales: revenue,
          totalOrders: totalOrdersCount,
          totalProducts: totalProds,
          lowStockCount: lowStock.length,
        });
      } catch (err) {
        addToast('Error loading dashboard data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner" style={{ width: 44, height: 44 }}></div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8 }}>Operations Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Welcome to the ShopSphere enterprise administration dashboard.</p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 36 }}>
        
        {/* Total Revenue */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Recent Gross Sales</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>${stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-50)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={14} /> +12.4% vs last period
          </div>
        </div>

        {/* Total Orders */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Orders</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{stats.totalOrders}</h3>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(0, 206, 201, 0.1)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Across all microservices
          </div>
        </div>

        {/* Active Catalog Products */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Catalog</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4 }}>{stats.totalProducts}</h3>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(108, 92, 231, 0.1)', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            In PostgreSQL Product Service
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Low Stock Warnings</span>
              <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: 4, color: stats.lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                {stats.lowStockCount}
              </h3>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'rgba(253, 203, 110, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', color: stats.lowStockCount > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {stats.lowStockCount > 0 ? 'Restocking required' : 'Inventory levels optimal'}
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Inventory Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: 28 }}>
        
        {/* Recent Orders Table */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Recent Orders</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Latest incoming customer transactions</span>
            </div>
            <Link to="/admin/orders" className="btn btn-ghost" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No customer orders placed yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>ORDER #</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>ITEMS</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>TOTAL</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 12px', fontWeight: 600, fontFamily: 'monospace' }}>
                        {order.orderNumber || order.id.substring(0, 8)}
                      </td>
                      <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>
                        {order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'items'}
                      </td>
                      <td style={{ padding: '14px 12px', fontWeight: 700 }}>
                        ${parseFloat(order.totalAmount || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '14px 12px' }}>
                        <span className="badge badge-primary">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Warning Card */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Stock Watchlist</h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Products nearing threshold</span>
            </div>
            <Link to="/admin/inventory" className="btn btn-ghost" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              Manage <ArrowUpRight size={14} />
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={36} style={{ color: 'var(--color-success)', marginBottom: 8 }} />
              <p>All stock levels healthy!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {lowStockItems.map(item => (
                <div key={item.productId || item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.productName || item.sku || `Product ${item.productId?.substring(0, 6)}`}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {item.sku || 'N/A'}</div>
                  </div>
                  <span className="badge badge-warning">
                    {item.availableQuantity ?? item.quantity ?? 0} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
