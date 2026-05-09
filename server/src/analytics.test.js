import { describe, expect, it } from 'vitest';
import { filterProducts, getPromotions, getSummary, getTrends } from './analytics.js';

describe('analytics', () => {
  it('summarizes the latest shelf snapshot', () => {
    expect(getSummary()).toMatchObject({
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
    });
  });

  it('filters latest products by retailer, category, promotion state, and search', () => {
    const rows = filterProducts({
      retailer: 'Sainsburys',
      category: 'Black Tea',
      promotionOnly: 'true',
      search: 'Yorkshire',
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((product) => product.retailer === 'Sainsburys')).toBe(true);
    expect(rows.every((product) => product.category === 'Black Tea')).toBe(true);
    expect(rows.every((product) => product.onPromotion)).toBe(true);
    expect(rows.every((product) => product.title.toLowerCase().includes('yorkshire')
      || product.brand.toLowerCase().includes('yorkshire'))).toBe(true);
  });

  it('builds ordered trend and promotion datasets', () => {
    const trends = getTrends();
    const promotions = getPromotions();

    expect(trends).toHaveLength(7);
    expect(trends[0].date).toBe('2022-02-01');
    expect(trends.at(-1).date).toBe('2022-02-07');
    expect(trends.every((trend) => Number.isFinite(trend.averageShelfPrice))).toBe(true);

    expect(promotions.byRetailer[0]).toMatchObject({ name: 'Ocado', value: 171 });
    expect(promotions.byCategory[0].value).toBeGreaterThanOrEqual(promotions.byCategory[1].value);
  });
});
