import { latestProducts, products } from './dataStore.js';

const average = (values) => {
  const valid = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const round = (value, digits = 2) => Number(value.toFixed(digits));

const discountFor = (product) => {
  if (!product.onPromotion || !product.basePrice || !product.promotedPrice) return null;
  return 1 - product.promotedPrice / product.basePrice;
};

export const filterProducts = (filters) => {
  let rows = latestProducts;

  if (filters.retailer) {
    rows = rows.filter((product) => product.retailer === filters.retailer);
  }

  if (filters.category) {
    rows = rows.filter((product) => product.category === filters.category);
  }

  if (filters.brand) {
    rows = rows.filter((product) => product.brand === filters.brand);
  }

  if (filters.promotionOnly === 'true') {
    rows = rows.filter((product) => product.onPromotion);
  }

  if (filters.search) {
    const query = filters.search.toLowerCase();
    rows = rows.filter((product) => {
      return product.title.toLowerCase().includes(query)
        || product.brand.toLowerCase().includes(query)
        || product.category.toLowerCase().includes(query)
        || product.ean.includes(query);
    });
  }

  return rows;
};

export const getSummary = () => {
  const promoted = latestProducts.filter((product) => product.onPromotion);
  const discounts = promoted.map(discountFor).filter((value) => value !== null);
  const brandCounts = promoted.reduce((counts, product) => {
    counts[product.brand] = (counts[product.brand] || 0) + 1;
    return counts;
  }, {});

  const [topPromotionalBrand = 'None', topPromotionalBrandCount = 0] = Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])[0] || [];

  return {
    totalProducts: new Set(latestProducts.map((product) => product.ean)).size,
    totalRetailers: new Set(latestProducts.map((product) => product.retailer)).size,
    totalBrands: new Set(latestProducts.map((product) => product.brand)).size,
    productsOnPromotion: promoted.length,
    promotionPercentage: latestProducts.length ? round(promoted.length / latestProducts.length, 4) : 0,
    averageShelfPrice: round(average(latestProducts.map((product) => product.shelfPrice))),
    averagePromotedPrice: round(average(promoted.map((product) => product.promotedPrice))),
    averageDiscountPercentage: round(average(discounts), 4),
    biggestDiscount: round(discounts.length ? Math.max(...discounts) : 0, 4),
    topPromotionalBrand,
    topPromotionalBrandCount,
  };
};

export const getTrends = () => {
  const byDate = products.reduce((groups, product) => {
    groups[product.date] ||= {
      date: product.date,
      basePrices: [],
      shelfPrices: [],
      promotedPrices: [],
    };

    groups[product.date].basePrices.push(product.basePrice);
    groups[product.date].shelfPrices.push(product.shelfPrice);
    if (product.onPromotion) groups[product.date].promotedPrices.push(product.promotedPrice);

    return groups;
  }, {});

  return Object.values(byDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((group) => ({
      date: group.date,
      averageBasePrice: round(average(group.basePrices)),
      averageShelfPrice: round(average(group.shelfPrices)),
      averagePromotedPrice: group.promotedPrices.length ? round(average(group.promotedPrices)) : null,
    }));
};

export const getPromotions = () => {
  const promoted = latestProducts.filter((product) => product.onPromotion);

  const groupBy = (key) => Object.entries(promoted.reduce((groups, product) => {
    groups[product[key]] = (groups[product[key]] || 0) + 1;
    return groups;
  }, {}))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return {
    byRetailer: groupBy('retailer'),
    byCategory: groupBy('category'),
  };
};
