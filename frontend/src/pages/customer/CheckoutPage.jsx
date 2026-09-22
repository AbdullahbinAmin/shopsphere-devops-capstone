/**
 * ShopSphere — Checkout Page
 * Multi-step checkout experience with address, shipping, payment, and order review.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, CreditCard, Truck, CheckCircle, ArrowLeft, 
  Lock, AlertCircle, ShoppingBag, MapPin 
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { orderAPI, userAPI } from '../../api/client';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [shippingAddresses, setShippingAddresses] = useState([]);
  
  // Form State
  const [shippingAddress, setShippingAddress] = useState({
    fullName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phone: '',
  });

  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '4532 •••• •••• 8892',
    cardHolder: '',
    expiryMonth: '12',
    expiryYear: '2028',
    cvv: '123',
  });
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({});

  // Auto-populate user data if available
  useEffect(() => {
    if (user) {
      setShippingAddress(prev => ({
        ...prev,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.fullName,
      }));
      setCardDetails(prev => ({
        ...prev,
        cardHolder: `${user.firstName || ''} ${user.lastName || ''}`.trim() || prev.cardHolder,
      }));

      // Fetch saved addresses if any
      userAPI.getAddresses()
        .then(res => {
          if (res.data && res.data.length > 0) {
            setShippingAddresses(res.data);
            const def = res.data.find(a => a.isDefault) || res.data[0];
            setShippingAddress({
              fullName: def.recipientName || `${user.firstName} ${user.lastName}`,
              addressLine1: def.addressLine1 || '',
              addressLine2: def.addressLine2 || '',
              city: def.city || '',
              state: def.state || '',
              postalCode: def.postalCode || '',
              country: def.country || 'United States',
              phone: def.phone || '',
            });
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const items = cart?.items || [];

  // Price calculations
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1), 0);
  const shippingCost = shippingMethod === 'overnight' ? 24.99 : (shippingMethod === 'express' ? 14.99 : (subtotal >= 99.99 ? 0 : 9.99));
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  const total = (subtotal + shippingCost + tax).toFixed(2);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleCardChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const errs = {};
    if (!shippingAddress.fullName?.trim()) errs.fullName = 'Full name is required';
    if (!shippingAddress.addressLine1?.trim()) errs.addressLine1 = 'Street address is required';
    if (!shippingAddress.city?.trim()) errs.city = 'City is required';
    if (!shippingAddress.state?.trim()) errs.state = 'State / Province is required';
    if (!shippingAddress.postalCode?.trim()) errs.postalCode = 'Postal code is required';
    if (!cardDetails.cardHolder?.trim()) errs.cardHolder = 'Cardholder name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('Please correct the errors in the form before placing your order', 'error');
      return;
    }

    if (items.length === 0) {
      addToast('Your cart is empty', 'error');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku || `SKU-${item.productId.substring(0, 6)}`,
          imageUrl: item.imageUrl,
        })),
        shippingAddress,
        billingAddress: shippingAddress,
        shippingMethod,
        paymentMethod,
        paymentDetails: {
          cardNumber: cardDetails.cardNumber.replace(/\s+/g, ''),
          cardHolder: cardDetails.cardHolder,
          expiryMonth: cardDetails.expiryMonth,
          expiryYear: cardDetails.expiryYear,
          cvv: cardDetails.cvv,
        },
        notes,
      };

      const res = await orderAPI.createOrder(orderPayload);
      const createdOrder = res.data;

      // Clear the cart
      await clearCart();

      addToast('Order placed successfully! Confirmation email has been simulated.', 'success');
      navigate(`/orders/${createdOrder.id || ''}`);
    } catch (err) {
      const msg = err.message || err.error || 'Failed to place order. Please try again.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-surface)', padding: 48, borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)' }}>
          <ShoppingBag size={56} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: 12 }}>Your Cart is Empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
            Add some items to your cart before proceeding to checkout.
          </p>
          <Link to="/products" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Browse Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <Link to="/cart" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: 12 }}>
          <ArrowLeft size={16} /> Back to Cart
        </Link>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Secure Checkout</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Review your details and complete your order.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 32, alignItems: 'start' }}>
        
        {/* Left Column: Form Details */}
        <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Shipping Address Section */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                1
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Shipping Address</h2>
            </div>

            {shippingAddresses.length > 0 && (
              <div style={{ marginBottom: 20, padding: 12, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Saved Addresses:</span>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {shippingAddresses.map(addr => (
                    <button
                      type="button"
                      key={addr.id}
                      onClick={() => setShippingAddress({
                        fullName: addr.recipientName || `${user?.firstName} ${user?.lastName}`,
                        addressLine1: addr.addressLine1 || '',
                        addressLine2: addr.addressLine2 || '',
                        city: addr.city || '',
                        state: addr.state || '',
                        postalCode: addr.postalCode || '',
                        country: addr.country || 'United States',
                        phone: addr.phone || '',
                      })}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.85rem', padding: '6px 12px', border: '1px solid var(--border-default)' }}
                    >
                      <MapPin size={14} style={{ marginRight: 4 }} /> {addr.city}, {addr.state}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Recipient Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={shippingAddress.fullName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="e.g. Alex Morgan"
                  style={{ width: '100%', borderColor: errors.fullName ? 'var(--color-danger)' : undefined }}
                />
                {errors.fullName && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.fullName}</span>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Street Address *</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={shippingAddress.addressLine1}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="123 Innovation Boulevard, Suite 400"
                  style={{ width: '100%', borderColor: errors.addressLine1 ? 'var(--color-danger)' : undefined }}
                />
                {errors.addressLine1 && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.addressLine1}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Apt / Suite / Unit (Optional)</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={shippingAddress.addressLine2}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Apartment 4B"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>City *</label>
                <input
                  type="text"
                  name="city"
                  value={shippingAddress.city}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="San Francisco"
                  style={{ width: '100%', borderColor: errors.city ? 'var(--color-danger)' : undefined }}
                />
                {errors.city && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.city}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>State / Region *</label>
                <input
                  type="text"
                  name="state"
                  value={shippingAddress.state}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="California"
                  style={{ width: '100%', borderColor: errors.state ? 'var(--color-danger)' : undefined }}
                />
                {errors.state && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.state}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Postal / ZIP Code *</label>
                <input
                  type="text"
                  name="postalCode"
                  value={shippingAddress.postalCode}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="94107"
                  style={{ width: '100%', borderColor: errors.postalCode ? 'var(--color-danger)' : undefined }}
                />
                {errors.postalCode && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.postalCode}</span>}
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Country</label>
                <input
                  type="text"
                  name="country"
                  value={shippingAddress.country}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="United States"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={shippingAddress.phone}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="+1 (555) 019-2834"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Shipping Method Section */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                2
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Delivery Speed</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <label 
                style={{
                  border: `2px solid ${shippingMethod === 'standard' ? 'var(--color-primary)' : 'var(--border-default)'}`,
                  background: shippingMethod === 'standard' ? 'var(--color-primary-50)' : 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Standard Delivery</span>
                  <input 
                    type="radio" 
                    name="shippingMethod" 
                    checked={shippingMethod === 'standard'} 
                    onChange={() => setShippingMethod('standard')} 
                  />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>3-5 Business Days</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-success)', marginTop: 4 }}>
                  {subtotal >= 99.99 ? 'FREE' : '$9.99'}
                </span>
              </label>

              <label 
                style={{
                  border: `2px solid ${shippingMethod === 'express' ? 'var(--color-primary)' : 'var(--border-default)'}`,
                  background: shippingMethod === 'express' ? 'var(--color-primary-50)' : 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Express Priority</span>
                  <input 
                    type="radio" 
                    name="shippingMethod" 
                    checked={shippingMethod === 'express'} 
                    onChange={() => setShippingMethod('express')} 
                  />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>2 Business Days</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>$14.99</span>
              </label>

              <label 
                style={{
                  border: `2px solid ${shippingMethod === 'overnight' ? 'var(--color-primary)' : 'var(--border-default)'}`,
                  background: shippingMethod === 'overnight' ? 'var(--color-primary-50)' : 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Overnight Delivery</span>
                  <input 
                    type="radio" 
                    name="shippingMethod" 
                    checked={shippingMethod === 'overnight'} 
                    onChange={() => setShippingMethod('overnight')} 
                  />
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Next Morning Guaranteed</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 4 }}>$24.99</span>
              </label>
            </div>
          </div>

          {/* Payment Section */}
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-50)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                3
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Payment Method</h2>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>All transactions are simulated & encrypted</span>
              </div>
              <Lock size={18} style={{ color: 'var(--color-success)' }} />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${paymentMethod === 'CREDIT_CARD' ? 'var(--color-primary)' : 'var(--border-default)'}`,
                  background: paymentMethod === 'CREDIT_CARD' ? 'var(--color-primary-50)' : 'var(--bg-surface-2)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={18} /> Credit / Debit Card
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Cardholder Name *</label>
                <input
                  type="text"
                  name="cardHolder"
                  value={cardDetails.cardHolder}
                  onChange={handleCardChange}
                  className="input-field"
                  placeholder="Name on card"
                  style={{ width: '100%', borderColor: errors.cardHolder ? 'var(--color-danger)' : undefined }}
                />
                {errors.cardHolder && <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.cardHolder}</span>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Card Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="cardNumber"
                    value={cardDetails.cardNumber}
                    onChange={handleCardChange}
                    className="input-field"
                    placeholder="4000 1234 5678 9010"
                    style={{ width: '100%', paddingLeft: 40 }}
                  />
                  <CreditCard size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Expiry Month</label>
                <select 
                  name="expiryMonth" 
                  value={cardDetails.expiryMonth} 
                  onChange={handleCardChange}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Expiry Year</label>
                <select 
                  name="expiryYear" 
                  value={cardDetails.expiryYear} 
                  onChange={handleCardChange}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  {['2025', '2026', '2027', '2028', '2029', '2030'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>CVV / CVC</label>
                <input
                  type="password"
                  maxLength="4"
                  name="cvv"
                  value={cardDetails.cvv}
                  onChange={handleCardChange}
                  className="input-field"
                  placeholder="123"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.9rem', fontWeight: 600 }}>Order Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                rows="2"
                placeholder="Special delivery instructions or gate code..."
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
          </div>
        </form>

        {/* Right Column: Order Summary */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 24, position: 'sticky', top: 96 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 16 }}>Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})</h3>

          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {items.map(item => (
              <div key={item.productId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                  alt={item.name}
                  style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Qty: {item.quantity} × ${parseFloat(item.price).toFixed(2)}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span style={{ color: 'var(--text-primary)' }}>${subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Shipping ({shippingMethod})</span>
              <span style={{ color: shippingCost === 0 ? 'var(--color-success)' : 'var(--text-primary)' }}>
                {shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Estimated Tax (8%)</span>
              <span style={{ color: 'var(--text-primary)' }}>${tax.toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ color: 'var(--color-primary)' }}>${total}</span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 24, padding: 14, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                Processing Order...
              </>
            ) : (
              <>
                <ShieldCheck size={20} />
                Place Order (${total})
              </>
            )}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={13} /> 256-bit SSL Encrypted Demo Checkout
          </div>
        </div>
      </div>
    </div>
  );
}
