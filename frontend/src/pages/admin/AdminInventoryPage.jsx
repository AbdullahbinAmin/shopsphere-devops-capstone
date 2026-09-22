/**
 * ShopSphere — Admin Inventory Management Page
 * Stock level adjustments, reservation tracking, and low-stock alerts.
 */
import { useState, useEffect } from 'react';
import { 
  Boxes, AlertTriangle, RefreshCw, Plus, Minus, 
  Search, CheckCircle2, ArrowUpDown 
} from 'lucide-react';
import { inventoryAPI, productAPI } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function AdminInventoryPage() {
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [adjustModal, setAdjustModal] = useState(null); // { productId, name, currentQty }
  const [adjustAmount, setAdjustAmount] = useState(10);
  const { addToast } = useToast();

  const loadInventory = async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getAllInventory();
      setInventoryList(res.data || []);
    } catch (err) {
      addToast('Failed to load inventory levels', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleStockUpdate = async (productId, delta) => {
    setUpdatingId(productId);
    try {
      await inventoryAPI.updateStock(productId, {
        operation: 'ADD',
        quantity: delta,
      });
      addToast(`Stock updated by ${delta > 0 ? `+${delta}` : delta}`, 'success');
      loadInventory();
    } catch (err) {
      addToast(err.message || 'Failed to update stock', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCustomAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal) return;

    try {
      await inventoryAPI.updateStock(adjustModal.productId, {
        operation: 'SET',
        quantity: parseInt(adjustAmount, 10),
      });
      addToast('Inventory count adjusted', 'success');
      setAdjustModal(null);
      loadInventory();
    } catch (err) {
      addToast(err.message || 'Failed to adjust inventory', 'error');
    }
  };

  const filteredItems = inventoryList.filter(item => 
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
    (item.productName && item.productName.toLowerCase().includes(search.toLowerCase())) ||
    (item.productId && item.productId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Inventory Controls</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor warehouse availability, pending reservations, and replenish stock.</p>
        </div>
        <button
          onClick={loadInventory}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border-default)' }}
        >
          <RefreshCw size={16} /> Refresh Stock
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: 24, maxWidth: 400 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by SKU or product ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: 42 }}
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: 36, height: 36 }}></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Boxes size={44} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p>No inventory records found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>PRODUCT / SKU</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>AVAILABLE STOCK</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>RESERVED</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>TOTAL CAPACITY</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>QUICK ADJUST</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const available = item.availableQuantity ?? (item.quantity - (item.reservedQuantity || 0));
                  const isLow = available <= (item.lowStockThreshold || 10);
                  const isOut = available <= 0;

                  return (
                    <tr key={item.productId || item.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.productName || `Product ${item.productId?.substring(0, 8)}`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          SKU: {item.sku || 'N/A'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: isOut ? 'var(--color-danger)' : (isLow ? 'var(--color-warning)' : 'var(--text-primary)') }}>
                          {available}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {item.reservedQuantity || 0}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        {item.quantity || 0}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isOut ? (
                          <span className="badge badge-danger">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-warning">Low Stock</span>
                        ) : (
                          <span className="badge badge-success">In Stock</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleStockUpdate(item.productId, -5)}
                            disabled={updatingId === item.productId || available < 5}
                            title="Decrease by 5"
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)' }}
                          >
                            -5
                          </button>
                          <button
                            onClick={() => handleStockUpdate(item.productId, 10)}
                            disabled={updatingId === item.productId}
                            title="Add 10 units"
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', border: '1px solid var(--border-subtle)' }}
                          >
                            +10
                          </button>
                          <button
                            onClick={() => {
                              setAdjustModal({
                                productId: item.productId,
                                name: item.productName || item.sku,
                                currentQty: item.quantity,
                              });
                              setAdjustAmount(item.quantity);
                            }}
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                          >
                            Set Total
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set Total Stock Modal */}
      {adjustModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 'var(--z-modal)', padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-xl)', padding: 28, maxWidth: 420, width: '100%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Set Inventory Total</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: 20 }}>
              Adjust total warehouse inventory capacity for <strong>{adjustModal.name}</strong>.
            </p>

            <form onSubmit={handleCustomAdjustSubmit}>
              <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>New Quantity Count *</label>
              <input
                type="number"
                min="0"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="input-field"
                style={{ width: '100%', marginBottom: 24 }}
                required
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Stock Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
