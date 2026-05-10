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
  let latestPieData = [];
  const Chart = ({ children }) => <div data-testid="chart">{children}</div>;
  const Primitive = ({ children }) => <div>{children}</div>;
  const Legend = () => (
    <div data-testid="legend">
      {latestPieData.map((item) => (
        <span key={item.name}>{item.name}</span>
      ))}
    </div>
  );
  const Pie = ({ children, data }) => {
    latestPieData = data || [];

    return (
      <div data-testid="pie" data-values={latestPieData.map((item) => item.value).join(',')}>
        {children}
      </div>
    );
  };
  const Tooltip = ({ content }) => {
    if (!content) return <div />;

    return (
      <div>
        {latestPieData.map((item) => React.cloneElement(content, {
          active: true,
          payload: [item],
          key: item.name,
        }))}
      </div>
    );
  };

  return {
    Bar: Primitive,
    BarChart: Chart,
    CartesianGrid: Primitive,
    Cell: Primitive,
    Legend,
    Line: Primitive,
    LineChart: Chart,
    Pie,
    PieChart: Chart,
    ResponsiveContainer: ({ children }) => <div>{children}</div>,
    Tooltip,
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

const makeProducts = (count) => Array.from({ length: count }, (_, index) => {
  const n = index + 1;
  return {
    retailer: n % 2 ? 'Sainsburys' : 'Tesco',
    ean: `EAN${String(n).padStart(3, '0')}`,
    category: n % 2 ? 'Black Tea' : 'Green Tea',
    brand: `Brand ${String(n).padStart(3, '0')}`,
    title: `Product ${String(n).padStart(3, '0')}`,
    image: '',
    onPromotion: false,
    promotionDescription: '',
    basePrice: n,
    shelfPrice: n,
    promotedPrice: null,
  };
});

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
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
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

  it('renders only the first 50 products on page 1', () => {
    api.getProducts.mockResolvedValue({ data: makeProducts(55) });

    render(<ProductExplorer initialProducts={makeProducts(55)} metadata={metadata} />);

    expect(screen.getByText('Product 001')).toBeInTheDocument();
    expect(screen.getByText('Product 050')).toBeInTheDocument();
    expect(screen.queryByText('Product 051')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1-50 of 55 products')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('moves between product pages with next and previous controls', () => {
    api.getProducts.mockResolvedValue({ data: makeProducts(55) });

    render(<ProductExplorer initialProducts={makeProducts(55)} metadata={metadata} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Product 051')).toBeInTheDocument();
    expect(screen.queryByText('Product 001')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 51-55 of 55 products')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

    expect(screen.getByText('Product 001')).toBeInTheDocument();
    expect(screen.queryByText('Product 051')).not.toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('resets pagination to page 1 when filters change', async () => {
    vi.useFakeTimers();
    api.getProducts.mockResolvedValue({ data: makeProducts(60) });

    render(<ProductExplorer initialProducts={makeProducts(60)} metadata={metadata} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search product, brand, category or EAN'), {
      target: { value: 'Product' },
    });

    await act(async () => {
      vi.advanceTimersByTime(180);
      await Promise.resolve();
    });

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-50 of 60 products')).toBeInTheDocument();
  });

  it('resets pagination to page 1 when sorting changes', () => {
    api.getProducts.mockResolvedValue({ data: makeProducts(60) });

    render(<ProductExplorer initialProducts={makeProducts(60)} metadata={metadata} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Brand/ }));

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-50 of 60 products')).toBeInTheDocument();
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

  it('shows promotion count and full-category percentage in the promotion tooltip', () => {
    render(<PromotionInsightsChart promotions={{
      byCategory: [
        { name: 'Instant Coffee', value: 80 },
        { name: 'Black Tea', value: 120 },
        { name: 'Green Tea', value: 50 },
        { name: 'Chai Tea', value: 30 },
        { name: 'Fruit Tea', value: 20 },
        { name: 'Decaf Tea', value: 15 },
        { name: 'Loose Leaf', value: 10 },
      ],
    }} />);

    expect(screen.getAllByText('Instant Coffee').length).toBeGreaterThan(0);
    expect(screen.getByText('80 promotions')).toBeInTheDocument();
    expect(screen.getByText('24.6% of all promoted products')).toBeInTheDocument();
  });

  it('aggregates categories outside the top five into an Other segment', () => {
    render(<PromotionInsightsChart promotions={{
      byCategory: [
        { name: 'Ground Coffee', value: 74 },
        { name: 'Instant Coffee', value: 72 },
        { name: 'Black Tea', value: 71 },
        { name: 'Green Tea', value: 70 },
        { name: 'Chai Tea', value: 69 },
        { name: 'Fruit Tea', value: 40 },
        { name: 'Loose Leaf', value: 21 },
      ],
    }} />);

    expect(within(screen.getByTestId('legend')).getByText('Other')).toBeInTheDocument();
    expect(screen.getAllByText('Other').length).toBeGreaterThan(0);
    expect(screen.getByText('61 promotions')).toBeInTheDocument();
    expect(screen.getByText('14.6% of all promoted products')).toBeInTheDocument();

    const visibleValues = screen.getByTestId('pie').dataset.values.split(',').map(Number);
    const total = 417;
    const visiblePercentageTotal = visibleValues.reduce((sum, value) => sum + ((value / total) * 100), 0);
    expect(visiblePercentageTotal).toBeCloseTo(100, 5);
  });
});
