import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProducts, getSummary } from './api.js';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws for failed responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getSummary()).rejects.toThrow('Request failed: 500');
  });

  it('serializes product filters and skips empty defaults', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    await getProducts({
      retailer: 'Sainsburys',
      category: 'All',
      promotionOnly: true,
      search: 'Yorkshire Tea',
      brand: '',
    });

    expect(fetch).toHaveBeenCalledWith('/api/products?retailer=Sainsburys&promotionOnly=true&search=Yorkshire+Tea');
  });
});
