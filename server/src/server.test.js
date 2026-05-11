import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from './server.js';

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

  it('returns health metadata', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      source: 'csv',
      productCount: 14268,
      loadedRows: 14268,
      latestDate: '2022-02-07',
    });
    expect(response.body.retailers).toContain('Sainsburys');
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(response.body)).not.toContain('postgres://');
  });

  it('returns filtered product rows from the latest snapshot', async () => {
    const response = await request(app)
      .get('/api/products')
      .query({
        retailer: 'Sainsburys',
        category: 'Black Tea',
        promotionOnly: 'true',
        search: 'Yorkshire',
      })
      .expect(200);

    expect(response.body.metadata.latestDate).toBe('2022-02-07');
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((product) => product.retailer === 'Sainsburys')).toBe(true);
    expect(response.body.data.every((product) => product.category === 'Black Tea')).toBe(true);
    expect(response.body.data.every((product) => product.onPromotion)).toBe(true);
  });

  it('returns dashboard datasets asynchronously', async () => {
    const [summary, trends, promotions] = await Promise.all([
      request(app).get('/api/summary').expect(200),
      request(app).get('/api/trends').expect(200),
      request(app).get('/api/promotions').expect(200),
    ]);

    expect(summary.body.data.totalProducts).toBe(1302);
    expect(trends.body.data).toHaveLength(7);
    expect(promotions.body.data.byRetailer[0]).toMatchObject({ name: 'Ocado', value: 171 });
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
