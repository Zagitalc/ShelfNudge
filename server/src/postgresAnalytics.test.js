import { describe, expect, it } from 'vitest';
import { buildProductsQuery } from './postgresAnalytics.js';

describe('postgres analytics query helpers', () => {
  it('builds parameterized product filters in a stable order', () => {
    const query = buildProductsQuery({
      retailer: 'Sainsburys',
      category: 'Black Tea',
      brand: 'Yorkshire Tea',
      promotionOnly: 'true',
      search: 'gold',
      sortBy: 'shelfPrice',
      sortDirection: 'desc',
    });

    expect(query.params).toEqual([
      'Sainsburys',
      'Black Tea',
      'Yorkshire Tea',
      true,
      '%gold%',
    ]);
    expect(query.text).toContain('p.retailer = $1');
    expect(query.text).toContain('p.category = $2');
    expect(query.text).toContain('p.brand = $3');
    expect(query.text).toContain('p.on_promotion = $4');
    expect(query.text).toContain('ILIKE $5');
    expect(query.text).toContain('ORDER BY p.shelf_price DESC');
  });

  it('falls back to safe sort values for untrusted sort input', () => {
    const query = buildProductsQuery({
      sortBy: 'title; DROP TABLE products;',
      sortDirection: 'descending; DROP',
    });

    expect(query.params).toEqual([]);
    expect(query.text).toContain('ORDER BY p.title ASC');
    expect(query.text).not.toContain('DROP TABLE');
    expect(query.text).not.toContain('descending;');
  });
});
