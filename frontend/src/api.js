const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  getSummary: (month) => request(`/transactions/summary/${month}`),
  getMonthlySummary: () => request('/transactions/monthly-summary'),
  getAnalytics: (month, interval) =>
    request(`/transactions/analytics?month=${month}&interval=${interval}`),
  getTransactions: (month) => request(`/transactions${month ? `?month=${month}` : ''}`),
  createTransaction: (data) =>
    request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id, data) =>
    request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),

  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) =>
    request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getBudget: (month) => request(`/budgets/${month}`),
  setBudget: (month, totalBudget) =>
    request(`/budgets/${month}`, { method: 'PUT', body: JSON.stringify({ totalBudget }) }),

  getStartingBalance: () => request('/starting-balance'),
  setStartingBalance: (amount) =>
    request('/starting-balance', { method: 'PUT', body: JSON.stringify({ amount }) }),

  getAssets: () => request('/assets'),
  createAsset: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id, data) =>
    request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id) => request(`/assets/${id}`, { method: 'DELETE' }),

  importStatement: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/import', { method: 'POST', body: formData });
  }
};
