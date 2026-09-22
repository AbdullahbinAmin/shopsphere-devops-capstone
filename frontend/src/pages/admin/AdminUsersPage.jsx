/**
 * ShopSphere — Admin Users Directory Page
 * View registered accounts across customer and administrator roles.
 */
import { useState, useEffect } from 'react';
import { Users, Search, Shield, User, Mail, Calendar, RefreshCw } from 'lucide-react';
import { userAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userAPI.getAllUsers();
      setUsers(res.data || []);
    } catch (err) {
      addToast('Failed to load user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
    (u.firstName && u.firstName.toLowerCase().includes(search.toLowerCase())) ||
    (u.lastName && u.lastName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Account Directory</h1>
          <p style={{ color: 'var(--text-secondary)' }}>View authenticated user profiles and permissions across the platform.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-default)' }}
        >
          <RefreshCw size={16} /> Refresh Users
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 24, maxWidth: 360 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: 42 }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }}></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Users size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No user accounts matched your search criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>USER</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>EMAIL</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PHONE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>ROLE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>REGISTERED DATE</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--color-primary-light)' }}>
                          {(u.firstName?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ID: {u.id?.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {u.phone || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {u.role === 'ADMIN' ? (
                        <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Shield size={12} /> ADMIN
                        </span>
                      ) : (
                        <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <User size={12} /> CUSTOMER
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
