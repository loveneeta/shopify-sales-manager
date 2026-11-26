import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import db, { dbPath } from '../db/database.js';
import { seedExcel } from '../db/seed.js';

const router = express.Router();

const upload = multer({
  dest: path.resolve(path.dirname(dbPath), 'temp_backups'),
  limits: { fileSize: 100 * 1024 * 1024 }
});

/**
 * GET /api/system/stats
 */
router.get('/stats', (req, res) => {
  try {
    const ordersCount = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(total_price), 0.0) as totalSales FROM orders').get();
    const productsCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const customersCount = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    const expensesCount = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0.0) as totalExpenses FROM expenses').get();
    const store = db.prepare('SELECT shop_domain, last_synced_at FROM stores WHERE is_active = 1 LIMIT 1').get();

    res.json({
      success: true,
      stats: {
        totalOrders: ordersCount.count,
        totalSales: ordersCount.totalSales,
        totalProducts: productsCount.count,
        totalCustomers: customersCount.count,
        totalExpenses: expensesCount.totalExpenses,
        connectedStore: store?.shop_domain || null,
        lastSyncedAt: store?.last_synced_at || null,
        databaseSize: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
      }
    });
  } catch (err) {
    console.error('[System Stats] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/system/backup
 * Download SQLite database file
 */
router.get('/backup', (req, res) => {
  try {
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, error: 'Database file not found' });
    }

    const backupName = `shopify_sales_backup_${new Date().toISOString().slice(0, 10)}.sqlite`;
    res.download(dbPath, backupName);
  } catch (err) {
    console.error('[System Backup] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/system/restore
 * Restore SQLite database from uploaded file
 */
router.post('/restore', upload.single('backupFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No backup file uploaded' });
    }

    const uploadedPath = req.file.path;
    // Replace current database file
    fs.copyFileSync(uploadedPath, dbPath);
    fs.unlinkSync(uploadedPath);

    res.json({ success: true, message: 'Database restored successfully! Please reload the page.' });
  } catch (err) {
    console.error('[System Restore] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/system/seed-excel
 * Re-seed from Daily Sales Tracker.xlsx
 */
router.post('/seed-excel', (req, res) => {
  try {
    const success = seedExcel();
    res.json({ success, message: success ? 'Seeded successfully from Daily Sales Tracker.xlsx' : 'Seeding failed' });
  } catch (err) {
    console.error('[System Seed] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
