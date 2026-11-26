import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import db from './db/database.js';
import { initSyncScheduler } from './services/syncScheduler.js';

import dashboardRoutes from './routes/dashboard.js';
import ordersRoutes from './routes/orders.js';
import shopifyRoutes from './routes/shopify.js';
import importRoutes from './routes/import.js';
import exportRoutes from './routes/export.js';
import expensesRoutes from './routes/expenses.js';
import productsRoutes from './routes/products.js';
import systemRoutes from './routes/system.js';
import reportsRoutes from './routes/reports.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    app: 'Shopify Sales Manager API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/reports', reportsRoutes);

// Serve static frontend in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) next();
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 Shopify Sales Manager API running on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`===============================================`);

  // Initialize Shopify automatic background sync runner
  try {
    initSyncScheduler();
  } catch (schedErr) {
    console.warn('[Server] Scheduler warning:', schedErr.message);
  }
});
