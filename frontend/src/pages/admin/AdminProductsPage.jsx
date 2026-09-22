/**
 * ShopSphere — Admin Products Management Page
 * CRUD operations for catalog products, categories, pricing, and visual assets.
 */
import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Search, Filter, 
  ExternalLink, Check, AlertCircle, Package 
} from 'lucide-react';
import { productAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0 });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    categoryId: '',
    sku: '',
    imageUrl: '',
    isFeatured: false,
  });

  const { addToast } = useToast();

  const loadData = async (page = 1) => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        productAPI.getProducts({ page, limit: 12, search, category: selectedCategory }),
        productAPI.getCategories(),
      ]);
      setProducts(prodRes.data || []);
      if (prodRes.meta) setPagination(prodRes.meta);
      setCategories(catRes.data || []);
    } catch (err) {
      addToast('Failed to load products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [search, selectedCategory]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      price: '',
      categoryId: categories[0]?.id || '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
      isFeatured: false,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setForm({
      name: prod.name || '',
      slug: prod.slug || '',
      description: prod.description || '',
      price: prod.price || '',
      categoryId: prod.categoryId || (categories[0]?.id || ''),
      sku: prod.sku || '',
      imageUrl: prod.imageUrl || '',
      isFeatured: !!prod.isFeatured,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };

      if (editingProduct) {
        await productAPI.updateProduct(editingProduct.id, payload);
        addToast('Product updated successfully', 'success');
      } else {
        await productAPI.createProduct(payload);
        addToast('Product created successfully', 'success');
      }
      setShowModal(false);
      loadData(pagination.page);
    } catch (err) {
      addToast(err.message || 'Failed to save product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productAPI.deleteProduct(id);
      addToast('Product deleted', 'success');
      loadData(pagination.page);
    } catch (err) {
      addToast(err.message || 'Failed to delete product', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Catalog Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Add, edit, and organize merchandise across all categories.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
        >
          <Plus size={18} /> Add New Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by title, SKU, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: 42 }}
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field"
          style={{ width: 220 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug || c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }}></div>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Package size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No products found matching your search query.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PRODUCT</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>CATEGORY</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PRICE</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>FEATURED</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {products.map(prod => (
                  <tr key={prod.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <img
                          src={prod.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}
                          alt={prod.name}
                          style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{prod.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {prod.id?.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {prod.sku || 'N/A'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge badge-info">{prod.categoryName || 'General'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                      ${parseFloat(prod.price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {prod.isFeatured ? (
                        <span className="badge badge-success">Featured</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Standard</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          className="btn btn-ghost"
                          style={{ padding: '6px 10px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(prod.id)}
                          className="btn btn-ghost"
                          style={{ padding: '6px 10px', fontSize: '0.82rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Create / Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 20 }}>
              {editingProduct ? 'Edit Catalog Product' : 'Add New Product'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Product Title *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="e.g. Ultra Wireless ANC Headphones"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="199.99"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>SKU Code *</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="WH-1000XM5"
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  required
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                  placeholder="https://..."
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                  rows="3"
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="Detailed product specifications and highlights..."
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="isFeaturedCheck"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                />
                <label htmlFor="isFeaturedCheck" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                  Highlight on Home Page as Featured Product
                </label>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
