import db from '../db/database.js';

/**
 * Helper to compute previous period dates given startDate and endDate
 */
export function getPreviousPeriod(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - diffDays + 1);

  return {
    prevStartDate: prevStart.toISOString().slice(0, 10),
    prevEndDate: prevEnd.toISOString().slice(0, 10),
    days: diffDays
  };
}

/**
 * Calculate KPI summary for a date range
 */
export function getKPISummary(startDate, endDate) {
  const currentQuery = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      COALESCE(SUM(total_price), 0.0) as totalSales,
      COALESCE(SUM(total_discounts), 0.0) as totalDiscounts,
      COUNT(CASE WHEN financial_status = 'PAID' THEN 1 END) as paidOrders,
      COALESCE(SUM(CASE WHEN financial_status = 'PAID' THEN total_price ELSE 0 END), 0.0) as paidSales,
      COUNT(CASE WHEN financial_status = 'COD' THEN 1 END) as codOrders,
      COALESCE(SUM(CASE WHEN financial_status = 'COD' THEN total_price ELSE 0 END), 0.0) as codSales,
      COUNT(CASE WHEN financial_status = 'PENDING' OR fulfillment_status = 'Pending' THEN 1 END) as pendingOrders,
      COUNT(CASE WHEN financial_status = 'REFUNDED' OR fulfillment_status = 'Cancelled' THEN 1 END) as refundedOrders,
      COALESCE(SUM(CASE WHEN financial_status = 'REFUNDED' THEN total_price ELSE 0 END), 0.0) as refundedAmount
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
  `);

  const currentUnitsQuery = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity), 0) as totalUnits
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_date >= ? AND o.order_date <= ?
  `);

  const current = currentQuery.get(startDate, endDate);
  const currentUnits = currentUnitsQuery.get(startDate, endDate);

  const totalOrders = current.totalOrders || 0;
  const totalSales = current.totalSales || 0.0;
  const totalUnits = currentUnits.totalUnits || 0;
  const aov = totalOrders > 0 ? (totalSales / totalOrders) : 0.0;

  // Previous period comparison
  const { prevStartDate, prevEndDate } = getPreviousPeriod(startDate, endDate);
  const prev = currentQuery.get(prevStartDate, prevEndDate);
  const prevUnits = currentUnitsQuery.get(prevStartDate, prevEndDate);

  const prevOrders = prev.totalOrders || 0;
  const prevSales = prev.totalSales || 0.0;
  const prevUnitsTotal = prevUnits.totalUnits || 0;
  const prevAov = prevOrders > 0 ? (prevSales / prevOrders) : 0.0;

  function calcGrowth(curr, previous) {
    if (!previous || previous === 0) {
      return curr > 0 ? 100.0 : 0.0;
    }
    return ((curr - previous) / previous) * 100.0;
  }

  return {
    period: { startDate, endDate },
    previousPeriod: { startDate: prevStartDate, endDate: prevEndDate },
    kpis: {
      totalSales: { value: totalSales, previous: prevSales, growth: calcGrowth(totalSales, prevSales) },
      totalOrders: { value: totalOrders, previous: prevOrders, growth: calcGrowth(totalOrders, prevOrders) },
      totalUnits: { value: totalUnits, previous: prevUnitsTotal, growth: calcGrowth(totalUnits, prevUnitsTotal) },
      aov: { value: aov, previous: prevAov, growth: calcGrowth(aov, prevAov) },
      paidOrders: { value: current.paidOrders || 0, sales: current.paidSales || 0.0, previous: prev.paidOrders || 0 },
      codOrders: { value: current.codOrders || 0, sales: current.codSales || 0.0, previous: prev.codOrders || 0 },
      pendingPayments: { value: current.pendingOrders || 0, previous: prev.pendingOrders || 0 },
      refundedOrders: { value: current.refundedOrders || 0, amount: current.refundedAmount || 0.0, previous: prev.refundedOrders || 0 }
    }
  };
}

/**
 * Get daily sales trend and orders per day
 */
export function getDailySalesTrend(startDate, endDate) {
  const rows = db.prepare(`
    SELECT
      order_date as date,
      COUNT(*) as orders,
      COALESCE(SUM(total_price), 0.0) as sales,
      COALESCE(SUM(CASE WHEN financial_status = 'PAID' THEN total_price ELSE 0 END), 0.0) as paidSales,
      COALESCE(SUM(CASE WHEN financial_status = 'COD' THEN total_price ELSE 0 END), 0.0) as codSales
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
    GROUP BY order_date
    ORDER BY order_date ASC
  `).all(startDate, endDate);

  return rows;
}

/**
 * Get payment breakdown (Paid vs COD)
 */
export function getPaymentBreakdown(startDate, endDate) {
  const rows = db.prepare(`
    SELECT
      financial_status as status,
      COUNT(*) as count,
      COALESCE(SUM(total_price), 0.0) as totalAmount
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
    GROUP BY financial_status
  `).all(startDate, endDate);

  return rows;
}

/**
 * Get fulfillment status breakdown
 */
export function getFulfillmentBreakdown(startDate, endDate) {
  const rows = db.prepare(`
    SELECT
      fulfillment_status as status,
      COUNT(*) as count,
      COALESCE(SUM(total_price), 0.0) as totalAmount
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
    GROUP BY fulfillment_status
  `).all(startDate, endDate);

  return rows;
}

/**
 * Get monthly revenue comparison (e.g. past 12 months)
 */
export function getMonthlyRevenueComparison() {
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', order_date) as month,
      COUNT(*) as orders,
      COALESCE(SUM(total_price), 0.0) as totalSales,
      COALESCE(SUM(CASE WHEN financial_status = 'PAID' THEN total_price ELSE 0 END), 0.0) as paidSales,
      COALESCE(SUM(CASE WHEN financial_status = 'COD' THEN total_price ELSE 0 END), 0.0) as codSales
    FROM orders
    GROUP BY strftime('%Y-%m', order_date)
    ORDER BY month ASC
  `).all();

  return rows;
}

/**
 * Get product analytics and performance ranking
 */
export function getProductAnalytics(startDate, endDate, search = '', limit = 100) {
  let queryStr = `
    SELECT
      oi.product_name as productName,
      COUNT(DISTINCT o.id) as orderCount,
      COALESCE(SUM(oi.quantity), 0) as unitsSold,
      COALESCE(SUM(oi.price), 0.0) as totalRevenue,
      COALESCE(AVG(oi.price / NULLIF(oi.quantity, 0)), 0.0) as avgSellingPrice,
      COALESCE(p.cost_price, 0.0) as unitCost
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_name = p.title
    WHERE o.order_date >= ? AND o.order_date <= ?
  `;

  const params = [startDate, endDate];
  if (search) {
    queryStr += ` AND oi.product_name LIKE ?`;
    params.push(`%${search}%`);
  }

  queryStr += ` GROUP BY oi.product_name ORDER BY totalRevenue DESC LIMIT ?`;
  params.push(limit);

  const products = db.prepare(queryStr).all(...params);

  // Compute total period revenue to calculate contribution percentage
  const totalRevRow = db.prepare(`
    SELECT COALESCE(SUM(total_price), 0.0) as periodTotal
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
  `).get(startDate, endDate);

  const periodTotal = totalRevRow?.periodTotal || 0.0;

  return products.map(p => ({
    ...p,
    contributionPercentage: periodTotal > 0 ? ((p.totalRevenue / periodTotal) * 100) : 0
  }));
}

/**
 * Expenses and profit calculations
 */
export function getExpensesAndProfit(startDate, endDate) {
  // Sales components
  const salesRow = db.prepare(`
    SELECT
      COALESCE(SUM(total_price), 0.0) as grossSales,
      COALESCE(SUM(total_discounts), 0.0) as discounts,
      COALESCE(SUM(CASE WHEN financial_status = 'REFUNDED' OR fulfillment_status = 'Cancelled' THEN total_price ELSE 0 END), 0.0) as refunds
    FROM orders
    WHERE order_date >= ? AND order_date <= ?
  `).get(startDate, endDate);

  const grossSales = salesRow.grossSales || 0.0;
  const discounts = salesRow.discounts || 0.0;
  const refunds = salesRow.refunds || 0.0;
  const netSales = grossSales - discounts - refunds;

  // Expenses breakdown
  const expenseRows = db.prepare(`
    SELECT
      category,
      COALESCE(SUM(amount), 0.0) as totalAmount
    FROM expenses
    WHERE expense_date >= ? AND expense_date <= ?
    GROUP BY category
  `).all(startDate, endDate);

  let advertisingExpenses = 0.0;
  let shippingExpenses = 0.0;
  let packagingExpenses = 0.0;
  let otherExpenses = 0.0;

  expenseRows.forEach(exp => {
    const cat = exp.category.toLowerCase();
    if (cat.includes('ad') || cat.includes('meta') || cat.includes('facebook') || cat.includes('google')) {
      advertisingExpenses += exp.totalAmount;
    } else if (cat.includes('shipping') || cat.includes('delhivery') || cat.includes('courier') || cat.includes('logistics')) {
      shippingExpenses += exp.totalAmount;
    } else if (cat.includes('pack')) {
      packagingExpenses += exp.totalAmount;
    } else {
      otherExpenses += exp.totalAmount;
    }
  });

  // If no date-scoped expenses found (e.g. historical seed from start date), also return overall totals for awareness
  const totalRecordedExpenses = db.prepare(`SELECT COALESCE(SUM(amount), 0.0) as total FROM expenses`).get().total;

  // Product cost (COGS) calculation from order items
  const cogsRow = db.prepare(`
    SELECT
      COALESCE(SUM(oi.quantity * COALESCE(p.cost_price, oi.cost_price, 0.0)), 0.0) as totalCost,
      COUNT(CASE WHEN COALESCE(p.cost_price, oi.cost_price, 0.0) = 0 THEN 1 END) as zeroCostCount,
      COUNT(*) as totalItemCount
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_name = p.title
    WHERE o.order_date >= ? AND o.order_date <= ?
  `).get(startDate, endDate);

  const productCost = cogsRow?.totalCost || 0.0;
  const isMissingCost = (cogsRow?.zeroCostCount || 0) > 0;
  const missingCostItems = cogsRow?.zeroCostCount || 0;

  const totalExpenses = productCost + shippingExpenses + advertisingExpenses + packagingExpenses + otherExpenses;
  const estimatedNetProfit = netSales - totalExpenses;
  const profitMargin = grossSales > 0 ? (estimatedNetProfit / grossSales) * 100 : 0;

  return {
    grossSales,
    discounts,
    refunds,
    netSales,
    productCost,
    shippingExpenses,
    advertisingExpenses,
    packagingExpenses,
    otherExpenses,
    totalExpenses,
    totalRecordedExpenses,
    estimatedNetProfit,
    profitMargin,
    isCostIncomplete: isMissingCost,
    missingCostItems,
    expensesByCategory: expenseRows
  };
}
