import React, { useState, useEffect } from 'react';
import { Sidebar, ViewType } from './components/Sidebar';
import { Header } from './components/Header';
import { DateRange } from './components/DateRangePicker';
import { DashboardView } from './views/DashboardView';
import { AnalyticsView } from './views/AnalyticsView';
import { OrdersView } from './views/OrdersView';
import { ImportView } from './views/ImportView';
import { ProductsView } from './views/ProductsView';
import { ExpensesView } from './views/ExpensesView';
import { ReportsUpdatesView } from './views/ReportsUpdatesView';
import { SettingsView } from './views/SettingsView';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | undefined>(undefined);
  const [isSyncing, setIsSyncing] = useState(false);

  // Default date range: All Time (covers the historical dataset: 2026-05-01 to today)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: '2026-05-01',
    endDate: new Date().toISOString().slice(0, 10),
    label: 'All Time (Full Tracker)'
  });

  useEffect(() => {
    // Fetch store configuration status
    api.getShopifyConfig().then(res => {
      if (res.config?.configured && res.config?.storeName) {
        setStoreName(res.config.storeName);
      } else if (res.config?.configured && res.config?.shopDomain) {
        setStoreName(res.config.shopDomain);
      } else {
        setStoreName('');
      }
      if (res.config?.lastSyncedAt) {
        setLastSyncedAt(res.config.lastSyncedAt);
      }
    }).catch(err => console.warn('Config fetch warning:', err));
  }, []);

  const handleSyncNow = () => {
    setIsSyncing(true);
    api.syncShopifyNow(false)
      .then(res => {
        setLastSyncedAt(new Date().toISOString());
        alert(`Sync finished successfully! Fetched ${res.ordersFetched} orders.`);
      })
      .catch(err => {
        alert(`Sync notification: ${err.message}`);
      })
      .finally(() => setIsSyncing(false));
  };

  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return { title: 'Executive Sales Dashboard', subtitle: 'Real-time sales performance, KPIs, and revenue analytics' };
      case 'reports_updates':
        return { title: 'Reports & Updates (WhatsApp Generator)', subtitle: 'Generate 2-day consolidated sales & expense WhatsApp messages in less than 30 seconds' };
      case 'analytics':
        return { title: 'Sales Analytics & Trends', subtitle: 'Deep dive into daily order velocity, payment modes, and fulfillment' };
      case 'orders':
        return { title: 'Order Management', subtitle: 'Search, filter, edit, and track all incoming Shopify and manual orders' };
      case 'import':
        return { title: 'Excel & CSV Data Import', subtitle: 'Seamlessly migrate historical Excel workbooks with automated column mapping' };
      case 'products':
        return { title: 'Product Performance & COGS', subtitle: 'Evaluate sales contribution, ASP, and manage unit cost pricing' };
      case 'expenses':
        return { title: 'Expenses & Profit Estimation', subtitle: 'Track Meta Ads spend, courier logistics fees, and calculate net profit' };
      case 'settings':
        return { title: 'Shopify Admin API & Settings', subtitle: 'Configure store credentials, auto-sync schedules, and database backups' };
      default:
        return { title: 'Shopify Sales Manager', subtitle: '' };
    }
  };

  const headerMeta = getHeaderTitle();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        connectedStoreName={storeName}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Header */}
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          lastSyncedAt={lastSyncedAt}
        />

        {/* View Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && (
            <DashboardView
              dateRange={dateRange}
              onNavigateToOrders={() => setCurrentView('orders')}
              onNavigateToProducts={() => setCurrentView('products')}
            />
          )}

          {currentView === 'reports_updates' && (
            <ReportsUpdatesView />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView dateRange={dateRange} />
          )}

          {currentView === 'orders' && (
            <OrdersView dateRange={dateRange} />
          )}

          {currentView === 'import' && (
            <ImportView />
          )}

          {currentView === 'products' && (
            <ProductsView dateRange={dateRange} />
          )}

          {currentView === 'expenses' && (
            <ExpensesView dateRange={dateRange} />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
