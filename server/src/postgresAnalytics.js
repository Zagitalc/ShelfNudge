import { query } from './db.js';

const round = (value, digits = 2) => {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
};

const sortColumns = {
  title: 'title',
  retailer: 'retailer',
  category: 'category',
  brand: 'brand',
  basePrice: 'base_price',
  shelfPrice: 'shelf_price',
  promotedPrice: 'promoted_price',
  onPromotion: 'on_promotion',
};

const latestSnapshotCte = `
  WITH latest_snapshot AS (
    SELECT MAX(snapshot_date) AS snapshot_date
    FROM products
  )
`;

const toProduct = (row) => ({
  date: row.snapshot_date,
  retailer: row.retailer,
  ean: row.ean,
  category: row.category,
  manufacturer: row.manufacturer,
  brand: row.brand,
  title: row.title,
  image: row.image,
  onPromotion: row.on_promotion,
  promotionDescription: row.promotion_description || '',
  basePrice: row.base_price === null ? null : Number(row.base_price),
  shelfPrice: row.shelf_price === null ? null : Number(row.shelf_price),
  promotedPrice: row.promoted_price === null ? null : Number(row.promoted_price),
});

const addFilter = (clauses, params, value, sql) => {
  if (value === undefined || value === null || value === '' || value === 'All') return;
  params.push(value);
  clauses.push(sql(params.length));
};

export const buildProductsQuery = (filters = {}) => {
  const params = [];
  const clauses = ['p.snapshot_date = latest_snapshot.snapshot_date'];

  addFilter(clauses, params, filters.retailer, (index) => `p.retailer = $${index}`);
  addFilter(clauses, params, filters.category, (index) => `p.category = $${index}`);
  addFilter(clauses, params, filters.brand, (index) => `p.brand = $${index}`);

  if (filters.promotionOnly === 'true') {
    params.push(true);
    clauses.push(`p.on_promotion = $${params.length}`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const index = params.length;
    clauses.push(`(
      p.title ILIKE $${index}
      OR p.brand ILIKE $${index}
      OR p.category ILIKE $${index}
      OR p.ean ILIKE $${index}
    )`);
  }

  const sortBy = sortColumns[filters.sortBy] || 'title';
  const sortDirection = String(filters.sortDirection).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  return {
    text: `
      ${latestSnapshotCte}
      SELECT
        p.snapshot_date::text,
        p.retailer,
        p.ean,
        p.category,
        p.manufacturer,
        p.brand,
        p.title,
        p.image,
        p.on_promotion,
        p.promotion_description,
        p.base_price,
        p.shelf_price,
        p.promoted_price
      FROM products p, latest_snapshot
      WHERE ${clauses.join('\n        AND ')}
      ORDER BY p.${sortBy} ${sortDirection}, p.title ASC
    `,
    params,
  };
};

export const getPostgresMetadata = async () => {
  const result = await query(`
    SELECT
      COUNT(*)::int AS loaded_rows,
      MAX(snapshot_date)::text AS latest_date,
      ARRAY_AGG(DISTINCT retailer ORDER BY retailer) AS retailers,
      ARRAY_AGG(DISTINCT category ORDER BY category) FILTER (WHERE category IS NOT NULL) AS categories,
      ARRAY_AGG(DISTINCT brand ORDER BY brand) FILTER (WHERE brand IS NOT NULL) AS brands
    FROM products
  `);

  const row = result.rows[0];

  return {
    source: 'postgres',
    productCount: row.loaded_rows,
    loadedRows: row.loaded_rows,
    latestDate: row.latest_date || '',
    retailers: row.retailers || [],
    categories: row.categories || [],
    brands: row.brands || [],
  };
};

export const filterPostgresProducts = async (filters) => {
  const { text, params } = buildProductsQuery(filters);
  const result = await query(text, params);
  return result.rows.map(toProduct);
};

export const getPostgresSummary = async () => {
  const result = await query(`
    ${latestSnapshotCte},
    latest_products AS (
      SELECT p.*
      FROM products p, latest_snapshot
      WHERE p.snapshot_date = latest_snapshot.snapshot_date
    ),
    brand_counts AS (
      SELECT brand, COUNT(*)::int AS promotion_count
      FROM latest_products
      WHERE on_promotion = true
      GROUP BY brand
      ORDER BY promotion_count DESC, brand ASC
      LIMIT 1
    )
    SELECT
      COUNT(DISTINCT ean)::int AS total_products,
      COUNT(DISTINCT retailer)::int AS total_retailers,
      COUNT(DISTINCT brand)::int AS total_brands,
      COUNT(*) FILTER (WHERE on_promotion = true)::int AS products_on_promotion,
      COALESCE((COUNT(*) FILTER (WHERE on_promotion = true)::numeric / NULLIF(COUNT(*), 0)), 0) AS promotion_percentage,
      AVG(shelf_price) AS average_shelf_price,
      AVG(promoted_price) FILTER (WHERE on_promotion = true) AS average_promoted_price,
      AVG(1 - promoted_price / NULLIF(base_price, 0)) FILTER (
        WHERE on_promotion = true AND base_price IS NOT NULL AND promoted_price IS NOT NULL
      ) AS average_discount_percentage,
      MAX(1 - promoted_price / NULLIF(base_price, 0)) FILTER (
        WHERE on_promotion = true AND base_price IS NOT NULL AND promoted_price IS NOT NULL
      ) AS biggest_discount,
      COALESCE((SELECT brand FROM brand_counts), 'None') AS top_promotional_brand,
      COALESCE((SELECT promotion_count FROM brand_counts), 0)::int AS top_promotional_brand_count
    FROM latest_products
  `);

  const row = result.rows[0];

  return {
    totalProducts: row.total_products,
    totalRetailers: row.total_retailers,
    totalBrands: row.total_brands,
    productsOnPromotion: row.products_on_promotion,
    promotionPercentage: round(row.promotion_percentage, 4),
    averageShelfPrice: round(row.average_shelf_price),
    averagePromotedPrice: round(row.average_promoted_price),
    averageDiscountPercentage: round(row.average_discount_percentage, 4),
    biggestDiscount: round(row.biggest_discount, 4),
    topPromotionalBrand: row.top_promotional_brand,
    topPromotionalBrandCount: row.top_promotional_brand_count,
  };
};

export const getPostgresTrends = async () => {
  const result = await query(`
    SELECT
      snapshot_date::text AS date,
      AVG(base_price) AS average_base_price,
      AVG(shelf_price) AS average_shelf_price,
      AVG(promoted_price) FILTER (WHERE on_promotion = true) AS average_promoted_price
    FROM products
    GROUP BY snapshot_date
    ORDER BY snapshot_date
  `);

  return result.rows.map((row) => ({
    date: row.date,
    averageBasePrice: round(row.average_base_price),
    averageShelfPrice: round(row.average_shelf_price),
    averagePromotedPrice: row.average_promoted_price === null ? null : round(row.average_promoted_price),
  }));
};

export const getPostgresPromotions = async () => {
  const [byRetailer, byCategory] = await Promise.all([
    query(`
      ${latestSnapshotCte}
      SELECT p.retailer AS name, COUNT(*)::int AS value
      FROM products p, latest_snapshot
      WHERE p.snapshot_date = latest_snapshot.snapshot_date
        AND p.on_promotion = true
      GROUP BY p.retailer
      ORDER BY value DESC, name ASC
    `),
    query(`
      ${latestSnapshotCte}
      SELECT p.category AS name, COUNT(*)::int AS value
      FROM products p, latest_snapshot
      WHERE p.snapshot_date = latest_snapshot.snapshot_date
        AND p.on_promotion = true
      GROUP BY p.category
      ORDER BY value DESC, name ASC
    `),
  ]);

  return {
    byRetailer: byRetailer.rows,
    byCategory: byCategory.rows,
  };
};
