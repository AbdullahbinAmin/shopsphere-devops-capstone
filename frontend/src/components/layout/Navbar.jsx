/**
 * ShopSphere — Navbar Component
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, User, ShoppingCart, Menu, X, Package, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { isAuthenticated, user, profile, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const displayName = profile ? `${profile.first_name}` : user?.email?.split('@')[0] || 'User';

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <ShoppingBag size={20} color="white" />
          </div>
          <span className="navbar-logo-text">ShopSphere</span>
        </Link>

        {/* Search */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <Search size={16} className="navbar-search-icon" />
          <input
            type="search"
            placeholder="Search products..."
            className="navbar-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="navbar-search"
          />
        </form>

        {/* Actions */}
        <div className="navbar-actions">
          {/* Cart */}
          <Link to="/cart" className="navbar-icon-btn" title="Cart" id="navbar-cart">
            <ShoppingCart size={20} />
            {cart.itemCount > 0 && (
              <span className="navbar-badge">{cart.itemCount > 99 ? '99+' : cart.itemCount}</span>
            )}
          </Link>

          {/* User Menu */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                className="navbar-icon-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                id="navbar-user-menu"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '0 12px' }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--gradient-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'white',
                }}>
                  {displayName[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {displayName}
                </span>
              </button>

              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)', padding: '8px',
                  minWidth: 200, zIndex: 'var(--z-dropdown)', boxShadow: 'var(--shadow-lg)',
                  animation: 'scaleIn 0.2s ease',
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                    {user?.role === 'ADMIN' && (
                      <span className="badge badge-primary" style={{ marginTop: '4px' }}>Admin</span>
                    )}
                  </div>

                  {user?.role === 'ADMIN' && (
                    <Link to="/admin" className="admin-nav-item" onClick={() => setUserMenuOpen(false)} style={{ borderRadius: '6px' }}>
                      <LayoutDashboard size={16} /> Admin Dashboard
                    </Link>
                  )}

                  <Link to="/orders" className="admin-nav-item" onClick={() => setUserMenuOpen(false)} style={{ borderRadius: '6px' }}>
                    <Package size={16} /> My Orders
                  </Link>

                  <Link to="/profile" className="admin-nav-item" onClick={() => setUserMenuOpen(false)} style={{ borderRadius: '6px' }}>
                    <User size={16} /> My Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="admin-nav-item"
                    style={{ width: '100%', background: 'none', border: 'none', borderRadius: '6px', color: 'var(--color-danger)', cursor: 'pointer' }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="btn btn-secondary btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </div>

      {/* Overlay for user menu */}
      {userMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 'calc(var(--z-dropdown) - 1)' }}
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </nav>
  );
}
