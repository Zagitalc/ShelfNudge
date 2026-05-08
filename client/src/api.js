const request = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

export const getSummary = () => request('/api/summary');
export const getTrends = () => request('/api/trends');
export const getPromotions = () => request('/api/promotions');

export const getProducts = (filters) => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && value !== 'All' && value !== false) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return request(`/api/products${query ? `?${query}` : ''}`);
};
