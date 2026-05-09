import { describe, expect, it } from 'vitest';
import { integer, money, percent } from './format.js';

describe('format helpers', () => {
  it('formats GBP, percentages, and integers for en-GB', () => {
    expect(money(4.5)).toBe('£4.50');
    expect(percent(0.2042)).toBe('20.4%');
    expect(integer(14268)).toBe('14,268');
  });

  it('returns a dash for missing numeric values', () => {
    expect(money(null)).toBe('-');
    expect(percent(undefined)).toBe('-');
    expect(integer(Number.NaN)).toBe('-');
  });
});
