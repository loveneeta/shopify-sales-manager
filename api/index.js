import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import dashboardRoutes from '../backend/src/routes/dashboard.js';
import ordersRoutes from '../backend/src/routes/orders.js';
import shopifyRoutes from '../backend/src/routes/shopify.js';
import importRoutes from '../backend/src/routes/import.js';
import exportRoutes from '../backend/src/routes/export.js';
import expensesRoutes from '../backend/src/routes/expenses.js';
import productsRoutes from '../backend/src/routes/products.js';
import systemRoutes from '../backend/src/routes/system.js';
import reportsRoutes from '../backend/src/routes/reports.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverless: true, timestamp: new Date().toISOString() });
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/reports', reportsRoutes);

export default app;
