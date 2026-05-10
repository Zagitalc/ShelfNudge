import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getProducts, getPromotions, getSummary, getTrends } from './api.js';
import { integer, money, percent } from './format.js';
import './styles.css';

const PROMOTION_COLORS = ['#3445A4', '#5060C9', '#7A89EA', '#8EA0FF', '#B8C4FF'];
const OTHER_PROMOTION_COLOR = '#C9CEDF';

export function useDashboardData() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    summary: null,
    trends: [],
    promotions: null,
    metadata: null,
  });

  useEffect(() => {
    Promise.all([getSummary(), getTrends(), getPromotions()])
      .then(([summary, trends, promotions]) => {
        setState({
          loading: false,
          error: '',
          summary: summary.data,
          trends: trends.data,
          promotions: promotions.data,
          metadata: summary.metadata,
        });
      })
      .catch((error) => {
        setState((current) => ({ ...current, loading: false, error: error.message }));
      });
  }, []);

  return state;
}

export function Header({ latestDate }) {
  return (
    <header className="app-header">
      <div>
        <div className="brand-mark">SN</div>
      </div>
      <div className="header-copy">
        <h1>Shelf Nudge</h1>
        <p>Pricing & Promotions Intelligence</p>
      </div>
      <div className="header-meta">
        <span>Latest snapshot</span>
        <strong>{latestDate || '-'}</strong>
      </div>
    </header>
  );
}

export function Hero() {
  return (
    <section className="hero">
      <div>
        <h2>Shelf Nudge</h2>
        <p>Track pricing trends. Monitor promotions. Compare retailers.</p>
      </div>
    </section>
  );
}

export function KpiCards({ summary }) {
  const cards = [
    ['Products Tracked', integer(summary.totalProducts)],
    ['Retailers Monitored', integer(summary.totalRetailers)],
    ['Promotion Rate', percent(summary.promotionPercentage)],
    ['Average Shelf Price', money(summary.averageShelfPrice)],
    ['Largest Discount', percent(summary.biggestDiscount)],
    ['Top Promotional Brand', summary.topPromotionalBrand],
  ];

  return (
    <section className="kpi-grid">
      {cards.map(([label, value]) => (
        <article className="kpi-card" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </section>
  );
}

export function PricingTrendsChart({ trends }) {
  const hasData = trends.length > 0;

  return (
    <article className="dashboard-card chart-card chart-card-wide">
      <div className="card-heading">
        <div>
          <h3>Pricing trends over time</h3>
          <p>Average base, shelf, and promoted prices from pricing history.</p>
        </div>
      </div>
      <div className="chart-frame">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends} margin={{ top: 12, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#E5E9F8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={26} />
              <YAxis tickFormatter={(value) => `£${value}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
              <Line type="monotone" dataKey="averageBasePrice" name="Base price" stroke="#111111" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="averageShelfPrice" name="Shelf price" stroke="#3445A4" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="averagePromotedPrice" name="Promoted price" stroke="#5060C9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No pricing trend data is available." />
        )}
      </div>
    </article>
  );
}

export function RetailerComparisonChart({ products }) {
  const data = useMemo(() => {
    const grouped = products.reduce((map, product) => {
      map[product.retailer] ||= { retailer: product.retailer, shelfTotal: 0, count: 0 };
      map[product.retailer].shelfTotal += product.shelfPrice || 0;
      map[product.retailer].count += 1;
      return map;
    }, {});

    return Object.values(grouped)
      .map((item) => ({
        retailer: item.retailer,
        averageShelfPrice: Number((item.shelfTotal / item.count).toFixed(2)),
      }))
      .sort((a, b) => b.averageShelfPrice - a.averageShelfPrice);
  }, [products]);
  const hasData = data.length > 0;

  return (
    <article className="dashboard-card chart-card">
      <div className="card-heading">
        <div>
          <h3>Retailer comparison</h3>
          <p>Average shelf price by retailer.</p>
        </div>
      </div>
      <div className="chart-frame">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 36 }}>
              <CartesianGrid stroke="#E5E9F8" vertical={false} />
              <XAxis dataKey="retailer" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
              <YAxis tickFormatter={(value) => `£${value}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => money(value)} />
              <Bar dataKey="averageShelfPrice" name="Average shelf price" fill="#3445A4" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No retailer comparison data is available." />
        )}
      </div>
    </article>
  );
}

export function PromotionInsightsChart({ promotions }) {
  const topCategories = promotions.byCategory.slice(0, 5);
  const remainingCategories = promotions.byCategory.slice(5);
  const otherTotal = remainingCategories.reduce((sum, item) => sum + item.value, 0);
  const data = otherTotal > 0
    ? [...topCategories, { name: 'Other', value: otherTotal }]
    : topCategories;
  const totalPromotions = promotions.byCategory.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0;

  return (
    <article className="dashboard-card chart-card">
      <div className="card-heading">
        <div>
          <h3>Promotion insights</h3>
          <p>Top promoted categories in the latest snapshot.</p>
        </div>
      </div>
      <div className="chart-frame">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.name === 'Other' ? OTHER_PROMOTION_COLOR : PROMOTION_COLORS[index % PROMOTION_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PromotionTooltip total={totalPromotions} />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No promotion insights are available." />
        )}
      </div>
    </article>
  );
}

function PromotionTooltip({ active, payload, total }) {
  if (!active || !payload?.length) return null;

  const { name, value } = payload[0];
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="promotion-tooltip">
      <p>{name}</p>
      <span>{integer(value)} promotions</span>
      <span>{percentage}% of all promoted products</span>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      {description ? <span>{description}</span> : null}
    </div>
  );
}

export function ProductExplorer({ initialProducts, metadata }) {
  const [products, setProducts] = useState(initialProducts);
  const [filters, setFilters] = useState({
    retailer: 'All',
    category: 'All',
    promotionOnly: false,
    search: '',
  });
  const [sort, setSort] = useState({ key: 'title', direction: 'asc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      setError('');
      getProducts(filters)
        .then((response) => {
          if (!cancelled) setProducts(response.data);
        })
        .catch(() => {
          if (!cancelled) {
            setError('Unable to load product data.');
            setProducts([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [filters]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      let left = a[sort.key];
      let right = b[sort.key];

      if (left === null || left === undefined) left = '';
      if (right === null || right === undefined) right = '';
      if (typeof left === 'string') left = left.toLowerCase();
      if (typeof right === 'string') right = right.toLowerCase();

      if (left < right) return sort.direction === 'asc' ? -1 : 1;
      if (left > right) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, sort]);
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedProducts = sortedProducts.slice(pageStart, currentPage * pageSize);
  const visibleStart = sortedProducts.length ? pageStart + 1 : 0;
  const visibleEnd = Math.min(currentPage * pageSize, sortedProducts.length);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const setFilter = (key, value) => {
    setCurrentPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (key) => {
    setCurrentPage(1);
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortHeader = ({ column, children, alignRight }) => (
    <th className={alignRight ? 'align-right' : ''}>
      <button type="button" onClick={() => toggleSort(column)}>
        {children}
        <span>{sort.key === column ? (sort.direction === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  return (
    <article className="dashboard-card product-card">
      <div className="card-heading product-heading">
        <div>
          <h3>Product explorer</h3>
          <p>Detailed product pricing from the latest shelf snapshot.</p>
        </div>
        <strong>{loading ? 'Loading...' : `${integer(sortedProducts.length)} products`}</strong>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search product, brand, category or EAN"
          value={filters.search}
          onChange={(event) => setFilter('search', event.target.value)}
        />
        <select value={filters.retailer} onChange={(event) => setFilter('retailer', event.target.value)}>
          <option>All</option>
          {metadata.retailers.map((retailer) => <option key={retailer}>{retailer}</option>)}
        </select>
        <select value={filters.category} onChange={(event) => setFilter('category', event.target.value)}>
          <option>All</option>
          {metadata.categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <label className="toggle">
          <input
            type="checkbox"
            checked={filters.promotionOnly}
            onChange={(event) => setFilter('promotionOnly', event.target.checked)}
          />
          <span />
          Promotion only
        </label>
      </div>

      <div className="table-wrap">
        {loading ? (
          <EmptyState title="Loading pricing insights..." />
        ) : error ? (
          <EmptyState title={error} />
        ) : sortedProducts.length === 0 ? (
          <EmptyState
            title="No products match the current filters."
            description="Try changing the retailer, category, or promotion filter."
          />
        ) : (
          <table>
            <thead>
              <tr>
                <SortHeader column="title">Product title</SortHeader>
                <SortHeader column="retailer">Retailer</SortHeader>
                <SortHeader column="category">Category</SortHeader>
                <SortHeader column="brand">Brand</SortHeader>
                <SortHeader column="basePrice" alignRight>Base price</SortHeader>
                <SortHeader column="shelfPrice" alignRight>Shelf price</SortHeader>
                <SortHeader column="promotedPrice" alignRight>Promoted price</SortHeader>
                <SortHeader column="onPromotion">On promotion</SortHeader>
                <th>Promotion description</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, index) => (
                <tr key={`${product.retailer}-${product.ean}-${pageStart + index}`}>
                  <td>
                    <div className="product-title">
                      {product.image ? <img src={product.image} alt="" loading="lazy" /> : <span className="image-fallback" />}
                      <span>{product.title}</span>
                    </div>
                  </td>
                  <td>{product.retailer}</td>
                  <td>{product.category}</td>
                  <td>{product.brand}</td>
                  <td className="align-right">{money(product.basePrice)}</td>
                  <td className="align-right">{money(product.shelfPrice)}</td>
                  <td className="align-right">{product.onPromotion ? money(product.promotedPrice) : '-'}</td>
                  <td>
                    <span className={product.onPromotion ? 'status status-on' : 'status'}>
                      {product.onPromotion ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td>{product.promotionDescription || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && !error && sortedProducts.length > 0 ? (
        <div className="pagination-bar">
          <span>Showing {integer(visibleStart)}-{integer(visibleEnd)} of {integer(sortedProducts.length)} products</span>
          <div className="pagination-controls">
            <button type="button" onClick={goToPreviousPage} disabled={currentPage === 1}>Previous</button>
            <strong>Page {integer(currentPage)} of {integer(totalPages)}</strong>
            <button type="button" onClick={goToNextPage} disabled={currentPage === totalPages}>Next</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function App() {
  const dashboard = useDashboardData();
  const [initialProducts, setInitialProducts] = useState([]);

  useEffect(() => {
    getProducts({}).then((response) => setInitialProducts(response.data));
  }, []);

  if (dashboard.loading) {
    return <main className="loading">Loading pricing insights...</main>;
  }

  if (dashboard.error) {
    return <main className="loading">Unable to load dashboard data.</main>;
  }

  return (
    <div className="app-shell">
      <Header latestDate={dashboard.metadata.latestDate} />
      <main>
        <Hero />
        <KpiCards summary={dashboard.summary} />
        <section className="dashboard-grid">
          <PricingTrendsChart trends={dashboard.trends} />
          <RetailerComparisonChart products={initialProducts} />
          <PromotionInsightsChart promotions={dashboard.promotions} />
        </section>
        <ProductExplorer initialProducts={initialProducts} metadata={dashboard.metadata} />
      </main>
    </div>
  );
}

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(<App />);
}
