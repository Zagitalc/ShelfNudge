import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./postgresAnalytics.js', () => ({
  filterPostgresProducts: vi.fn(async () => ([{
    date: '2022-02-07',
    retailer: 'Sainsburys',
    ean: '12345',
    category: 'Black Tea',
    manufacturer: 'Tea Co',
    brand: 'Yorkshire Tea',
    title: 'Yorkshire Tea 80 Bags',
    image: null,
    onPromotion: true,
    promotionDescription: 'Save 50p',
    basePrice: 3,
    shelfPrice: 2.5,
    promotedPrice: 2.5,
  }])),
  getPostgresMetadata: vi.fn(async () => ({
    source: 'postgres',
    productCount: 14268,
    loadedRows: 14268,
    latestDate: '2022-02-07',
    retailers: ['Sainsburys'],
    categories: ['Black Tea'],
    brands: ['Yorkshire Tea'],
  })),
  getPostgresPromotions: vi.fn(async () => ({
    byRetailer: [{ name: 'Sainsburys', value: 12 }],
    byCategory: [{ name: 'Black Tea', value: 12 }],
  })),
  getPostgresSummary: vi.fn(async () => ({
    totalProducts: 1302,
    totalRetailers: 5,
    totalBrands: 128,
    productsOnPromotion: 416,
    promotionPercentage: 0.2042,
    averageShelfPrice: 4.47,
    averagePromotedPrice: 3.34,
    biggestDiscount: 0.5,
    topPromotionalBrand: 'Tetley',
    topPromotionalBrandCount: 51,
  })),
  getPostgresTrends: vi.fn(async () => ([{
    date: '2022-02-07',
    averageBasePrice: 4.52,
    averageShelfPrice: 4.47,
    averagePromotedPrice: 3.34,
  }])),
}));

const { app, startServer } = await import('./server.js');

describe('Shelf Nudge API', () => {
  const clientDistPath = path.resolve(process.cwd(), '../client/dist');
  const clientIndexPath = path.join(clientDistPath, 'index.html');
  let originalIndexHtml;

  beforeAll(() => {
    if (fs.existsSync(clientIndexPath)) {
      originalIndexHtml = fs.readFileSync(clientIndexPath, 'utf8');
    }

    fs.mkdirSync(clientDistPath, { recursive: true });
    fs.writeFileSync(
      clientIndexPath,
      '<!doctype html><html><body><div id="root"></div></body></html>',
    );
  });

  afterAll(() => {
    if (originalIndexHtml === undefined) {
      fs.rmSync(clientIndexPath, { force: true });
      return;
    }

    fs.writeFileSync(clientIndexPath, originalIndexHtml);
  });

  it('returns PostgreSQL health metadata without exposing credentials', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      source: 'postgres',
      productCount: 14268,
      loadedRows: 14268,
      latestDate: '2022-02-07',
    });
    expect(response.body.retailers).toContain('Sainsburys');
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(response.body)).not.toContain('postgres://');
    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
  });

  it('requires DATABASE_URL before starting the server', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    expect(() => startServer(0)).toThrow('DATABASE_URL is required');

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
      return;
    }

    process.env.DATABASE_URL = originalDatabaseUrl;
  });

  it('returns filtered product rows from PostgreSQL', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({
        retailer: 'Sainsburys',
        category: 'Black Tea',
        promotionOnly: 'true',
        search: 'Yorkshire',
      })
      .expect(200);

    expect(response.body.metadata.source).toBe('postgres');
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      retailer: 'Sainsburys',
      category: 'Black Tea',
      onPromotion: true,
    });
  });

  it('returns dashboard datasets asynchronously', async () => {
    const [summary, trends, promotions] = await Promise.all([
      request(app).get('/api/summary').expect(200),
      request(app).get('/api/trends').expect(200),
      request(app).get('/api/promotions').expect(200),
    ]);

    expect(summary.body.data.totalProducts).toBe(1302);
    expect(summary.body.metadata.source).toBe('postgres');
    expect(trends.body.data).toHaveLength(1);
    expect(promotions.body.data.byRetailer[0]).toMatchObject({ name: 'Sainsburys', value: 12 });
  });

  it('returns JSON 404 responses for unknown API routes', async () => {
    const response = await request(app).get('/api/not-real').expect(404);

    expect(response.type).toBe('application/json');
    expect(response.body).toEqual({ error: 'API route not found' });
  });

  it('serves the built React app at the root', async () => {
    const response = await request(app).get('/').expect(200);

    expect(response.type).toBe('text/html');
    expect(response.text).toContain('<div id="root"></div>');
  });

  it('falls back to the React app for client-side routes', async () => {
    const response = await request(app).get('/some-dashboard-route').expect(200);

    expect(response.type).toBe('text/html');
    expect(response.text).toContain('<div id="root"></div>');
  });
});
