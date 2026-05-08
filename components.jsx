/* global React, Recharts */

const { useState, useMemo } = React;
const {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} = Recharts;

const COLORS = {
  primary: '#3445A4',
  secondary: '#5060C9',
  accent1: '#7A8AE6',
  accent2: '#A8B3F0',
  accent3: '#C5CCF7',
  ink: '#111111',
  muted: '#5B6478',
  grid: '#E6E9F2',
};
const PIE_PALETTE = ['#3445A4', '#5060C9', '#7A8AE6', '#A8B3F0', '#C5CCF7', '#DDE1FA', '#2C3B92', '#9AA4ED'];

const { fmtMoney, fmtPct, fmtInt } = window.SHELF_API;

// -------- Header --------
function Header() {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"><span></span></div>
        <div className="brand-text">
          <div className="brand-name">Shelf Nudge</div>
          <div className="brand-tag">Pricing &amp; Promotions Intelligence</div>
        </div>
      </div>
      <div className="header-meta">
        <span className="pill">Week of 04 May 2026</span>
      </div>
    </header>
  );
}

// -------- KPI cards --------
function Kpi({ label, value, sub, subTone }) {
  return (
    <div className="kpi">
      <div className="kpi-accent" />
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub ? <div className={'kpi-sub ' + (subTone || '')}>{sub}</div> : null}
    </div>
  );
}

function KpiGrid({ summary }) {
  return (
    <div className="kpi-grid">
      <Kpi label="Products Tracked"    value={fmtInt(summary.totalProducts * summary.totalRetailers)} sub={`${summary.totalProducts} unique SKUs`} />
      <Kpi label="Retailers Monitored" value={fmtInt(summary.totalRetailers)} sub={`${summary.totalBrands} brands covered`} />
      <Kpi label="Promotion Rate"      value={fmtPct(summary.promotionPercentage)} sub={`${fmtInt(summary.productsOnPromotion)} on promotion`} subTone="up" />
      <Kpi label="Avg Shelf Price"     value={fmtMoney(summary.averageShelfPrice)} sub={`Avg promo ${fmtMoney(summary.averagePromotedPrice)}`} />
      <Kpi label="Largest Discount"    value={fmtPct(summary.biggestDiscount)} sub={`Avg discount ${fmtPct(summary.averageDiscountPercentage)}`} subTone="down" />
      <Kpi label="Top Promotional Brand" value={summary.topPromotionalBrand} sub={`${summary.topPromotionalBrandCount} active promos`} />
    </div>
  );
}

// -------- Trends chart --------
function TrendsCard({ trends }) {
  const data = trends.map((t) => ({ ...t, date: t.date.slice(5) /* MM-DD */ }));
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Pricing trends</h3>
          <p className="card-sub">8-week average across all retailers and categories</p>
        </div>
      </div>
      <div className="legend-row">
        <span className="legend-item"><span className="legend-swatch" style={{background: COLORS.muted}} />Base</span>
        <span className="legend-item"><span className="legend-swatch" style={{background: COLORS.primary}} />Shelf</span>
        <span className="legend-item"><span className="legend-swatch" style={{background: COLORS.accent1}} />Promoted</span>
      </div>
      <div className="chart-host">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: COLORS.grid }} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => '\u00a3' + v.toFixed(2)} width={60} />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Line type="monotone" dataKey="base"     stroke={COLORS.muted}   strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="shelf"    stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="promoted" stroke={COLORS.accent1} strokeWidth={2}   dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// -------- Retailer comparison --------
function RetailerCard({ retailers }) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Retailer comparison</h3>
          <p className="card-sub">Average shelf vs promoted price, latest week</p>
        </div>
      </div>
      <div className="legend-row">
        <span className="legend-item"><span className="legend-swatch" style={{background: COLORS.primary}} />Shelf</span>
        <span className="legend-item"><span className="legend-swatch" style={{background: COLORS.accent1}} />Promoted</span>
      </div>
      <div className="chart-host">
        <ResponsiveContainer>
          <BarChart data={retailers} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="retailer" tickLine={false} axisLine={{ stroke: COLORS.grid }} interval={0} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => '\u00a3' + v.toFixed(2)} width={56} />
            <Tooltip formatter={(v) => fmtMoney(v)} />
            <Bar dataKey="avgShelf" fill={COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="avgPromo" fill={COLORS.accent1} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// -------- Promotions split --------
function PromotionsCard({ promotions }) {
  const [tab, setTab] = useState('retailer');
  const data = tab === 'retailer' ? promotions.byRetailer : promotions.byCategory;

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3 className="card-title">Promotion mix</h3>
          <p className="card-sub">Distribution of active promotions</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" style={tab === 'retailer' ? { borderColor: COLORS.primary, color: COLORS.primary } : {}} onClick={() => setTab('retailer')}>By retailer</button>
          <button className="btn-ghost" style={tab === 'category' ? { borderColor: COLORS.primary, color: COLORS.primary } : {}} onClick={() => setTab('category')}>By category</button>
        </div>
      </div>
      <div className="chart-host" style={{ height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip formatter={(v, n) => [v + ' promos', n]} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />)}
            </Pie>
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: COLORS.muted }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

Object.assign(window, { Header, KpiGrid, TrendsCard, RetailerCard, PromotionsCard, COLORS, PIE_PALETTE });
