/* global React, SHELF_DATA, SHELF_API */

const { useState, useMemo } = React;

function ProductExplorer() {
  const data = window.SHELF_DATA;
  const api  = window.SHELF_API;
  const [retailer, setRetailer] = useState('All');
  const [category, setCategory] = useState('All');
  const [brand, setBrand]       = useState('All');
  const [promoOnly, setPromoOnly] = useState(false);
  const [search, setSearch]     = useState('');
  const [sort, setSort]         = useState({ key: 'title', dir: 'asc' });

  const rows = useMemo(() => {
    return api.getProducts(data.rows, { retailer, category, brand, promotionOnly: promoOnly, search });
  }, [retailer, category, brand, promoOnly, search]);

  const sorted = useMemo(() => {
    const arr = rows.slice();
    arr.sort((a, b) => {
      let av = a[sort.key]; let bv = b[sort.key];
      if (sort.key === 'promotedPrice') { av = av == null ? Infinity : av; bv = bv == null ? Infinity : bv; }
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (typeof av === 'boolean') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [rows, sort]);

  function toggleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }

  function clearFilters() {
    setRetailer('All'); setCategory('All'); setBrand('All'); setPromoOnly(false); setSearch('');
  }

  const SortHeader = ({ k, label, align }) => (
    <th onClick={() => toggleSort(k)} className={sort.key === k ? 'active' : ''} style={align === 'right' ? { textAlign: 'right' } : {}}>
      {label}
      <span className="sort">{sort.key === k ? (sort.dir === 'asc' ? '\u25B2' : '\u25BC') : ''}</span>
    </th>
  );

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Product explorer</h3>
          <p className="card-sub">Latest shelf snapshot across retailers — sortable, filterable</p>
        </div>
        <span className="tag muted">{sorted.length} results</span>
      </div>

      <div className="filters">
        <input
          className="input grow"
          type="search"
          placeholder="Search product, brand or EAN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" value={retailer} onChange={(e) => setRetailer(e.target.value)}>
          <option value="All">All retailers</option>
          {data.retailers.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="All">All categories</option>
          {data.categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="All">All brands</option>
          {data.brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={promoOnly} onChange={(e) => setPromoOnly(e.target.checked)} />
          <span className="track"></span>
          On promotion only
        </label>
        <button className="btn-ghost" onClick={clearFilters}>Reset</button>
      </div>

      <div className="table-wrap">
        {sorted.length === 0 ? (
          <div className="empty">No products match the current filters.</div>
        ) : (
          <table className="products">
            <thead>
              <tr>
                <SortHeader k="title" label="Product" />
                <SortHeader k="retailer" label="Retailer" />
                <SortHeader k="category" label="Category" />
                <SortHeader k="brand" label="Brand" />
                <SortHeader k="basePrice" label="Base" align="right" />
                <SortHeader k="shelfPrice" label="Shelf" align="right" />
                <SortHeader k="promotedPrice" label="Promo" align="right" />
                <SortHeader k="onPromotion" label="Status" />
                <th>Promotion</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const initials = r.brand.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase();
                const disc = r.onPromotion ? 1 - r.promotedPrice / r.shelfPrice : 0;
                return (
                  <tr key={r.retailer + r.ean + i}>
                    <td>
                      <div className="product-cell">
                        <div className="product-thumb">{initials}</div>
                        <div className="product-meta">
                          <span className="product-title" title={r.title}>{r.title}</span>
                          <span className="product-ean">EAN {r.ean}</span>
                        </div>
                      </div>
                    </td>
                    <td>{r.retailer}</td>
                    <td><span className="tag muted">{r.category}</span></td>
                    <td>{r.brand}</td>
                    <td className="col-num">{api.fmtMoney(r.basePrice)}</td>
                    <td className={r.onPromotion ? 'col-strike' : 'col-num'}>{api.fmtMoney(r.shelfPrice)}</td>
                    <td className="col-num" style={r.onPromotion ? { color: '#3445A4', fontWeight: 600 } : { color: '#8A93A6' }}>
                      {r.onPromotion ? api.fmtMoney(r.promotedPrice) : '—'}
                    </td>
                    <td>
                      {r.onPromotion
                        ? <span className="tag success">−{(disc * 100).toFixed(0)}%</span>
                        : <span className="tag muted">Standard</span>}
                    </td>
                    <td>{r.onPromotion ? <span className="tag">{r.promotionDescription}</span> : <span style={{ color: '#8A93A6' }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="table-foot">
        <span>Showing {sorted.length} of {api.getProducts(data.rows, {}).length} latest-week records</span>
        <span>Click any column header to sort</span>
      </div>
    </div>
  );
}

function App() {
  const data = window.SHELF_DATA;
  const api  = window.SHELF_API;

  const summary    = useMemo(() => api.getSummary(data.rows), []);
  const trends     = useMemo(() => api.getTrends(data.rows), []);
  const retailers  = useMemo(() => api.getRetailerCompare(data.rows), []);
  const promotions = useMemo(() => api.getPromotions(data.rows), []);

  return (
    <div className="app">
      <window.Header />
      <section className="page-hero">
        <h1>Shelf Nudge</h1>
        <p>Track pricing trends. Monitor promotions. Compare retailers.</p>
      </section>

      <main className="page-content">
        <window.KpiGrid summary={summary} />

        <div className="charts-grid">
          <window.TrendsCard trends={trends} />
          <window.PromotionsCard promotions={promotions} />
        </div>

        <window.RetailerCard retailers={retailers} />

        <ProductExplorer />
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
