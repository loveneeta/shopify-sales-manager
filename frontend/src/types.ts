export interface KPIValue {
  value: number;
  previous: number;
  growth: number;
  sales?: number;
  amount?: number;
}

export interface KPISummary {
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  kpis: {
    totalSales: KPIValue;
    totalOrders: KPIValue;
    totalUnits: KPIValue;
    aov: KPIValue;
    paidOrders: KPIValue;
    codOrders: KPIValue;
    pendingPayments: KPIValue;
    refundedOrders: KPIValue;
  };
}

export interface DailyTrendItem {
  date: string;
  orders: number;
  sales: number;
  paidSales: number;
  codSales: number;
}

export interface PaymentBreakdownItem {
  status: string;
  count: number;
  totalAmount: number;
}

export interface FulfillmentBreakdownItem {
  status: string;
  count: number;
  totalAmount: number;
}

export interface MonthlyComparisonItem {
  month: string;
  orders: number;
  totalSales: number;
  paidSales: number;
  codSales: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  shopify_line_item_id?: string;
  product_name: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  price: number;
  cost_price?: number;
}

export interface Customer {
  id: number;
  full_name?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
}

export interface Order {
  id: number;
  shopify_order_id?: string;
  order_number: string;
  order_name: string;
  order_date: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
  city?: string;
  province?: string;
  zip?: string;
  total_price: number;
  subtotal_price?: number;
  total_discounts?: number;
  total_tax?: number;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  tracking_number?: string;
  tracking_company?: string;
  notes?: string;
  source: string;
  is_manual: number;
  manual_override: number;
  itemCount?: number;
  totalQuantity?: number;
  productSummary?: string;
  items?: OrderItem[];
  customer?: Customer;
  refunds?: any[];
  created_at: string;
}

export interface ProductAnalyticsItem {
  productName: string;
  orderCount: number;
  unitsSold: number;
  totalRevenue: number;
  avgSellingPrice: number;
  contributionPercentage: number;
  unitCost?: number;
}

export interface ProductCatalogItem {
  id: number;
  title: string;
  sku?: string;
  cost_price: number;
  selling_price: number;
}

export interface ExpenseItem {
  id: number;
  category: string;
  description?: string;
  amount: number;
  expense_date: string;
  source: string;
  notes?: string;
  created_at: string;
}

export interface ProfitSummary {
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  productCost: number;
  shippingExpenses: number;
  advertisingExpenses: number;
  packagingExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  estimatedNetProfit: number;
  profitMargin: number;
  isCostIncomplete: boolean;
  missingCostItems: number;
  expensesByCategory: { category: string; totalAmount: number }[];
}

export interface ShopifyConfig {
  configured: boolean;
  shopDomain: string;
  maskedToken: string;
  hasToken: boolean;
  storeName: string;
  currency: string;
  lastSyncedAt?: string;
  autoSyncInterval: number;
  isActive: boolean;
}

export interface SyncLog {
  id: number;
  status: string;
  orders_fetched: number;
  orders_created: number;
  orders_updated: number;
  error_message?: string;
  duration_ms: number;
  sync_type: string;
  created_at: string;
}

export interface ImportPreviewResult {
  sheetName: string;
  sheetNames: string[];
  headers: string[];
  detectedMapping: Record<string, string>;
  previewRows: Record<string, any>[];
  estimatedTotalOrders: number;
  file: {
    filename: string;
    originalName: string;
    size: number;
    path: string;
  };
}

export interface DailyReportItem {
  date: string;
  displayDate: string;
  shortDate: string;
  validOrders: number;
  units: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  paidOrders: number;
  paidSales: number;
  codOrders: number;
  codSales: number;
  pendingOrders: number;
  cancelledOrders: number;
  expenses: {
    metaAds: number | null;
    shipping: number | null;
    packaging: number | null;
    other: number | null;
    totalExpenses: number;
    hasMetaAds: boolean;
    hasShipping: boolean;
    hasPackaging: boolean;
    hasOther: boolean;
  };
  netBalance: number;
}

export interface ConsolidatedTotals {
  totalOrders: number;
  totalUnits: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  paidOrders: number;
  paidSales: number;
  codOrders: number;
  codSales: number;
  pendingOrders: number;
  cancelledOrders: number;
  metaAdsExpenses: number;
  shippingExpenses: number;
  packagingExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  netBalance: number;
}

export interface ReportDataResult {
  startDate: string;
  endDate: string;
  daysCount: number;
  dailyList: DailyReportItem[];
  consolidated: ConsolidatedTotals;
}

export interface ReportCustomization {
  includeOrders: boolean;
  includeTotalSales: boolean;
  includeDiscounts: boolean;
  includeRefunds: boolean;
  includeNetSales: boolean;
  includePaidCod: boolean;
  includeMetaAds: boolean;
  includeShipping: boolean;
  includePackaging: boolean;
  includeOther: boolean;
  includeTotalExpenses: boolean;
  includeNetBalance: boolean;
  showMissingAsNotEntered: boolean;
}

export interface GeneratedReportRecord {
  id: number;
  report_type: string;
  start_date: string;
  end_date: string;
  total_orders: number;
  total_sales: number;
  total_expenses: number;
  net_balance: number;
  message_content: string;
  customization_settings?: string;
  generated_at: string;
}

export interface MonthlyReportResult extends ReportDataResult {
  yearMonth: string;
  totalActiveDays: number;
  highestDay: DailyReportItem | null;
  lowestDay: DailyReportItem | null;
  avgDailySales: number;
}
