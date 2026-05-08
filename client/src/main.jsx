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

const COLORS = ['#3445A4', '#5060C9', '#7A89EA', '#111111', '#8EA0FF', '#B8C4FF'];

function useDashboardData() {
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

function Header({ latestDate }) {
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

function Hero() {
  return (
    <section className="hero">
      <div>
        <h2>Shelf Nudge</h2>
        <p>Track pricing trends. Monitor promotions. Compare retailers.</p>
      </div>
    </section>
  );
}

function KpiCards({ summary }) {
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

function PricingTrendsChart({ trends }) {
  return (
    <article className="dashboard-card chart-card chart-card-wide">
      <div className="card-heading">
        <div>
          <h3>Pricing trends over time</h3>
          <p>Average base, shelf, and promoted prices from the CSV history.</p>
        </div>
      </div>
      <div className="chart-frame">
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
      </div>
    </article>
  );
}

function RetailerComparisonChart({ products }) {
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

  return (
    <article className="dashboard-card chart-card">
      <div className="card-heading">
        <div>
          <h3>Retailer comparison</h3>
          <p>Average shelf price by retailer.</p>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 36 }}>
            <CartesianGrid stroke="#E5E9F8" vertical={false} />
            <XAxis dataKey="retailer" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
            <YAxis tickFormatter={(value) => `£${value}`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => money(value)} />
            <Bar dataKey="averageShelfPrice" name="Average shelf price" fill="#3445A4" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function PromotionInsightsChart({ promotions }) {
  const data = promotions.byCategory.slice(0, 6);

  return (
    <article className="dashboard-card chart-card">
      <div className="card-heading">
        <div>
          <h3>Promotion insights</h3>
          <p>Top promoted categories in the latest snapshot.</p>
        </div>
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => integer(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function ProductExplorer({ initialProducts, metadata }) {
  const [products, setProducts] = useState(initialProducts);
  const [filters, setFilters] = useState({
    retailer: 'All',
    category: 'All',
    promotionOnly: false,
    search: '',
  });
  const [sort, setSort] = useState({ key: 'title', direction: 'asc' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      getProducts(filters)
        .then((response) => setProducts(response.data))
        .finally(() => setLoading(false));
    }, 180);

    return () => clearTimeout(handle);
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

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSort = (key) => {
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

  return (
    <article className="dashboard-card product-card">
      <div className="card-heading product-heading">
        <div>
          <h3>Product explorer</h3>
          <p>Detailed product pricing from the CSV latest shelf snapshot.</p>
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
            {sortedProducts.map((product, index) => (
              <tr key={`${product.retailer}-${product.ean}-${index}`}>
                <td>
                  <div className="product-title">
                    {product.image ? <img src={product.image} alt="" /> : <span className="image-fallback" />}
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
      </div>
    </article>
  );
}

function App() {
  const dashboard = useDashboardData();
  const [initialProducts, setInitialProducts] = useState([]);

  useEffect(() => {
    getProducts({}).then((response) => setInitialProducts(response.data));
  }, []);

  if (dashboard.loading) {
    return <main className="loading">Loading Shelf Nudge analytics...</main>;
  }

  if (dashboard.error) {
    return <main className="loading">Unable to load dashboard: {dashboard.error}</main>;
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

createRoot(document.getElementById('root')).render(<App />);
