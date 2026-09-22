/**
 * ShopSphere — Footer Component
 */
import { Link } from 'react-router-dom';
import { ShoppingBag, Globe, Mail, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div>
            <Link to="/" className="navbar-logo">
              <div className="navbar-logo-icon">
                <ShoppingBag size={20} color="white" />
              </div>
              <span className="navbar-logo-text">ShopSphere</span>
            </Link>
            <p className="footer-brand-desc">
              Enterprise-grade e-commerce platform built with modern microservices architecture.
              Delivering premium shopping experiences at scale.
            </p>
            <div className="flex gap-3 mt-4">
              {[Globe, Mail, Share2].map((Icon, i) => (
                <a key={i} href="#" className="navbar-icon-btn" style={{ width: 36, height: 36 }}>
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="footer-heading">Shop</h4>
            <div className="footer-links">
              {['Electronics', 'Clothing', 'Home & Living', 'Sports', 'Books', 'Beauty'].map((cat) => (
                <Link key={cat} to={`/products?category=${cat.toLowerCase().replace(/ /g, '-')}`} className="footer-link">
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          {/* Account */}
          <div>
            <h4 className="footer-heading">Account</h4>
            <div className="footer-links">
              <Link to="/login" className="footer-link">Sign In</Link>
              <Link to="/register" className="footer-link">Create Account</Link>
              <Link to="/orders" className="footer-link">My Orders</Link>
              <Link to="/profile" className="footer-link">My Profile</Link>
              <Link to="/cart" className="footer-link">Shopping Cart</Link>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="footer-heading">Information</h4>
            <div className="footer-links">
              <a href="#" className="footer-link">About ShopSphere</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
              <a href="#" className="footer-link">Shipping Policy</a>
              <a href="#" className="footer-link">Contact Us</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} ShopSphere. Built as an Enterprise DevOps Capstone Project.
          </p>
          <div className="flex gap-4">
            <span className="badge badge-success">v1.0.0</span>
            <span className="badge badge-primary">Microservices</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
