import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  App,
  PricingTrendsChart,
  ProductExplorer,
  PromotionInsightsChart,
  RetailerComparisonChart,
} from './main.jsx';
import * as api from './api.js';

vi.mock('recharts', () => {
  const Chart = ({ children }) => <div data-testid="chart">{children}</div>;
  const Primitive = ({ children }) => <div>{children}</div>;

  return {
    Bar: Primitive,
    BarChart: Chart,
    CartesianGrid: Primitive,
    Cell: Primitive,
    Legend: Primitive,
    Line: Primitive,
    LineChart: Chart,
    Pie: Primitive,
    PieChart: Chart,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    Tooltip: Primitive,
    XAxis: Primitive,
    YAxis: Primitive,
  };
});

vi.mock('./api.js');

const metadata = {
  latestDate: '2022-02-07',
  retailers: ['Sainsburys', 'Tesco', 'Morrisons'],
  categories: ['Black Tea', 'Green Tea', 'Chai Tea'],
};

const products = [
  {
    retailer: 'Sainsburys',
    ean: '5010357112085',
    category: 'Black Tea',
    brand: 'Yorkshire Tea',
    title: 'Yorkshire Tea 160 Tea Bags 500g',
    image: '',
    onPromotion: true,
    promotionDescription: 'Only £4.00',
    basePrice: 4.5,
    shelfPrice: 4,
    promotedPrice: 4,
  },
  {
    retailer: 'Tesco',
    ean: '70177177775',
    category: 'Green Tea',
    brand: 'Twinings',
    title: 'Twinings Pure Green Tea',
    image: '',
    onPromotion: false,
    promotionDescription: '',
    basePrice: 2,
    shelfPrice: 2,
    promotedPrice: 2,
  },
];

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('loads dashboard data asynchronously and renders KPI values', async () => {
    api.getSummary.mockResolvedValue({
      data: {
        totalProducts: 1302,
        totalRetailers: 5,
        promotionPercentage: 0.2042,
        averageShelfPrice: 4.47,
        biggestDiscount: 0.5,
        topPromotionalBrand: 'Tetley',
      },
      metadata,
    });
    api.getTrends.mockResolvedValue({ data: [{ date: '2022-02-07', averageShelfPrice: 4.47 }] });
    api.getPromotions.mockResolvedValue({ data: { byCategory: [{ name: 'Black Tea', value: 10 }] } });
    api.getProducts.mockResolvedValue({ data: products });

    render(<App />);

    expect(screen.getByText('Loading pricing insights...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Shelf Nudge', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('1,302')).toBeInTheDocument();
    expect(screen.getByText('20.4%')).toBeInTheDocument();
    expect(screen.getByText('Tetley')).toBeInTheDocument();
    expect(await screen.findByText('Yorkshire Tea 160 Tea Bags 500g')).toBeInTheDocument();
  });

  it('shows an async error state when dashboard loading fails', async () => {
    api.getSummary.mockRejectedValue(new Error('offline'));
    api.getTrends.mockResolvedValue({ data: [] });
    api.getPromotions.mockResolvedValue({ data: { byCategory: [] } });
    api.getProducts.mockResolvedValue({ data: [] });

    render(<App />);

    expect(await screen.findByText('Unable to load dashboard data.')).toBeInTheDocument();
    expect(screen.queryByText('offline')).not.toBeInTheDocument();
  });
});

describe('ProductExplorer', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('debounces filter changes before fetching filtered products', async () => {
    vi.useFakeTimers();
    api.getProducts.mockResolvedValue({ data: [products[0]] });

    render(<ProductExplorer initialProducts={products} metadata={metadata} />);

    fireEvent.change(screen.getByPlaceholderText('Search product, brand, category or EAN'), {
      target: { value: 'Yorkshire' },
    });

    act(() => {
      vi.advanceTimersByTime(179);
    });
    expect(api.getProducts).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });

    expect(api.getProducts).toHaveBeenCalledWith({
      retailer: 'All',
      category: 'All',
      promotionOnly: false,
      search: 'Yorkshire',
    });

    const table = screen.getByRole('table');
    expect(within(table).getByText('Yorkshire Tea 160 Tea Bags 500g')).toBeInTheDocument();
  });

  it('shows an empty state when a successful product request returns no matches', async () => {
    vi.useFakeTimers();
    api.getProducts.mockResolvedValue({ data: [] });

    render(<ProductExplorer initialProducts={products} metadata={metadata} />);

    const [retailerSelect, categorySelect] = screen.getAllByDisplayValue('All');
    fireEvent.change(retailerSelect, {
      target: { value: 'Morrisons' },
    });
    fireEvent.change(categorySelect, {
      target: { value: 'Chai Tea' },
    });
    fireEvent.click(screen.getByLabelText('Promotion only'));

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    expect(screen.getByText('No products match the current filters.')).toBeInTheDocument();
    expect(screen.getByText('Try changing the retailer, category, or promotion filter.')).toBeInTheDocument();
    expect(screen.queryByText('Unable to load product data.')).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to load dashboard data.')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a product error state and clears rows when product loading fails', async () => {
    vi.useFakeTimers();
    api.getProducts.mockRejectedValue(new Error('offline'));

    render(<ProductExplorer initialProducts={products} metadata={metadata} />);

    expect(screen.getByText('Yorkshire Tea 160 Tea Bags 500g')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search product, brand, category or EAN'), {
      target: { value: 'Yorkshire' },
    });

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    expect(screen.getByText('Unable to load product data.')).toBeInTheDocument();
    expect(screen.queryByText('Yorkshire Tea 160 Tea Bags 500g')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Chart empty states', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows an empty state when pricing trends data is empty', () => {
    render(<PricingTrendsChart trends={[]} />);

    expect(screen.getByText('No pricing trend data is available.')).toBeInTheDocument();
  });

  it('shows an empty state when retailer comparison data is empty', () => {
    render(<RetailerComparisonChart products={[]} />);

    expect(screen.getByText('No retailer comparison data is available.')).toBeInTheDocument();
  });

  it('shows an empty state when promotion insight data is empty', () => {
    render(<PromotionInsightsChart promotions={{ byCategory: [] }} />);

    expect(screen.getByText('No promotion insights are available.')).toBeInTheDocument();
  });
});
