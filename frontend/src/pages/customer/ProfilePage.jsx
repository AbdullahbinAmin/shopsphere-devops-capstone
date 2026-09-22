/**
 * ShopSphere — Customer Profile & Settings Page
 * Manage personal information, saved delivery addresses, and account security.
 */
import { useState, useEffect } from 'react';
import { 
  User, MapPin, Lock, Plus, Trash2, Edit2, 
  CheckCircle, AlertCircle, Save, Phone, Mail 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userAPI, authAPI } from '../../api/client';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Password Change Form State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
    phone: '',
    isDefault: false,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
      fetchAddresses();
    }
  }, [user]);

  const fetchAddresses = async () => {
    try {
      const res = await userAPI.getAddresses();
      setAddresses(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileData);
      addToast('Profile updated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      addToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      addToast('Password changed successfully', 'success');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      addToast(err.message || 'Failed to update password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAddressId) {
        await userAPI.updateAddress(editingAddressId, addressForm);
        addToast('Address updated successfully', 'success');
      } else {
        await userAPI.addAddress(addressForm);
        addToast('New address added', 'success');
      }
      setShowAddressModal(false);
      setEditingAddressId(null);
      fetchAddresses();
    } catch (err) {
      addToast(err.message || 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await userAPI.deleteAddress(id);
      addToast('Address removed', 'success');
      fetchAddresses();
    } catch (err) {
      addToast('Failed to delete address', 'error');
    }
  };

  return (
    <div className="container" style={{ padding: '40px 24px 80px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Account & Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal credentials, address book, and security settings.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 32, alignItems: 'start' }}>
        
        {/* Navigation Sidebar */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 12 }}>
          <button
            onClick={() => setActiveTab('profile')}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'profile' ? 'var(--color-primary-50)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'profile' ? 600 : 500,
              gap: 12
            }}
          >
            <User size={18} /> Personal Info
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'addresses' ? 'var(--color-primary-50)' : 'transparent',
              color: activeTab === 'addresses' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'addresses' ? 600 : 500,
              gap: 12
            }}
          >
            <MapPin size={18} /> Addresses ({addresses.length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: activeTab === 'security' ? 'var(--color-primary-50)' : 'transparent',
              color: activeTab === 'security' ? 'var(--color-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'security' ? 600 : 500,
              gap: 12
            }}
          >
            <Lock size={18} /> Security & Password
          </button>
        </div>

        {/* Content Area */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
          
          {/* TAB 1: Profile Information */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20 }}>Personal Information</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>First Name</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Last Name</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled
                    className="input-field"
                    style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }}
                  />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>Email cannot be altered once verified.</span>
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Phone Number</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
              >
                <Save size={18} /> {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          )}

          {/* TAB 2: Addresses */}
          {activeTab === 'addresses' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Saved Addresses</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Addresses saved here will be selectable during checkout.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm({
                      recipientName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
                      addressLine1: '',
                      addressLine2: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: 'United States',
                      phone: user?.phone || '',
                      isDefault: addresses.length === 0,
                    });
                    setShowAddressModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}
                >
                  <Plus size={16} /> Add Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                  <MapPin size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <p style={{ color: 'var(--text-secondary)' }}>No saved delivery addresses found.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      style={{
                        padding: 20,
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        position: 'relative'
                      }}
                    >
                      {addr.isDefault && (
                        <span className="badge badge-primary" style={{ position: 'absolute', top: 16, right: 16 }}>Default</span>
                      )}
                      <strong style={{ fontSize: '1rem', display: 'block', marginBottom: 6 }}>{addr.recipientName}</strong>
                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        <div>{addr.addressLine1}</div>
                        {addr.addressLine2 && <div>{addr.addressLine2}</div>}
                        <div>{addr.city}, {addr.state} {addr.postalCode}</div>
                        <div>{addr.country}</div>
                        {addr.phone && <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>{addr.phone}</div>}
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 16, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                        <button
                          onClick={() => {
                            setEditingAddressId(addr.id);
                            setAddressForm(addr);
                            setShowAddressModal(true);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="btn btn-ghost"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Security & Password */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSubmit} style={{ maxWidth: 460 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Change Password</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24 }}>
                Choose a strong password containing at least 8 characters with numbers and special symbols.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Current Password *</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>New Password *</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Confirm New Password *</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}
              >
                <Lock size={18} /> {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Address Edit/Create Modal */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 20 }}>
              {editingAddressId ? 'Edit Address' : 'Add New Address'}
            </h3>

            <form onSubmit={handleAddressSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Recipient Full Name *</label>
                <input
                  type="text"
                  value={addressForm.recipientName}
                  onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Street Address *</label>
                <input
                  type="text"
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Apt / Suite / Unit (Optional)</label>
                <input
                  type="text"
                  value={addressForm.addressLine2}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>City *</label>
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>State / Region *</label>
                <input
                  type="text"
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Postal Code *</label>
                <input
                  type="text"
                  value={addressForm.postalCode}
                  onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Phone</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                />
                <label htmlFor="isDefault" style={{ fontSize: '0.88rem', cursor: 'pointer' }}>
                  Set as default shipping address
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
