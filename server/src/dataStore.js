import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSV_PATH = path.resolve(__dirname, '../data/Sample_Data.csv');

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value).replace(/[£,]/g, '').trim();
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
};

const asBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  return ['true', 'yes', '1', 'y'].includes(String(value).trim().toLowerCase());
};

const cleanRow = (row) => ({
  date: row.Date,
  retailer: row.Retailer,
  ean: String(row.EAN || ''),
  category: row.Category,
  manufacturer: row.Manufacturer,
  brand: row.Brand,
  title: row['Product Title'],
  image: row.Image,
  onPromotion: asBoolean(row['On Promotion']),
  promotionDescription: row['Promotion Description'] || '',
  basePrice: asNumber(row['Base Price']),
  shelfPrice: asNumber(row['Shelf Price']),
  promotedPrice: asNumber(row['Promoted Price']),
});

const csv = fs.readFileSync(CSV_PATH, 'utf8');

export const products = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}).map(cleanRow);

export const latestDate = products.reduce((latest, product) => {
  return product.date > latest ? product.date : latest;
}, products[0]?.date || '');

export const latestProducts = products.filter((product) => product.date === latestDate);

export const metadata = {
  loadedRows: products.length,
  latestDate,
  retailers: [...new Set(products.map((product) => product.retailer))].sort(),
  categories: [...new Set(products.map((product) => product.category))].sort(),
  brands: [...new Set(products.map((product) => product.brand))].sort(),
};
