import db from '../db/database.js';

/**
 * Format currency with Indian grouping (e.g. ₹1,25,000)
 */
export function formatINR(val, includeDecimals = false) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  const num = Number(val);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  }).format(num);
}

/**
 * Format a YYYY-MM-DD date string to e.g. "25 November 2026"
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Generate list of dates between start and end (inclusive)
 */
export function getDateList(startDate, endDate) {
  const dates = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

/**
 * Calculate daily breakdown for a date range
 */
export function calculateDailyReport(startDate, endDate) {
  const dates = getDateList(startDate, endDate);

  const getDaySalesStmt = db.prepare(`
    SELECT
      COUNT(CASE WHEN fulfillment_status != 'Cancelled' THEN 1 END) as validOrders,
      COALESCE(SUM(CASE WHEN fulfillment_status != 'Cancelled' THEN total_price ELSE 0 END), 0.0) as grossSales,
      COALESCE(SUM(CASE WHEN fulfillment_status != 'Cancelled' THEN total_discounts ELSE 0 END), 0.0) as discounts,
      COALESCE(SUM(CASE WHEN financial_status = 'REFUNDED' OR fulfillment_status = 'Cancelled' THEN total_price ELSE 0 END), 0.0) as refunds,
      COUNT(CASE WHEN financial_status = 'PAID' AND fulfillment_status != 'Cancelled' THEN 1 END) as paidOrders,
      COALESCE(SUM(CASE WHEN financial_status = 'PAID' AND fulfillment_status != 'Cancelled' THEN total_price ELSE 0 END), 0.0) as paidSales,
      COUNT(CASE WHEN financial_status = 'COD' AND fulfillment_status != 'Cancelled' THEN 1 END) as codOrders,
      COALESCE(SUM(CASE WHEN financial_status = 'COD' AND fulfillment_status != 'Cancelled' THEN total_price ELSE 0 END), 0.0) as codSales,
      COUNT(CASE WHEN financial_status = 'PENDING' OR fulfillment_status = 'Pending' THEN 1 END) as pendingOrders,
      COUNT(CASE WHEN fulfillment_status = 'Cancelled' THEN 1 END) as cancelledOrders
    FROM orders
    WHERE order_date = ?
  `);

  const getDayUnitsStmt = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity), 0) as totalUnits
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_date = ? AND o.fulfillment_status != 'Cancelled'
  `);

  const getDayExpensesStmt = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0.0) as totalAmount
    FROM expenses
    WHERE expense_date = ?
    GROUP BY category
  `);

  const dailyList = [];

  for (const date of dates) {
    const s = getDaySalesStmt.get(date) || {};
    const u = getDayUnitsStmt.get(date) || {};
    const expRows = getDayExpensesStmt.all(date) || [];

    const validOrders = s.validOrders || 0;
    const grossSales = s.grossSales || 0.0;
    const discounts = s.discounts || 0.0;
    const refunds = s.refunds || 0.0;
    const netSales = Math.max(0, grossSales - discounts - refunds);
    const units = u.totalUnits || 0;

    let metaAds = null;
    let shipping = null;
    let packaging = null;
    let other = null;

    expRows.forEach(exp => {
      const cat = exp.category.toLowerCase();
      if (cat.includes('meta') || cat.includes('ad')) {
        metaAds = (metaAds || 0) + exp.totalAmount;
      } else if (cat.includes('shipping') || cat.includes('delhivery') || cat.includes('courier')) {
        shipping = (shipping || 0) + exp.totalAmount;
      } else if (cat.includes('pack')) {
        packaging = (packaging || 0) + exp.totalAmount;
      } else {
        other = (other || 0) + exp.totalAmount;
      }
    });

    const totalExpenses = (metaAds || 0) + (shipping || 0) + (packaging || 0) + (other || 0);
    const netBalance = netSales - totalExpenses;

    dailyList.push({
      date,
      displayDate: formatDisplayDate(date),
      shortDate: formatShortDate(date),
      validOrders,
      units,
      grossSales,
      discounts,
      refunds,
      netSales,
      paidOrders: s.paidOrders || 0,
      paidSales: s.paidSales || 0.0,
      codOrders: s.codOrders || 0,
      codSales: s.codSales || 0.0,
      pendingOrders: s.pendingOrders || 0,
      cancelledOrders: s.cancelledOrders || 0,
      expenses: {
        metaAds,
        shipping,
        packaging,
        other,
        totalExpenses,
        hasMetaAds: metaAds !== null,
        hasShipping: shipping !== null,
        hasPackaging: packaging !== null,
        hasOther: other !== null
      },
      netBalance
    });
  }

  // Consolidated totals across all days in range
  const consolidated = dailyList.reduce(
    (acc, day) => {
      acc.totalOrders += day.validOrders;
      acc.totalUnits += day.units;
      acc.grossSales += day.grossSales;
      acc.discounts += day.discounts;
      acc.refunds += day.refunds;
      acc.netSales += day.netSales;
      acc.paidOrders += day.paidOrders;
      acc.paidSales += day.paidSales;
      acc.codOrders += day.codOrders;
      acc.codSales += day.codSales;
      acc.pendingOrders += day.pendingOrders;
      acc.cancelledOrders += day.cancelledOrders;

      if (day.expenses.metaAds !== null) acc.metaAdsExpenses += day.expenses.metaAds;
      if (day.expenses.shipping !== null) acc.shippingExpenses += day.expenses.shipping;
      if (day.expenses.packaging !== null) acc.packagingExpenses += day.expenses.packaging;
      if (day.expenses.other !== null) acc.otherExpenses += day.expenses.other;
      acc.totalExpenses += day.expenses.totalExpenses;
      acc.netBalance += day.netBalance;

      return acc;
    },
    {
      totalOrders: 0,
      totalUnits: 0,
      grossSales: 0.0,
      discounts: 0.0,
      refunds: 0.0,
      netSales: 0.0,
      paidOrders: 0,
      paidSales: 0.0,
      codOrders: 0,
      codSales: 0.0,
      pendingOrders: 0,
      cancelledOrders: 0,
      metaAdsExpenses: 0.0,
      shippingExpenses: 0.0,
      packagingExpenses: 0.0,
      otherExpenses: 0.0,
      totalExpenses: 0.0,
      netBalance: 0.0
    }
  );

  return {
    startDate,
    endDate,
    daysCount: dailyList.length,
    dailyList,
    consolidated
  };
}

/**
 * Generate formatted WhatsApp message text
 */
export function generateWhatsAppMessage(reportData, customSettings = {}, format = 'formal') {
  const { dailyList, consolidated, daysCount } = reportData;

  const defaultCustom = {
    includeOrders: true,
    includeTotalSales: true,
    includeDiscounts: false,
    includeRefunds: false,
    includeNetSales: false,
    includePaidCod: false,
    includeMetaAds: true,
    includeShipping: true,
    includePackaging: false,
    includeOther: true,
    includeTotalExpenses: true,
    includeNetBalance: true,
    showMissingAsNotEntered: true
  };

  const c = { ...defaultCustom, ...customSettings };

  const formatExpenseVal = (val, hasVal) => {
    if (val !== null && val !== undefined) return formatINR(val);
    return c.showMissingAsNotEntered ? 'Not Entered' : '₹0';
  };

  if (format === 'concise') {
    // Concise bullet format
    let msg = `*SALES & EXPENSE UPDATE (${daysCount} ${daysCount === 1 ? 'DAY' : 'DAYS'})*\n`;
    msg += `Period: ${dailyList[0]?.shortDate || ''} to ${dailyList[dailyList.length - 1]?.shortDate || ''}\n\n`;

    dailyList.forEach(day => {
      msg += `📅 *${day.shortDate}*\n`;
      if (c.includeOrders) msg += `• Orders: ${day.validOrders}\n`;
      if (c.includeTotalSales) msg += `• Sales: ${formatINR(day.grossSales)}\n`;
      if (c.includePaidCod) msg += `• Paid: ${day.paidOrders} | COD: ${day.codOrders}\n`;
      if (c.includeMetaAds) msg += `• Meta Ads: ${formatExpenseVal(day.expenses.metaAds, day.expenses.hasMetaAds)}\n`;
      if (c.includeShipping) msg += `• Shipping: ${formatExpenseVal(day.expenses.shipping, day.expenses.hasShipping)}\n`;
      if (c.includePackaging && (day.expenses.packaging || !c.showMissingAsNotEntered)) {
        msg += `• Packaging: ${formatExpenseVal(day.expenses.packaging, day.expenses.hasPackaging)}\n`;
      }
      if (c.includeOther && (day.expenses.other || !c.showMissingAsNotEntered)) {
        msg += `• Other Exp: ${formatExpenseVal(day.expenses.other, day.expenses.hasOther)}\n`;
      }
      if (c.includeTotalExpenses) msg += `• Total Exp: ${formatINR(day.expenses.totalExpenses)}\n`;
      if (c.includeNetBalance) msg += `• Operating Balance: ${formatINR(day.netBalance)}\n`;
      msg += `\n`;
    });

    msg += `📊 *CONSOLIDATED TOTAL (${daysCount} ${daysCount === 1 ? 'DAY' : 'DAYS'})*\n`;
    if (c.includeOrders) msg += `• Total Orders: ${consolidated.totalOrders}\n`;
    if (c.includeTotalSales) msg += `• Total Sales: ${formatINR(consolidated.grossSales)}\n`;
    if (c.includePaidCod) msg += `• Paid: ${consolidated.paidOrders} (${formatINR(consolidated.paidSales)}) | COD: ${consolidated.codOrders} (${formatINR(consolidated.codSales)})\n`;
    if (c.includeTotalExpenses) msg += `• Total Expenses: ${formatINR(consolidated.totalExpenses)}\n`;
    if (c.includeNetBalance) msg += `• Net Operating Balance: ${formatINR(consolidated.netBalance)}\n`;

    return msg.trim();
  }

  // Formal Format (Exact structure requested by user prompt)
  const greetingHeader = daysCount === 2 
    ? 'Please find below the sales and expense report for the last two days.'
    : `Please find below the sales and expense report for the period ${dailyList[0]?.shortDate} to ${dailyList[dailyList.length - 1]?.shortDate}.`;

  let msg = `Good Evening Sir,\n\n${greetingHeader}\n\n`;
  msg += `SALES & EXPENSE REPORT\n\n`;

  dailyList.forEach(day => {
    msg += `Date: ${day.displayDate}\n\n`;
    if (c.includeOrders) msg += `Total Orders: ${day.validOrders}\n`;
    if (c.includeTotalSales) msg += `Total Sales: ${formatINR(day.grossSales)}\n`;
    if (c.includeDiscounts && day.discounts > 0) msg += `Discounts: ${formatINR(day.discounts)}\n`;
    if (c.includeRefunds && day.refunds > 0) msg += `Refunds: ${formatINR(day.refunds)}\n`;
    if (c.includeNetSales) msg += `Net Sales: ${formatINR(day.netSales)}\n`;
    if (c.includePaidCod) msg += `Paid Orders: ${day.paidOrders} (${formatINR(day.paidSales)}) | COD: ${day.codOrders} (${formatINR(day.codSales)})\n`;
    if (c.includeMetaAds) msg += `Meta Ads Expenses: ${formatExpenseVal(day.expenses.metaAds, day.expenses.hasMetaAds)}\n`;
    if (c.includeShipping) msg += `Shipping Expenses: ${formatExpenseVal(day.expenses.shipping, day.expenses.hasShipping)}\n`;
    if (c.includePackaging && (day.expenses.packaging || !c.showMissingAsNotEntered)) {
      msg += `Packaging Expenses: ${formatExpenseVal(day.expenses.packaging, day.expenses.hasPackaging)}\n`;
    }
    if (c.includeOther) msg += `Other Expenses: ${formatExpenseVal(day.expenses.other, day.expenses.hasOther)}\n`;
    if (c.includeTotalExpenses) msg += `Total Expenses: ${formatINR(day.expenses.totalExpenses)}\n`;
    if (c.includeNetBalance) msg += `Operating Balance: ${formatINR(day.netBalance)}\n`;
    msg += `\n`;
  });

  const summaryTitle = daysCount === 2 ? 'CONSOLIDATED SUMMARY (2 DAYS)' : `CONSOLIDATED SUMMARY (${daysCount} DAYS)`;
  msg += `${summaryTitle}\n\n`;
  if (c.includeOrders) msg += `Total Orders: ${consolidated.totalOrders}\n`;
  if (c.includeTotalSales) msg += `Total Sales: ${formatINR(consolidated.grossSales)}\n`;
  if (c.includeTotalExpenses) msg += `Total Expenses: ${formatINR(consolidated.totalExpenses)}\n`;
  if (c.includeNetBalance) msg += `Net Balance: ${formatINR(consolidated.netBalance)}\n`;

  msg += `\nRegards`;
  return msg;
}

/**
 * Save generated report to history
 */
export function saveReportHistory({ reportType, startDate, endDate, totalOrders, totalSales, totalExpenses, netBalance, messageContent, customSettings }) {
  const stmt = db.prepare(`
    INSERT INTO generated_reports (
      report_type, start_date, end_date, total_orders, total_sales, total_expenses, net_balance,
      message_content, customization_settings, generated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const res = stmt.run(
    reportType,
    startDate,
    endDate,
    totalOrders,
    totalSales,
    totalExpenses,
    netBalance,
    messageContent,
    customSettings ? JSON.stringify(customSettings) : null
  );

  return res.lastInsertRowid;
}

/**
 * Get monthly consolidated report breakdown
 */
export function calculateMonthlyReport(yearMonth) {
  // yearMonth format: "YYYY-MM" e.g. "2026-11"
  const startDate = `${yearMonth}-01`;
  const [y, m] = yearMonth.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;

  const reportData = calculateDailyReport(startDate, endDate);

  // Filter out days with zero orders and zero expenses if preferred, or keep all
  const activeDays = reportData.dailyList.filter(d => d.validOrders > 0 || d.expenses.totalExpenses > 0);

  // Highest & lowest sales day
  let highestDay = null;
  let lowestDay = null;

  activeDays.forEach(d => {
    if (!highestDay || d.grossSales > highestDay.grossSales) highestDay = d;
    if (!lowestDay || d.grossSales < lowestDay.grossSales) lowestDay = d;
  });

  const totalActiveDays = activeDays.length || 1;
  const avgDailySales = reportData.consolidated.grossSales / totalActiveDays;

  return {
    yearMonth,
    startDate,
    endDate,
    totalActiveDays,
    ...reportData,
    highestDay,
    lowestDay,
    avgDailySales
  };
}
