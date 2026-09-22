/**
 * ShopSphere — Admin Layout Component
 * Provides responsive sidebar navigation and shell for the Admin Control Center.
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Boxes, ShoppingCart, 
  Users, ArrowLeft, LogOut, Shield, ExternalLink, Bell 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Products', path: '/admin/products', icon: Package },
    { label: 'Inventory', path: '/admin/inventory', icon: Boxes },
    { label: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { label: 'Users', path: '/admin/users', icon: Users },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Sidebar */}
      <aside 
        style={{ 
          width: 260, 
          background: 'var(--bg-surface)', 
          borderRight: '1px solid var(--border-default)', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 'var(--z-sticky)'
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Shield size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>ShopSphere</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', fontWeight: 600, letterSpacing: '0.05em' }}>ADMIN PORTAL</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  textDecoration: 'none',
                  fontSize: '0.92rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Footer Actions */}
        <div style={{ padding: 16, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            <ArrowLeft size={16} /> Back to Storefront
          </Link>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-primary-light)', textTransform: 'uppercase' }}>Administrator</div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="btn btn-ghost"
              style={{ padding: 6, color: 'var(--color-danger)' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto' }}>
        {/* Top Header */}
        <header style={{ height: 68, borderBottom: '1px solid var(--border-default)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            System Environment: <span className="badge badge-success" style={{ marginLeft: 6, fontSize: '0.72rem' }}>Local Microservices</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a
              href="http://localhost:3000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              API Gateway Docs <ExternalLink size={14} />
            </a>
          </div>
        </header>

        {/* Page Outlet */}
        <div style={{ padding: '32px 40px', flex: 1 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
