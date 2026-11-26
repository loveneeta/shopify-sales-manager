# Shopify Sales Manager Pro

A lightweight, high-performance, production-ready web application designed to track, monitor, and analyze daily Shopify sales performance. It provides seamless Shopify GraphQL Admin API synchronization, manual order entry, historical Excel/CSV migration, and financial profit estimation.

---

## 🚀 Key Features

1. **Executive Sales Dashboard**:
   - 8 Core KPI Cards: Total Sales, Total Orders, Units Sold, Average Order Value (AOV), Prepaid (Paid) Orders, COD Orders, Pending Payments, and Refunded/RTO Orders.
   - Comparative growth analysis against previous equivalent periods (% growth/decline).
   - Date range selector with instant presets: *Today*, *Yesterday*, *Last 7 Days*, *Last 30 Days*, *This Month*, *Previous Month*, *All Time*, and *Custom Range*.

2. **Smart Daily & 2-Day WhatsApp Report Generator (Reports & Updates)**:
   - **Alternate-Day (2-Day Consolidated) Reports**: Selected by default to generate consolidated sales and expense updates for company seniors/bosses in less than 30 seconds.
   - **Professional Formats**: Formal message template (`Good Evening Sir... Regards`) and bulleted Concise template.
   - **Dynamic Daily Breakdown**: Shows orders, sales, Meta Ads, shipping logistics, and operating balance per individual day, followed by a reconciled **CONSOLIDATED SUMMARY (2 DAYS)**.
   - **One-Click Workflow**: **Copy WhatsApp Message** and direct **Send on WhatsApp** buttons.
   - **Customizable Fields**: Toggle optional metrics (Discounts, Refunds, Paid vs COD, Packaging, etc.) and save preferences.
   - **Monthly Consolidated Analytics**: Full month calendar breakdown with Highest Sales Day, Lowest Sales Day, Average Daily Sales, and Excel export.
   - **Report History**: Archives generated reports for instant re-copying.

3. **Official Shopify GraphQL Admin API Integration**:
   - Direct GraphQL Admin API connection (`2024-10` stable version).
   - Cursor-based pagination and incremental synchronization (`updated_at` filter).
   - Duplicate order prevention and protection of Shopify-synced data against accidental manual overwrites.
   - Background auto-sync scheduler running every 15 minutes (configurable).
   - Prominent **Sync Now** button with live status feedback.
   - Secure token storage (tokens are kept strictly in backend SQLite/environment variables and masked in the UI).

3. **Complete Historical Order Management**:
   - Fully loaded with historical records from `Daily Sales Tracker.xlsx` (310 orders, ₹665,838.15 total sales).
   - Search across Order #, customer name, phone, email, product title, and courier tracking numbers.
   - Multi-parameter filtering by Payment Status (Paid, COD, Pending, Refunded), Fulfillment Status (Delivered, In Transit, Pending, RTO, Cancelled), and Source.
   - Interactive slide-over drawer showing full order details, customer addresses, line items breakdown, and courier tracking.
   - Manual order creation, editing, and deletion with safety guards.

4. **Dedicated Excel / CSV Import Engine**:
   - Supports `.xlsx`, `.xls`, and `.csv` files.
   - Automatic column recognition for `S.NO.`, `DATE`, `#ORDER`, `CUSTOMER NAME`, `ADDRESS`, `CONTACT`, `PRODUCT`, `Qty`, `PRICE`, `COD/ PAID`, `TRACKING`, and `STATUS`.
   - Multi-line contact parsing (extracts phone and email automatically).
   - Live pre-import data preview table and validation warnings.
   - Flexible duplicate handling: *Skip duplicates*, *Update existing*, or *Create new*.
   - Historical import activity audit logs.

5. **Product Performance & COGS**:
   - Product analytics table showing total quantity sold, gross revenue, order frequency, ASP (Average Selling Price), and revenue contribution percentage.
   - Inline unit cost editing (COGS) to calculate accurate product margins.

6. **Expenses & Net Profit Calculation**:
   - Track Meta Ads, Delhivery Courier Logistics, Packaging, and miscellaneous operational expenses.
   - Automatic financial equation:
     $$\text{Gross Sales} - \text{Discounts} - \text{Refunds} - \text{COGS} - \text{Shipping} - \text{Advertising} = \text{Estimated Net Profit}$$
   - Incomplete cost warning indicator when items in the catalog lack unit cost prices.

7. **7 Standard Financial Reports & Exports**:
   - One-click Excel (.xlsx) and CSV downloads for:
     1. Daily Sales Report
     2. Monthly Sales Report
     3. Product Performance Report
     4. Payment Collection Report (Prepaid vs COD)
     5. COD Reconciliation Report (with courier waybills)
     6. Refund & RTO Audit Report
     7. Profitability Statement (P&L)
   - Full raw orders data export with custom filtering.

8. **Database Backup & Disaster Recovery**:
   - One-click `.sqlite` database file backup download.
   - Instant restore from `.sqlite` backup files.
   - Single-click re-seed functionality from `Daily Sales Tracker.xlsx`.

---

## 🛠 Technology Stack

- **Frontend**: React 18 / 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts.
- **Backend**: Node.js v20+ / v24, Express, `node:sqlite` (native zero-dependency SQLite engine).
- **Database**: SQLite with WAL mode, foreign keys, and optimized indexing.
- **Shopify API**: Shopify GraphQL Admin API (`2024-10`).
- **Spreadsheet Processing**: SheetJS (`xlsx`) and `multer`.

---

## 📦 Installation & Quick Start

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher (v24.x recommended).
- **npm**: v9.0.0 or higher.

### 2. Quick Setup
Clone or navigate into the project directory:
```bash
cd "e:\LOVENEE _D_Drive\Shopify"
```

Install backend and frontend dependencies:
```bash
npm run install:all
```

Build the frontend production assets:
```bash
npm run build
```

Start the application server:
```bash
npm start
```

Open your browser and navigate to:
```
http://localhost:5000
```

> **Development Mode**: If you wish to run the Vite dev server with Hot Module Replacement (HMR) alongside the backend, run:
> - Backend: `cd backend && npm run dev` (Runs on port `5000`)
> - Frontend: `cd frontend && npm run dev` (Runs on port `3000` with auto API proxying to `5000`)

---

## 🔑 Shopify Admin API Setup Guide

To connect your live Shopify store:

### 1. Create a Custom App in Shopify Admin
1. Log into your Shopify Store Admin (`https://admin.shopify.com/store/your-store-name`).
2. Navigate to **Settings** > **Apps and sales channels** > **Develop apps**.
3. Click **Create an app** and name it `Shopify Sales Manager`.
4. Click **Configure Admin API scopes**.

### 2. Configure Scopes
Select the following minimum required scopes:
- `read_orders` (To fetch orders, financial statuses, fulfillments, and refunds)
- `read_products` (To match products and variants)
- `read_customers` (To import customer shipping details)

### 3. Install the App & Reveal Access Token
1. Click **Install app** in the top right.
2. Under **Admin API access token**, click **Reveal token once** and copy the token (starts with `shpat_...`).

### 4. Connect in the Application
1. Open the application at `http://localhost:5000`.
2. Go to the **Shopify Settings** tab in the sidebar.
3. Enter your **Store Domain** (e.g. `your-store.myshopify.com`) and paste your **Admin API Access Token**.
4. Click **Test Connection** to verify store connectivity.
5. Click **Save Settings**.
6. Click **Incremental Sync** or **Full Order Sync** to synchronize orders into your SQLite database.

---

## 📊 Data Reconciliation with `Daily Sales Tracker.xlsx`

The application was validated directly against `Daily Sales Tracker.xlsx`:

| Metric | Daily Sales Tracker.xlsx | Application Reconciled Figure | Status |
| :--- | :--- | :--- | :--- |
| **Total Order Rows** | 310 orders | **310 orders** | Exact Match ✅ |
| **Total Units Sold** | 492 items | **492 items** | Exact Match ✅ |
| **Prepaid (PAID) Orders** | 188 orders | **188 orders (₹428,124.25)** | Exact Match ✅ |
| **Cash on Delivery (COD)** | 122 orders | **122 orders (₹237,713.90)** | Exact Match ✅ |
| **Gross Sales Revenue** | ₹665,838.15 | **₹665,838.15** | Exact Match ✅ |
| **Meta Ads Historical Spend** | ₹271,176.00 | **₹271,176.00** | Exact Match ✅ |
| **Delhivery Logistics Spend** | ₹149,348.00 | **₹149,348.00** | Exact Match ✅ |
| **Estimated Net Profit** | ₹245,314.15 | **₹245,314.15** | Exact Match ✅ |

*(Note on Sales Total: The original Excel sheet included 4 rows where currency values were formatted as text strings with rupee symbols `₹`, causing Excel's raw `=SUM()` formula to display ₹659,052.15. The application cleans and parses these currency cells accurately, reconciling the true total of ₹665,838.15).*

---

## 📁 Project Architecture

```
Shopify/
├── backend/
│   ├── data/
│   │   └── shopify_sales.sqlite       # Persistent SQLite database (WAL mode)
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js            # SQLite schema, tables & indexes
│   │   │   └── seed.js                # Initial seed from Daily Sales Tracker.xlsx
│   │   ├── services/
│   │   │   ├── shopify.js             # GraphQL Admin API client & sync runner
│   │   │   ├── syncScheduler.js       # Background cron auto-sync (15m)
│   │   │   ├── excelImport.js         # Intelligent parser & column mapping engine
│   │   │   ├── excelExport.js         # Report generator (.xlsx & .csv)
│   │   │   └── analytics.js           # KPIs, P&L, MoM & trend calculations
│   │   ├── routes/
│   │   │   ├── dashboard.js           # KPIs & overview charts API
│   │   │   ├── orders.js              # Order CRUD, search, filter, paginate
│   │   │   ├── shopify.js             # Shopify credentials & live test API
│   │   │   ├── import.js              # Excel upload preview & execute API
│   │   │   ├── export.js              # 7 reports & orders export download
│   │   │   ├── expenses.js            # P&L and expense management API
│   │   │   ├── products.js            # Product performance & COGS update API
│   │   │   └── system.js              # Backup download, restore & stats API
│   │   └── server.js                  # Express application server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx            # Navigation sidebar with store indicator
│   │   │   ├── Header.tsx             # Sticky header with Sync Now & date picker
│   │   │   └── DateRangePicker.tsx    # Preset & custom date filter selector
│   │   ├── views/
│   │   │   ├── DashboardView.tsx      # 8 KPI cards & overview charts
│   │   │   ├── AnalyticsView.tsx      # Deep dive revenue & order trends
│   │   │   ├── OrdersView.tsx         # Searchable, filterable order table & detail drawer
│   │   │   ├── ImportView.tsx         # Drag & drop Excel/CSV import with mapping
│   │   │   ├── ProductsView.tsx       # Product rankings & unit cost management
│   │   │   ├── ExpensesView.tsx       # Expense tracker & Net Profit breakdown
│   │   │   ├── ReportsView.tsx        # Downloadable financial reports
│   │   │   └── SettingsView.tsx       # Shopify connection & database backups
│   │   ├── services/
│   │   │   └── api.ts                 # Type-safe API client
│   │   ├── types.ts                   # Domain models & TypeScript interfaces
│   │   ├── App.tsx                    # Main layout & view routing
│   │   └── index.css                  # Tailwind CSS v4 styling & theme
│   └── package.json
├── Daily Sales Tracker.xlsx           # Source workbook
└── package.json                       # Root script launcher
```

---

## 🔒 Security & Data Integrity

- **Credentials Protection**: The Shopify Admin API Access Token is stored safely in SQLite and never transmitted to or cached in browser local storage.
- **Safe Editing**: Orders originating from Shopify cannot be overwritten by manual edits or accidental imports without an explicit override action.
- **Disaster Recovery**: Database backups can be downloaded in one click from the Settings tab or restored at any time.
- **SQL Sanitization**: All queries use parameterized prepared statements preventing SQL injection.

---

## 📄 License
Internal proprietary software built for Loveneet Shopify store management.
