import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'csv-parse/sync';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '../data/Sample_Data.csv');

export const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[£,]/g, '').trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

export const asBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'y'].includes(String(value).trim().toLowerCase());
};

export const cleanRow = (row) => ({
  snapshotDate: row.Date,
  retailer: row.Retailer,
  ean: String(row.EAN || ''),
  category: row.Category || null,
  manufacturer: row.Manufacturer || null,
  brand: row.Brand || null,
  title: row['Product Title'] || null,
  image: row.Image || null,
  onPromotion: asBoolean(row['On Promotion']),
  promotionDescription: row['Promotion Description'] || null,
  basePrice: asNumber(row['Base Price']),
  shelfPrice: asNumber(row['Shelf Price']),
  promotedPrice: asNumber(row['Promoted Price']),
});

export const readCsvRows = (csvPath = CSV_PATH) => {
  const csv = fs.readFileSync(csvPath, 'utf8');
  return parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }).map(cleanRow);
};

const shouldUseSsl = (databaseUrl) => {
  const { hostname } = new URL(databaseUrl);
  return !['localhost', '127.0.0.1', '::1'].includes(hostname);
};

const createPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to import CSV data');
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
  });
};

export const schemaSql = `
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    retailer TEXT NOT NULL,
    ean TEXT NOT NULL,
    category TEXT,
    manufacturer TEXT,
    brand TEXT,
    title TEXT,
    image TEXT,
    on_promotion BOOLEAN NOT NULL DEFAULT false,
    promotion_description TEXT,
    base_price NUMERIC(10,2),
    shelf_price NUMERIC(10,2),
    promoted_price NUMERIC(10,2)
  );

  CREATE INDEX IF NOT EXISTS idx_products_snapshot_date ON products (snapshot_date);
  CREATE INDEX IF NOT EXISTS idx_products_retailer ON products (retailer);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
  CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand);
  CREATE INDEX IF NOT EXISTS idx_products_ean ON products (ean);
  CREATE INDEX IF NOT EXISTS idx_products_on_promotion ON products (on_promotion);
  CREATE INDEX IF NOT EXISTS idx_products_retailer_category_promo
    ON products (retailer, category, on_promotion);
`;

export const resetSql = 'TRUNCATE products RESTART IDENTITY;';

const insertSql = `
  INSERT INTO products (
    snapshot_date,
    retailer,
    ean,
    category,
    manufacturer,
    brand,
    title,
    image,
    on_promotion,
    promotion_description,
    base_price,
    shelf_price,
    promoted_price
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
`;

const valuesFor = (row) => [
  row.snapshotDate,
  row.retailer,
  row.ean,
  row.category,
  row.manufacturer,
  row.brand,
  row.title,
  row.image,
  row.onPromotion,
  row.promotionDescription,
  row.basePrice,
  row.shelfPrice,
  row.promotedPrice,
];

export const importRows = async (client, rows) => {
  await client.query(schemaSql);
  await client.query('BEGIN');

  try {
    await client.query(resetSql);

    for (const row of rows) {
      await client.query(insertSql, valuesFor(row));
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

export const importCsv = async () => {
  const rows = readCsvRows();
  const pool = createPool();
  const client = await pool.connect();

  try {
    await importRows(client, rows);
    console.log(`Imported ${rows.length} product rows into PostgreSQL.`);
  } finally {
    client.release();
    await pool.end();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importCsv().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
