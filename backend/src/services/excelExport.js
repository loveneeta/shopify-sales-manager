import xlsx from 'xlsx';
import db from '../db/database.js';
import { getProductAnalytics, getDailySalesTrend, getExpensesAndProfit } from './analytics.js';

/**
 * Generate Workbook buffer
 */
function workbookToBuffer(wb, format = 'xlsx') {
  if (format === 'csv') {
    const firstSheet = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheet];
    const csvStr = xlsx.utils.sheet_to_csv(ws);
    return Buffer.from(csvStr, 'utf-8');
  }
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Export Orders List
 */
export function exportOrders({ startDate, endDate, financialStatus, fulfillmentStatus, format = 'xlsx' } = {}) {
  let query = `
    SELECT
      o.order_number as "Order #",
      o.order_date as "Date",
      o.customer_name as "Customer Name",
      o.customer_phone as "Phone",
      o.customer_email as "Email",
      o.shipping_address as "Address",
      o.city as "City",
      o.province as "State",
      o.zip as "Pincode",
      (SELECT GROUP_CONCAT(product_name, ' + ') FROM order_items WHERE order_id = o.id) as "Products",
      (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as "Total Qty",
      o.total_price as "Total Price (INR)",
      o.financial_status as "Payment Status",
      o.fulfillment_status as "Fulfillment Status",
      o.tracking_number as "Tracking #",
      o.notes as "Notes",
      o.source as "Source"
    FROM orders o
    WHERE 1=1
  `;

  const params = [];
  if (startDate && endDate) {
    query += ` AND o.order_date >= ? AND o.order_date <= ?`;
    params.push(startDate, endDate);
  }
  if (financialStatus) {
    query += ` AND o.financial_status = ?`;
    params.push(financialStatus);
  }
  if (fulfillmentStatus) {
    query += ` AND o.fulfillment_status = ?`;
    params.push(fulfillmentStatus);
  }

  query += ` ORDER BY o.order_date DESC, o.id DESC`;

  const rows = db.prepare(query).all(...params);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Orders');

  return workbookToBuffer(wb, format);
}

/**
 * Export Daily Sales Report
 */
export function exportDailySalesReport(startDate, endDate, format = 'xlsx') {
  const trend = getDailySalesTrend(startDate, endDate);
  const rows = trend.map(t => ({
    'Date': t.date,
    'Total Orders': t.orders,
    'Total Sales (INR)': t.sales,
    'Paid Sales (INR)': t.paidSales,
    'COD Sales (INR)': t.codSales,
    'Average Order Value (INR)': t.orders > 0 ? (t.sales / t.orders).toFixed(2) : 0
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Daily Sales');
  return workbookToBuffer(wb, format);
}

/**
 * Export Monthly Sales Report
 */
export function exportMonthlySalesReport(format = 'xlsx') {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', order_date) as "Month",
      COUNT(*) as "Total Orders",
      COALESCE(SUM(total_price), 0.0) as "Gross Sales (INR)",
      COALESCE(SUM(CASE WHEN financial_status = 'PAID' THEN total_price ELSE 0 END), 0.0) as "Paid Sales (INR)",
      COALESCE(SUM(CASE WHEN financial_status = 'COD' THEN total_price ELSE 0 END), 0.0) as "COD Sales (INR)",
      ROUND(AVG(total_price), 2) as "AOV (INR)"
    FROM orders
    GROUP BY strftime('%Y-%m', order_date)
    ORDER BY "Month" ASC
  `).all();

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Monthly Sales');
  return workbookToBuffer(wb, format);
}

/**
 * Export Product Performance Report
 */
export function exportProductReport(startDate, endDate, format = 'xlsx') {
  const products = getProductAnalytics(startDate, endDate, '', 500);
  const rows = products.map((p, idx) => ({
    'Rank': idx + 1,
    'Product Name': p.productName,
    'Orders Count': p.orderCount,
    'Units Sold': p.unitsSold,
    'Revenue (INR)': p.totalRevenue,
    'Average Selling Price (INR)': Number(p.avgSellingPrice).toFixed(2),
    'Revenue Share (%)': `${Number(p.contributionPercentage).toFixed(2)}%`
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Product Performance');
  return workbookToBuffer(wb, format);
}

/**
 * Export Payment Collection Report (Paid vs COD)
 */
export function exportPaymentReport(startDate, endDate, format = 'xlsx') {
  const rows = db.prepare(`
    SELECT
      o.order_number as "Order #",
      o.order_date as "Date",
      o.customer_name as "Customer",
      o.financial_status as "Payment Mode",
      o.total_price as "Amount (INR)",
      o.fulfillment_status as "Delivery Status",
      o.tracking_number as "Tracking #"
    FROM orders o
    WHERE o.order_date >= ? AND o.order_date <= ?
    ORDER BY o.order_date DESC
  `).all(startDate, endDate);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Payment Collection');
  return workbookToBuffer(wb, format);
}

/**
 * Export COD Reconciliation Report
 */
export function exportCODReport(startDate, endDate, format = 'xlsx') {
  const rows = db.prepare(`
    SELECT
      o.order_number as "Order #",
      o.order_date as "Order Date",
      o.customer_name as "Customer Name",
      o.customer_phone as "Contact Phone",
      o.city as "City",
      o.province as "State",
      o.total_price as "COD Amount Collectible (INR)",
      o.fulfillment_status as "Courier Status",
      o.tracking_number as "Waybill / Tracking #"
    FROM orders o
    WHERE o.financial_status = 'COD' AND o.order_date >= ? AND o.order_date <= ?
    ORDER BY o.order_date DESC
  `).all(startDate, endDate);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'COD Reconciliation');
  return workbookToBuffer(wb, format);
}

/**
 * Export Refund & RTO Report
 */
export function exportRefundReport(startDate, endDate, format = 'xlsx') {
  const rows = db.prepare(`
    SELECT
      o.order_number as "Order #",
      o.order_date as "Date",
      o.customer_name as "Customer",
      o.total_price as "Order Value (INR)",
      o.financial_status as "Payment Status",
      o.fulfillment_status as "Status",
      o.notes as "Return / Cancellation Reason"
    FROM orders o
    WHERE (o.financial_status = 'REFUNDED' OR o.fulfillment_status IN ('RTO', 'Cancelled', 'Lost'))
      AND o.order_date >= ? AND o.order_date <= ?
    ORDER BY o.order_date DESC
  `).all(startDate, endDate);

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Refunds and Returns');
  return workbookToBuffer(wb, format);
}

/**
 * Export Profitability Report
 */
export function exportProfitabilityReport(startDate, endDate, format = 'xlsx') {
  const p = getExpensesAndProfit(startDate, endDate);
  const rows = [
    { 'Metric': 'Gross Sales Revenue', 'Amount (INR)': p.grossSales },
    { 'Metric': 'Discounts Given', 'Amount (INR)': -p.discounts },
    { 'Metric': 'Refunds & Returns', 'Amount (INR)': -p.refunds },
    { 'Metric': 'Net Sales', 'Amount (INR)': p.netSales },
    { 'Metric': 'Cost of Goods Sold (COGS)', 'Amount (INR)': -p.productCost },
    { 'Metric': 'Shipping / Logistics Expenses (Delhivery)', 'Amount (INR)': -p.shippingExpenses },
    { 'Metric': 'Advertising Expenses (Meta Ads / Ads)', 'Amount (INR)': -p.advertisingExpenses },
    { 'Metric': 'Packaging Expenses', 'Amount (INR)': -p.packagingExpenses },
    { 'Metric': 'Other Expenses', 'Amount (INR)': -p.otherExpenses },
    { 'Metric': 'Total Operating Expenses', 'Amount (INR)': -p.totalExpenses },
    { 'Metric': 'Estimated Net Profit', 'Amount (INR)': p.estimatedNetProfit },
    { 'Metric': 'Estimated Profit Margin', 'Amount (INR)': `${p.profitMargin.toFixed(2)}%` },
    { 'Metric': 'Cost Data Status', 'Amount (INR)': p.isCostIncomplete ? `Incomplete (${p.missingCostItems} products without cost price)` : 'Complete' }
  ];

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Profitability Statement');
  return workbookToBuffer(wb, format);
}
