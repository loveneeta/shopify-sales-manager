import express from 'express';
import db from '../db/database.js';
import { getProductAnalytics } from '../services/analytics.js';

const router = express.Router();

/**
 * GET /api/products/analytics
 */
router.get('/analytics', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.startDate || '2026-05-01';
    const endDate = req.query.endDate || today;
    const search = req.query.search || '';
    const limit = parseInt(req.query.limit) || 100;

    const products = getProductAnalytics(startDate, endDate, search, limit);
    res.json({ success: true, products });
  } catch (err) {
    console.error('[Products Analytics] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products
 * List all catalog products
 */
router.get('/', (req, res) => {
  try {
    const search = req.query.search || '';
    let sql = 'SELECT * FROM products';
    const params = [];
    if (search) {
      sql += ' WHERE title LIKE ? OR sku LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY title ASC LIMIT 200';
    const products = db.prepare(sql).all(...params);
    res.json({ success: true, products });
  } catch (err) {
    console.error('[Products GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/products/:id/cost
 * Update product cost price for profit calculation
 */
router.put('/:id/cost', (req, res) => {
  try {
    const { costPrice, sellingPrice } = req.body;
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    db.prepare(`
      UPDATE products SET
        cost_price = COALESCE(?, cost_price),
        selling_price = COALESCE(?, selling_price),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      costPrice !== undefined ? parseFloat(costPrice) : null,
      sellingPrice !== undefined ? parseFloat(sellingPrice) : null,
      product.id
    );

    res.json({ success: true, message: 'Product cost updated successfully' });
  } catch (err) {
    console.error('[Product Cost Update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
