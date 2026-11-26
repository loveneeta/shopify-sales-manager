import express from 'express';
import {
  exportOrders,
  exportDailySalesReport,
  exportMonthlySalesReport,
  exportProductReport,
  exportPaymentReport,
  exportCODReport,
  exportRefundReport,
  exportProfitabilityReport
} from '../services/excelExport.js';

const router = express.Router();

/**
 * GET /api/export/orders
 */
router.get('/orders', (req, res) => {
  try {
    const { startDate, endDate, financialStatus, fulfillmentStatus, format = 'xlsx' } = req.query;
    const buffer = exportOrders({ startDate, endDate, financialStatus, fulfillmentStatus, format });

    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `shopify_orders_${new Date().toISOString().slice(0, 10)}.${format}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Export Orders] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/export/report/:reportType
 */
router.get('/report/:reportType', (req, res) => {
  try {
    const { reportType } = req.params;
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.startDate || '2026-05-01';
    const endDate = req.query.endDate || today;

    let buffer;
    let baseFilename = reportType;

    switch (reportType) {
      case 'daily-sales':
        buffer = exportDailySalesReport(startDate, endDate, format);
        baseFilename = `daily_sales_report_${startDate}_to_${endDate}`;
        break;
      case 'monthly-sales':
        buffer = exportMonthlySalesReport(format);
        baseFilename = `monthly_sales_report_${today}`;
        break;
      case 'product-performance':
        buffer = exportProductReport(startDate, endDate, format);
        baseFilename = `product_performance_${startDate}_to_${endDate}`;
        break;
      case 'payment-collection':
        buffer = exportPaymentReport(startDate, endDate, format);
        baseFilename = `payment_collection_${startDate}_to_${endDate}`;
        break;
      case 'cod-reconciliation':
        buffer = exportCODReport(startDate, endDate, format);
        baseFilename = `cod_reconciliation_${startDate}_to_${endDate}`;
        break;
      case 'refunds':
        buffer = exportRefundReport(startDate, endDate, format);
        baseFilename = `refund_return_report_${startDate}_to_${endDate}`;
        break;
      case 'profitability':
        buffer = exportProfitabilityReport(startDate, endDate, format);
        baseFilename = `profitability_report_${startDate}_to_${endDate}`;
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown report type: ${reportType}` });
    }

    const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.${format}"`);
    res.send(buffer);
  } catch (err) {
    console.error('[Export Report] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
