import express from 'express';
import xlsx from 'xlsx';
import db from '../db/database.js';
import {
  calculateDailyReport,
  generateWhatsAppMessage,
  saveReportHistory,
  calculateMonthlyReport,
  formatINR
} from '../services/reportGenerator.js';

const router = express.Router();

/**
 * POST /api/reports/generate
 * Generates Daily, 2-Day, Weekly, Monthly, or Custom Report with WhatsApp text
 */
router.post('/generate', (req, res) => {
  try {
    const {
      reportType = 'last2days',
      startDate,
      endDate,
      format = 'formal',
      customSettings = {},
      saveToHistory = true
    } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required.' });
    }

    const reportData = calculateDailyReport(startDate, endDate);
    const messageText = generateWhatsAppMessage(reportData, customSettings, format, reportType);

    let historyId = null;
    if (saveToHistory) {
      historyId = saveReportHistory({
        reportType,
        startDate,
        endDate,
        totalOrders: reportData.consolidated.totalOrders,
        totalSales: reportData.consolidated.grossSales,
        totalExpenses: reportData.consolidated.totalExpenses,
        netBalance: reportData.consolidated.netBalance,
        messageContent: messageText,
        customSettings
      });
    }

    res.json({
      success: true,
      reportData,
      messageText,
      historyId
    });
  } catch (err) {
    console.error('[Reports Generate] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/history
 * List previously generated reports
 */
router.get('/history', (req, res) => {
  try {
    const history = db.prepare(`
      SELECT * FROM generated_reports
      ORDER BY id DESC
      LIMIT 50
    `).all();

    res.json({ success: true, history });
  } catch (err) {
    console.error('[Reports History] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/history/:id
 */
router.get('/history/:id', (req, res) => {
  try {
    const report = db.prepare('SELECT * FROM generated_reports WHERE id = ?').get(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' });
    }
    res.json({ success: true, report });
  } catch (err) {
    console.error('[Report History Item] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/reports/history/:id
 */
router.delete('/history/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM generated_reports WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Report removed from history' });
  } catch (err) {
    console.error('[Report History Delete] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/monthly
 * Full monthly breakdown with highest/lowest sales days and average daily sales
 */
router.get('/monthly', (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const data = calculateMonthlyReport(month);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Monthly Report] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/monthly/export
 * Download monthly consolidated report in Excel or CSV
 */
router.get('/monthly/export', (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const data = calculateMonthlyReport(month);

    const rows = data.dailyList.map(d => ({
      'Date': d.date,
      'Valid Orders': d.validOrders,
      'Units Sold': d.units,
      'Gross Sales (INR)': d.grossSales,
      'Discounts (INR)': d.discounts,
      'Refunds (INR)': d.refunds,
      'Net Sales (INR)': d.netSales,
      'Prepaid Orders': d.paidOrders,
      'COD Orders': d.codOrders,
      'Meta Ads Exp (INR)': d.expenses.metaAds ?? 0,
      'Shipping Exp (INR)': d.expenses.shipping ?? 0,
      'Packaging Exp (INR)': d.expenses.packaging ?? 0,
      'Other Exp (INR)': d.expenses.other ?? 0,
      'Total Expenses (INR)': d.expenses.totalExpenses,
      'Operating Balance (INR)': d.netBalance
    }));

    // Summary row
    rows.push({
      'Date': 'TOTAL MONTHLY CONSOLIDATED',
      'Valid Orders': data.consolidated.totalOrders,
      'Units Sold': data.consolidated.totalUnits,
      'Gross Sales (INR)': data.consolidated.grossSales,
      'Discounts (INR)': data.consolidated.discounts,
      'Refunds (INR)': data.consolidated.refunds,
      'Net Sales (INR)': data.consolidated.netSales,
      'Prepaid Orders': data.consolidated.paidOrders,
      'COD Orders': data.consolidated.codOrders,
      'Meta Ads Exp (INR)': data.consolidated.metaAdsExpenses,
      'Shipping Exp (INR)': data.consolidated.shippingExpenses,
      'Packaging Exp (INR)': data.consolidated.packagingExpenses,
      'Other Exp (INR)': data.consolidated.otherExpenses,
      'Total Expenses (INR)': data.consolidated.totalExpenses,
      'Operating Balance (INR)': data.consolidated.netBalance
    });

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(wb, ws, `Monthly_${month}`);

    let buffer;
    if (format === 'csv') {
      const csvStr = xlsx.utils.sheet_to_csv(ws);
      buffer = Buffer.from(csvStr, 'utf-8');
    } else {
      buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="Monthly_Report_${month}.${format}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Monthly Export] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
