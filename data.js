// Synthetic retail pricing dataset standing in for Sample_Data.csv.
// Generates daily snapshots across retailers, categories, brands and products.

(function () {
  const RETAILERS = ['Tesco', 'Sainsbury\u2019s', 'Asda', 'Morrisons', 'Waitrose', 'Ocado'];

  const CATALOG = [
    { category: 'Cereals',     manufacturer: 'Kellogg\u2019s',  brand: 'Corn Flakes',      title: 'Corn Flakes 500g',                base: 3.50 },
    { category: 'Cereals',     manufacturer: 'Kellogg\u2019s',  brand: 'Crunchy Nut',      title: 'Crunchy Nut Cornflakes 500g',     base: 4.20 },
    { category: 'Cereals',     manufacturer: 'Nestl\u00e9',      brand: 'Cheerios',         title: 'Cheerios Multigrain 375g',        base: 3.95 },
    { category: 'Cereals',     manufacturer: 'Weetabix Ltd',  brand: 'Weetabix',         title: 'Weetabix Original 24 Pack',       base: 3.80 },
    { category: 'Beverages',   manufacturer: 'Coca-Cola',     brand: 'Coca-Cola',        title: 'Coca-Cola Zero Sugar 1.75L',      base: 2.45 },
    { category: 'Beverages',   manufacturer: 'PepsiCo',       brand: 'Pepsi',            title: 'Pepsi Max 2L',                    base: 2.30 },
    { category: 'Beverages',   manufacturer: 'Britvic',       brand: 'Robinsons',        title: 'Robinsons Apple & Blackcurrant 1L', base: 2.10 },
    { category: 'Beverages',   manufacturer: 'Innocent',      brand: 'Innocent',         title: 'Innocent Smoothie Strawberry 750ml', base: 3.60 },
    { category: 'Snacks',      manufacturer: 'PepsiCo',       brand: 'Walkers',          title: 'Walkers Cheese & Onion 6 Pack',   base: 1.85 },
    { category: 'Snacks',      manufacturer: 'Mondel\u0113z',     brand: 'Cadbury',          title: 'Cadbury Dairy Milk 200g',         base: 2.75 },
    { category: 'Snacks',      manufacturer: 'Mars',          brand: 'Maltesers',        title: 'Maltesers Pouch 175g',            base: 2.50 },
    { category: 'Snacks',      manufacturer: 'Mars',          brand: 'Twix',             title: 'Twix Multipack 9 x 23g',          base: 3.40 },
    { category: 'Household',   manufacturer: 'P&G',           brand: 'Fairy',            title: 'Fairy Original Washing-up Liquid 870ml', base: 2.95 },
    { category: 'Household',   manufacturer: 'Unilever',      brand: 'Persil',           title: 'Persil Bio Capsules 38 Wash',     base: 9.50 },
    { category: 'Household',   manufacturer: 'Reckitt',       brand: 'Finish',           title: 'Finish Quantum Dishwasher 50 Tabs', base: 11.00 },
    { category: 'Personal Care', manufacturer: 'Unilever',    brand: 'Dove',             title: 'Dove Beauty Bar 4 x 90g',         base: 3.50 },
    { category: 'Personal Care', manufacturer: 'P&G',         brand: 'Head & Shoulders', title: 'Head & Shoulders Classic 450ml',  base: 4.75 },
    { category: 'Personal Care', manufacturer: 'Colgate',     brand: 'Colgate',          title: 'Colgate Total Toothpaste 125ml',  base: 3.25 },
    { category: 'Dairy',       manufacturer: 'Arla',          brand: 'Lurpak',           title: 'Lurpak Slightly Salted 250g',     base: 4.50 },
    { category: 'Dairy',       manufacturer: 'M\u00fcller',       brand: 'M\u00fcller Corner',   title: 'M\u00fcller Corner Strawberry 6 Pack',base: 3.20 },
    { category: 'Dairy',       manufacturer: 'Cathedral City', brand: 'Cathedral City', title: 'Cathedral City Mature Cheddar 350g', base: 4.00 },
    { category: 'Bakery',      manufacturer: 'Warburtons',    brand: 'Warburtons',       title: 'Warburtons Toastie Loaf 800g',    base: 1.65 },
    { category: 'Bakery',      manufacturer: 'Hovis',         brand: 'Hovis',            title: 'Hovis Soft White Medium 800g',    base: 1.55 },
  ];

  const PROMO_TYPES = [
    { desc: 'Save 25%',    minDisc: 0.22, maxDisc: 0.28 },
    { desc: '\u00a31 Off',     minDisc: 0.15, maxDisc: 0.25 },
    { desc: 'Buy 1 Get 1 Half Price', minDisc: 0.20, maxDisc: 0.25 },
    { desc: '2 for \u00a35',     minDisc: 0.18, maxDisc: 0.30 },
    { desc: 'Clubcard Price', minDisc: 0.20, maxDisc: 0.35 },
    { desc: 'Nectar Price',   minDisc: 0.15, maxDisc: 0.30 },
    { desc: 'Rollback',       minDisc: 0.10, maxDisc: 0.20 },
    { desc: 'Member Price',   minDisc: 0.12, maxDisc: 0.22 },
  ];

  // Seeded pseudo-random for deterministic output.
  let seed = 42;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  function eanFor(idx) {
    return '5' + String(1000000000000 + idx * 13759).slice(0, 12);
  }

  function buildDates() {
    const dates = [];
    const end = new Date(2026, 4, 4); // May 4, 2026 (Mon)
    for (let i = 55; i >= 0; i -= 7) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }

  const DATES = buildDates();

  // For each (retailer x product), establish a baseline shelf multiplier
  // and a promotion schedule so the data feels coherent over time.
  const profiles = {};
  RETAILERS.forEach((r) => {
    CATALOG.forEach((p, pi) => {
      const key = r + '|' + pi;
      const shelfMult = 0.92 + rand() * 0.18; // 0.92 - 1.10
      const promoSchedule = DATES.map(() => rand() < 0.28);
      const promoType = pick(PROMO_TYPES);
      profiles[key] = { shelfMult, promoSchedule, promoType };
    });
  });

  const rows = [];
  DATES.forEach((date, di) => {
    RETAILERS.forEach((retailer) => {
      CATALOG.forEach((product, pi) => {
        const profile = profiles[retailer + '|' + pi];
        const noise = 0.97 + rand() * 0.06;
        const shelf = +(product.base * profile.shelfMult * noise).toFixed(2);
        const onPromo = profile.promoSchedule[di];
        let promoted = null;
        let promoDesc = '';
        if (onPromo) {
          const t = profile.promoType;
          const disc = t.minDisc + rand() * (t.maxDisc - t.minDisc);
          promoted = +(shelf * (1 - disc)).toFixed(2);
          promoDesc = t.desc;
        }
        rows.push({
          date,
          retailer,
          ean: eanFor(pi),
          category: product.category,
          manufacturer: product.manufacturer,
          brand: product.brand,
          title: product.title,
          image: '',
          onPromotion: onPromo,
          promotionDescription: promoDesc,
          basePrice: product.base,
          shelfPrice: shelf,
          promotedPrice: promoted,
        });
      });
    });
  });

  window.SHELF_DATA = {
    rows,
    dates: DATES,
    retailers: RETAILERS,
    categories: Array.from(new Set(CATALOG.map((c) => c.category))).sort(),
    brands: Array.from(new Set(CATALOG.map((c) => c.brand))).sort(),
  };
})();
