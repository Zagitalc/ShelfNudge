import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './server.js';

describe('Shelf Nudge API', () => {
  it('returns health metadata', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      loadedRows: 14268,
      latestDate: '2022-02-07',
    });
    expect(response.body.retailers).toContain('Sainsburys');
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
});
