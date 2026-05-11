import { describe, expect, it } from 'vitest';
import {
  BATCH_SIZE,
  asBoolean,
  asNumber,
  buildInsertQuery,
  cleanRow,
  resetSql,
} from './importCsv.js';

describe('CSV import helpers', () => {
  it('converts currency values to numbers or null', () => {
    expect(asNumber('£1,234.50')).toBe(1234.5);
    expect(asNumber('')).toBeNull();
    expect(asNumber(undefined)).toBeNull();
  });

  it('converts promotion values to booleans', () => {
    expect(asBoolean('true')).toBe(true);
    expect(asBoolean('Yes')).toBe(true);
    expect(asBoolean('0')).toBe(false);
    expect(asBoolean('no')).toBe(false);
  });

  it('maps CSV columns to database row fields', () => {
    expect(cleanRow({
      Date: '2022-02-07',
      Retailer: 'Sainsburys',
      EAN: '12345',
      Category: 'Black Tea',
      Manufacturer: 'Tea Co',
      Brand: 'Yorkshire Tea',
      'Product Title': 'Yorkshire Tea 80 Bags',
      Image: 'https://example.com/tea.jpg',
      'On Promotion': 'yes',
      'Promotion Description': 'Save 50p',
      'Base Price': '£3.00',
      'Shelf Price': '£2.50',
      'Promoted Price': '£2.50',
    })).toEqual({
      snapshotDate: '2022-02-07',
      retailer: 'Sainsburys',
      ean: '12345',
      category: 'Black Tea',
      manufacturer: 'Tea Co',
      brand: 'Yorkshire Tea',
      title: 'Yorkshire Tea 80 Bags',
      image: 'https://example.com/tea.jpg',
      onPromotion: true,
      promotionDescription: 'Save 50p',
      basePrice: 3,
      shelfPrice: 2.5,
      promotedPrice: 2.5,
    });
  });

  it('uses truncate restart identity for repeatable imports', () => {
    expect(resetSql).toBe('TRUNCATE products RESTART IDENTITY;');
  });

  it('builds parameterized batch insert queries', () => {
    const rows = [
      cleanRow({
        Date: '2022-02-07',
        Retailer: 'Sainsburys',
        EAN: '12345',
        Category: 'Black Tea',
        Manufacturer: 'Tea Co',
        Brand: 'Yorkshire Tea',
        'Product Title': 'Yorkshire Tea 80 Bags',
        Image: '',
        'On Promotion': 'yes',
        'Promotion Description': '',
        'Base Price': '£3.00',
        'Shelf Price': '£2.50',
        'Promoted Price': '£2.50',
      }),
      cleanRow({
        Date: '2022-02-07',
        Retailer: 'Tesco',
        EAN: '67890',
        Category: 'Instant Coffee',
        Manufacturer: 'Coffee Co',
        Brand: 'Test Coffee',
        'Product Title': 'Test Coffee 200g',
        Image: '',
        'On Promotion': 'no',
        'Promotion Description': '',
        'Base Price': '£4.00',
        'Shelf Price': '£4.00',
        'Promoted Price': '',
      }),
    ];

    const query = buildInsertQuery(rows);

    expect(BATCH_SIZE).toBe(1000);
    expect(query.text).toContain('INSERT INTO products');
    expect(query.text).toContain('($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)');
    expect(query.text).toContain('($14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)');
    expect(query.values).toHaveLength(26);
    expect(query.values.slice(0, 4)).toEqual(['2022-02-07', 'Sainsburys', '12345', 'Black Tea']);
    expect(query.values[25]).toBeNull();
  });
});
