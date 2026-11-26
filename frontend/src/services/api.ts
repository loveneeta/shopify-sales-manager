import {
  KPISummary,
  Order,
  ShopifyConfig,
  SyncLog,
  ImportPreviewResult,
  ProductAnalyticsItem,
  ProductCatalogItem,
  ExpenseItem,
  ProfitSummary,
  DailyTrendItem,
  PaymentBreakdownItem,
  FulfillmentBreakdownItem,
  MonthlyComparisonItem
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `Request failed with HTTP ${res.status}`);
  }
  return data;
}

export const api = {
  // Dashboard
  getKPIs: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return fetchJson<KPISummary & { success: boolean }>(`/dashboard/kpis?${q.toString()}`);
  },

  getCharts: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return fetchJson<{
      success: boolean;
      dailySales: DailyTrendItem[];
      paymentBreakdown: PaymentBreakdownItem[];
      fulfillmentBreakdown: FulfillmentBreakdownItem[];
      monthlyComparison: MonthlyComparisonItem[];
    }>(`/dashboard/charts?${q.toString()}`);
  },

  getRecentOrders: () => {
    return fetchJson<{ success: boolean; orders: Order[] }>('/dashboard/recent-orders');
  },

  // Orders
  getOrders: (params: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    financialStatus?: string;
    fulfillmentStatus?: string;
    source?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        q.append(k, String(v));
      }
    });
    return fetchJson<{
      success: boolean;
      orders: Order[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/orders?${q.toString()}`);
  },

  getOrder: (id: number) => {
    return fetchJson<{ success: boolean; order: Order }>(`/orders/${id}`);
  },

  createOrder: (orderData: any) => {
    return fetchJson<{ success: boolean; orderId: number; message: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  updateOrder: (id: number, orderData: any) => {
    return fetchJson<{ success: boolean; message: string }>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData)
    });
  },

  deleteOrder: (id: number, force = false) => {
    return fetchJson<{ success: boolean; message: string }>(`/orders/${id}?force=${force}`, {
      method: 'DELETE'
    });
  },

  // Shopify
  getShopifyConfig: () => {
    return fetchJson<{ success: boolean; config: ShopifyConfig; lastSyncLog?: SyncLog }>('/shopify/config');
  },

  saveShopifyConfig: (data: { shopDomain: string; accessToken?: string; autoSyncInterval?: number }) => {
    return fetchJson<{ success: boolean; message: string; storeName?: string }>('/shopify/config', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  testShopifyConnection: (credentials?: { shopDomain?: string; accessToken?: string }) => {
    return fetchJson<{ success: boolean; shop?: any; error?: string }>('/shopify/test-connection', {
      method: 'POST',
      body: JSON.stringify(credentials || {})
    });
  },

  syncShopifyNow: (fullSync = false) => {
    return fetchJson<{
      success: boolean;
      ordersFetched: number;
      ordersCreated: number;
      ordersUpdated: number;
      durationMs: number;
      error?: string;
    }>('/shopify/sync', {
      method: 'POST',
      body: JSON.stringify({ fullSync })
    });
  },

  getSyncLogs: () => {
    return fetchJson<{ success: boolean; logs: SyncLog[] }>('/shopify/sync-logs');
  },

  // Import
  uploadAndPreview: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/import/upload-preview`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Upload failed');
    }
    return data as ImportPreviewResult & { success: boolean };
  },

  executeImport: (filePath: string, mapping: Record<string, string>, duplicateStrategy = 'skip') => {
    return fetchJson<{
      success: boolean;
      importedRows: number;
      skippedRows: number;
      errorCount: number;
      errors: string[];
    }>('/import/execute', {
      method: 'POST',
      body: JSON.stringify({ filePath, mapping, duplicateStrategy })
    });
  },

  getImportHistory: () => {
    return fetchJson<{ success: boolean; history: any[] }>('/import/history');
  },

  // Products
  getProductAnalytics: (startDate?: string, endDate?: string, search?: string, limit?: number) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    if (search) q.append('search', search);
    if (limit) q.append('limit', String(limit));
    return fetchJson<{ success: boolean; products: ProductAnalyticsItem[] }>(`/products/analytics?${q.toString()}`);
  },

  getProducts: (search?: string) => {
    const q = new URLSearchParams();
    if (search) q.append('search', search);
    return fetchJson<{ success: boolean; products: ProductCatalogItem[] }>(`/products?${q.toString()}`);
  },

  updateProductCost: (id: number, costPrice: number, sellingPrice?: number) => {
    return fetchJson<{ success: boolean; message: string }>(`/products/${id}/cost`, {
      method: 'PUT',
      body: JSON.stringify({ costPrice, sellingPrice })
    });
  },

  // Expenses & Profit
  getExpenses: (params?: { startDate?: string; endDate?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    if (params?.category) q.append('category', params.category);
    return fetchJson<{ success: boolean; expenses: ExpenseItem[]; categories: { category: string; total: number }[] }>(
      `/expenses?${q.toString()}`
    );
  },

  getProfitSummary: (startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (startDate) q.append('startDate', startDate);
    if (endDate) q.append('endDate', endDate);
    return fetchJson<ProfitSummary & { success: boolean }>(`/expenses/profit-summary?${q.toString()}`);
  },

  createExpense: (data: { category: string; description?: string; amount: number; expenseDate: string; notes?: string }) => {
    return fetchJson<{ success: boolean; id: number; message: string }>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateExpense: (id: number, data: Partial<ExpenseItem>) => {
    return fetchJson<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteExpense: (id: number) => {
    return fetchJson<{ success: boolean; message: string }>(`/expenses/${id}`, {
      method: 'DELETE'
    });
  },

  // Reports & Updates
  generateReport: (data: {
    reportType: string;
    startDate: string;
    endDate: string;
    format?: 'formal' | 'concise';
    customSettings?: any;
    saveToHistory?: boolean;
  }) => {
    return fetchJson<{
      success: boolean;
      reportData: any;
      messageText: string;
      historyId: number | null;
    }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getReportHistory: () => {
    return fetchJson<{ success: boolean; history: any[] }>('/reports/history');
  },

  deleteReportHistory: (id: number) => {
    return fetchJson<{ success: boolean; message: string }>(`/reports/history/${id}`, {
      method: 'DELETE'
    });
  },

  getMonthlyReport: (month: string) => {
    return fetchJson<any>(`/reports/monthly?month=${month}`);
  },

  // System
  getStats: () => {
    return fetchJson<{ success: boolean; stats: any }>('/system/stats');
  },

  reseedExcel: () => {
    return fetchJson<{ success: boolean; message: string }>('/system/seed-excel', {
      method: 'POST'
    });
  }
};
