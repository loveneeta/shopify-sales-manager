import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'shopify_sales.sqlite');
console.log(`[Database] Initializing SQLite at: ${dbPath}`);

const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance & reliability
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('[Database] PRAGMA config warning:', e.message);
}

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_domain TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  name TEXT,
  currency TEXT DEFAULT 'INR',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  is_active INTEGER DEFAULT 1,
  last_synced_at TEXT,
  auto_sync_interval INTEGER DEFAULT 15,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_customer_id TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  country TEXT DEFAULT 'India',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_product_id TEXT UNIQUE,
  title TEXT NOT NULL,
  sku TEXT,
  cost_price REAL DEFAULT 0.0,
  selling_price REAL DEFAULT 0.0,
  category TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_order_id TEXT UNIQUE,
  order_number TEXT NOT NULL,
  order_name TEXT,
  order_date TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  city TEXT,
  province TEXT,
  zip TEXT,
  total_price REAL NOT NULL DEFAULT 0.0,
  subtotal_price REAL DEFAULT 0.0,
  total_discounts REAL DEFAULT 0.0,
  total_tax REAL DEFAULT 0.0,
  currency TEXT DEFAULT 'INR',
  financial_status TEXT DEFAULT 'PAID',
  fulfillment_status TEXT DEFAULT 'Delivered',
  payment_gateway_names TEXT,
  tracking_number TEXT,
  tracking_company TEXT,
  cancel_reason TEXT,
  cancelled_at TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  is_manual INTEGER DEFAULT 0,
  manual_override INTEGER DEFAULT 0,
  raw_data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopify_line_item_id TEXT,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  variant_title TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0.0,
  total_discount REAL DEFAULT 0.0,
  cost_price REAL DEFAULT 0.0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopify_refund_id TEXT UNIQUE,
  amount REAL NOT NULL DEFAULT 0.0,
  note TEXT,
  processed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER REFERENCES stores(id),
  status TEXT NOT NULL,
  orders_fetched INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_updated INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER,
  sync_type TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS import_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_rows INTEGER DEFAULT 0,
  imported_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS application_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  total_sales REAL DEFAULT 0.0,
  total_expenses REAL DEFAULT 0.0,
  net_balance REAL DEFAULT 0.0,
  message_content TEXT NOT NULL,
  customization_settings TEXT,
  generated_at TEXT DEFAULT (datetime('now'))
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_financial_status ON orders(financial_status);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_status ON orders(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_name ON order_items(product_name);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_generated_reports_date ON generated_reports(start_date, end_date);
`);

console.log('[Database] Schema initialized with all 10 tables and indexes.');

export default db;
export { dbPath };
