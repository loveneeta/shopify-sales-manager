import express from 'express';
import db from '../db/database.js';
import {
  getKPISummary,
  getDailySalesTrend,
  getPaymentBreakdown,
  getFulfillmentBreakdown,
  getMonthlyRevenueComparison
} from '../services/analytics.js';

const router = express.Router();

/**
 * GET /api/dashboard/kpis
 */
router.get('/kpis', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    // Default to full active range or last 30 days if not provided
    const startDate = req.query.startDate || '2026-05-01';
    const endDate = req.query.endDate || today;

    const data = getKPISummary(startDate, endDate);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[Dashboard KPIs] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/charts
 */
router.get('/charts', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.startDate || '2026-05-01';
    const endDate = req.query.endDate || today;

    const dailySales = getDailySalesTrend(startDate, endDate);
    const paymentBreakdown = getPaymentBreakdown(startDate, endDate);
    const fulfillmentBreakdown = getFulfillmentBreakdown(startDate, endDate);
    const monthlyComparison = getMonthlyRevenueComparison();

    res.json({
      success: true,
      dailySales,
      paymentBreakdown,
      fulfillmentBreakdown,
      monthlyComparison
    });
  } catch (err) {
    console.error('[Dashboard Charts] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/dashboard/recent-orders
 */
router.get('/recent-orders', (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT
        id, order_number, order_name, order_date, customer_name,
        total_price, financial_status, fulfillment_status, tracking_number, source
      FROM orders
      ORDER BY order_date DESC, id DESC
      LIMIT 10
    `).all();

    res.json({ success: true, orders });
  } catch (err) {
    console.error('[Dashboard Recent Orders] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
