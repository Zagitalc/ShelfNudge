// Aggregations standing in for the Express endpoints described in the brief.
// /api/products, /api/summary, /api/trends, /api/promotions are all derived
// from window.SHELF_DATA.rows in memory.

(function () {
  const fmtMoney = (v) => v == null || isNaN(v) ? '—' : '\u00a3' + Number(v).toFixed(2);
  const fmtPct   = (v) => (v == null || isNaN(v) ? '—' : (v * 100).toFixed(1) + '%');
  const fmtInt   = (v) => v == null ? '—' : Number(v).toLocaleString('en-GB');

  function latestRows(rows) {
    if (!rows.length) return [];
    const latestDate = rows.reduce((a, r) => r.date > a ? r.date : a, rows[0].date);
    return rows.filter((r) => r.date === latestDate);
  }

  function getProducts(rows, filters = {}) {
    let out = latestRows(rows);
    if (filters.retailer && filters.retailer !== 'All')   out = out.filter((r) => r.retailer === filters.retailer);
    if (filters.category && filters.category !== 'All')   out = out.filter((r) => r.category === filters.category);
    if (filters.brand    && filters.brand    !== 'All')   out = out.filter((r) => r.brand === filters.brand);
    if (filters.promotionOnly) out = out.filter((r) => r.onPromotion);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((r) =>
        r.title.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.ean.includes(q)
      );
    }
    return out;
  }

  function getSummary(rows) {
    const latest = latestRows(rows);
    const totalProducts   = new Set(latest.map((r) => r.ean)).size;
    const totalRetailers  = new Set(latest.map((r) => r.retailer)).size;
    const totalBrands     = new Set(latest.map((r) => r.brand)).size;
    const onPromo         = latest.filter((r) => r.onPromotion);
    const promoPct        = latest.length ? onPromo.length / latest.length : 0;
    const avgShelf        = latest.reduce((s, r) => s + r.shelfPrice, 0) / (latest.length || 1);
    const avgPromoted     = onPromo.length
      ? onPromo.reduce((s, r) => s + r.promotedPrice, 0) / onPromo.length
      : 0;
    const discounts = onPromo.map((r) => 1 - r.promotedPrice / r.shelfPrice);
    const avgDiscount = discounts.length ? discounts.reduce((a, b) => a + b, 0) / discounts.length : 0;
    const biggestDiscount = discounts.length ? Math.max(...discounts) : 0;

    // Top promotional brand by count.
    const brandCounts = {};
    onPromo.forEach((r) => { brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1; });
    let topBrand = '—'; let topBrandCount = 0;
    Object.entries(brandCounts).forEach(([b, c]) => { if (c > topBrandCount) { topBrand = b; topBrandCount = c; } });

    return {
      totalProducts, totalRetailers, totalBrands,
      productsOnPromotion: onPromo.length,
      promotionPercentage: promoPct,
      averageShelfPrice: avgShelf,
      averagePromotedPrice: avgPromoted,
      averageDiscountPercentage: avgDiscount,
      biggestDiscount,
      topPromotionalBrand: topBrand,
      topPromotionalBrandCount: topBrandCount,
    };
  }

  function getTrends(rows) {
    const byDate = {};
    rows.forEach((r) => {
      const d = byDate[r.date] || (byDate[r.date] = { base: 0, baseN: 0, shelf: 0, shelfN: 0, promoted: 0, promotedN: 0 });
      d.base += r.basePrice;     d.baseN++;
      d.shelf += r.shelfPrice;   d.shelfN++;
      if (r.promotedPrice != null) { d.promoted += r.promotedPrice; d.promotedN++; }
    });
    return Object.keys(byDate).sort().map((date) => {
      const d = byDate[date];
      return {
        date,
        base:     +(d.base / d.baseN).toFixed(2),
        shelf:    +(d.shelf / d.shelfN).toFixed(2),
        promoted: d.promotedN ? +(d.promoted / d.promotedN).toFixed(2) : null,
      };
    });
  }

  function getRetailerCompare(rows) {
    const latest = latestRows(rows);
    const map = {};
    latest.forEach((r) => {
      const m = map[r.retailer] || (map[r.retailer] = { retailer: r.retailer, shelf: 0, shelfN: 0, promo: 0, promoN: 0, products: 0, onPromo: 0 });
      m.shelf += r.shelfPrice; m.shelfN++;
      m.products++;
      if (r.onPromotion) {
        m.promo += r.promotedPrice; m.promoN++;
        m.onPromo++;
      }
    });
    return Object.values(map).map((m) => ({
      retailer: m.retailer,
      avgShelf: +(m.shelf / m.shelfN).toFixed(2),
      avgPromo: m.promoN ? +(m.promo / m.promoN).toFixed(2) : 0,
      promoRate: m.products ? m.onPromo / m.products : 0,
    })).sort((a, b) => b.avgShelf - a.avgShelf);
  }

  function getPromotions(rows) {
    const latest = latestRows(rows);
    const byRetailer = {};
    const byCategory = {};
    latest.forEach((r) => {
      if (!r.onPromotion) return;
      byRetailer[r.retailer] = (byRetailer[r.retailer] || 0) + 1;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    });
    return {
      byRetailer: Object.entries(byRetailer).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value),
      byCategory: Object.entries(byCategory).map(([k, v]) => ({ name: k, value: v })).sort((a, b) => b.value - a.value),
    };
  }

  window.SHELF_API = { getProducts, getSummary, getTrends, getRetailerCompare, getPromotions, fmtMoney, fmtPct, fmtInt };
})();
