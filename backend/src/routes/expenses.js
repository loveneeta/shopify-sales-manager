import express from 'express';
import db from '../db/database.js';
import { getExpensesAndProfit } from '../services/analytics.js';

const router = express.Router();

/**
 * GET /api/expenses
 * List all expenses with filtering
 */
router.get('/', (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    let sql = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND expense_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND expense_date <= ?';
      params.push(endDate);
    }
    if (category && category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY expense_date DESC, id DESC';
    const expenses = db.prepare(sql).all(...params);

    // Categories summary
    const categories = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0.0) as total
      FROM expenses
      GROUP BY category
    `).all();

    res.json({ success: true, expenses, categories });
  } catch (err) {
    console.error('[Expenses GET] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/expenses/profit-summary
 * Get Gross Sales, Net Sales, Costs, and Net Profit
 */
router.get('/profit-summary', (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const startDate = req.query.startDate || '2026-05-01';
    const endDate = req.query.endDate || today;

    const summary = getExpensesAndProfit(startDate, endDate);
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('[Expenses Profit Summary] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/expenses
 * Add manual expense
 */
router.post('/', (req, res) => {
  try {
    const { category, description, amount, expenseDate, notes } = req.body;

    if (!category || !amount || !expenseDate) {
      return res.status(400).json({ success: false, error: 'Category, amount, and date are required.' });
    }

    const resDb = db.prepare(`
      INSERT INTO expenses (category, description, amount, expense_date, notes, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'manual', datetime('now'), datetime('now'))
    `).run(
      category,
      description || '',
      parseFloat(amount) || 0.0,
      expenseDate,
      notes || ''
    );

    res.json({ success: true, id: resDb.lastInsertRowid, message: 'Expense added successfully.' });
  } catch (err) {
    console.error('[Expense POST] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/expenses/:id
 */
router.put('/:id', (req, res) => {
  try {
    const { category, description, amount, expenseDate, notes } = req.body;
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    db.prepare(`
      UPDATE expenses SET
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        amount = COALESCE(?, amount),
        expense_date = COALESCE(?, expense_date),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      category,
      description,
      amount !== undefined ? parseFloat(amount) : null,
      expenseDate,
      notes,
      existing.id
    );

    res.json({ success: true, message: 'Expense updated successfully.' });
  } catch (err) {
    console.error('[Expense PUT] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM expenses WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    db.prepare('DELETE FROM expenses WHERE id = ?').run(existing.id);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err) {
    console.error('[Expense DELETE] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
