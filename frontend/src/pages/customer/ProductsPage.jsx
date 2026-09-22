/**
 * ShopSphere — Products Listing Page
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Grid, List, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { productAPI } from '../../api/client';
import ProductCard from '../../components/product/ProductCard';

const SORT_OPTIONS = [
  { value: 'created_at-DESC', label: 'Newest First' },
  { value: 'price-ASC', label: 'Price: Low to High' },
  { value: 'price-DESC', label: 'Price: High to Low' },
  { value: 'name-ASC', label: 'Name: A to Z' },
  { value: 'discount-DESC', label: 'Best Discount' },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'created_at',
    sortOrder: searchParams.get('sortOrder') || 'DESC',
    featured: searchParams.get('featured') || '',
    page: parseInt(searchParams.get('page')) || 1,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;
      if (filters.featured) params.featured = filters.featured;

      const res = await productAPI.getProducts(params);
      setProducts(res.data || []);
      setPagination(res.pagination);
    } catch { setProducts([]); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== '' && v !== '1') params.set(k, v); });
    setSearchParams(params, { replace: true });
  }, [filters]);

  useEffect(() => {
    productAPI.getCategories().then((res) => {
      setCategories(res.data?.filter((c) => !c.parent_id) || []);
    }).catch(() => {});
  }, []);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', minPrice: '', maxPrice: '', sortBy: 'created_at', sortOrder: 'DESC', featured: '', page: 1 });
  };

  const [sortValue, setSortValue] = useState(`${filters.sortBy}-${filters.sortOrder}`);

  const handleSortChange = (val) => {
    setSortValue(val);
    const [sortBy, sortOrder] = val.split('-');
    setFilters((prev) => ({ ...prev, sortBy, sortOrder, page: 1 }));
  };

  const hasActiveFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.featured;

  return (
    <div className="container animate-fade-in" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-12)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {filters.search ? `Results for "${filters.search}"` :
             filters.category ? filters.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) :
             filters.featured ? 'Featured Products' : 'All Products'}
          </h1>
          {pagination && (
            <p className="text-muted text-sm mt-1">{pagination.total.toLocaleString()} products found</p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {hasActiveFilters && (
            <button className="btn btn-danger btn-sm" onClick={clearFilters}>
              <X size={14} /> Clear Filters
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={16} /> Filters
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showFilters ? '250px 1fr' : '1fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-4)' }}>Filters</h3>

            {/* Search */}
            <div className="filter-section">
              <div className="filter-title">Search</div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  style={{ paddingLeft: 32 }}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="filter-section">
              <div className="filter-title">Category</div>
              <div
                className={`filter-option${!filters.category ? ' active' : ''}`}
                onClick={() => updateFilter('category', '')}
              >All Categories</div>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`filter-option${filters.category === cat.slug ? ' active' : ''}`}
                  onClick={() => updateFilter('category', cat.slug)}
                >
                  {cat.name}
                </div>
              ))}
            </div>

            {/* Price Range */}
            <div className="filter-section">
              <div className="filter-title">Price Range</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="form-input"
                  placeholder="Min $"
                  value={filters.minPrice}
                  onChange={(e) => updateFilter('minPrice', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Max $"
                  value={filters.maxPrice}
                  onChange={(e) => updateFilter('maxPrice', e.target.value)}
                />
              </div>
            </div>

            {/* Featured */}
            <div className="filter-section">
              <div className="filter-title">Featured</div>
              <label className="filter-option" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.featured === 'true'}
                  onChange={(e) => updateFilter('featured', e.target.checked ? 'true' : '')}
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Featured products only
              </label>
            </div>
          </div>
        )}

        {/* Products */}
        <div>
          {/* Sort Bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted">
              {pagination ? `Showing ${products.length} of ${pagination.total} results` : ''}
            </span>
            <select
              className="form-select"
              value={sortValue}
              onChange={(e) => handleSortChange(e.target.value)}
              style={{ width: 'auto' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="products-grid">
              {Array(12).fill(0).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '1', marginBottom: '12px' }} />
                  <div className="skeleton" style={{ height: 16, marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: 20, width: '50%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: 16, width: '70%' }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>🔍</div>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>No products found</h3>
              <p className="text-muted">Try adjusting your search or filters</p>
              <button className="btn btn-primary mt-6" onClick={clearFilters}>Clear All Filters</button>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => updateFilter('page', filters.page - 1)}
                disabled={!pagination.hasPrev}
              >
                <ChevronLeft size={16} /> Previous
              </button>

              <div className="flex gap-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(filters.page - 2, pagination.totalPages - 4)) + i;
                  return (
                    <button
                      key={pageNum}
                      className={`btn btn-sm ${pageNum === filters.page ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updateFilter('page', pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => updateFilter('page', filters.page + 1)}
                disabled={!pagination.hasNext}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
