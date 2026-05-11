import { describe, expect, it } from 'vitest';
import { asBoolean, asNumber, cleanRow, resetSql } from './importCsv.js';

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
});
