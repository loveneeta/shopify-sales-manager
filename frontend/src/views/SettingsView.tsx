import React, { useState, useEffect } from 'react';
import {
  Store,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  Upload,
  Clock,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { ShopifyConfig, SyncLog } from '../types';

export const SettingsView: React.FC = () => {
  const [config, setConfig] = useState<ShopifyConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [shopDomain, setShopDomain] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [autoSyncInterval, setAutoSyncInterval] = useState(15);

  // Actions
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; shop?: any } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  // Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    setLoading(true);
    Promise.all([
      api.getShopifyConfig(),
      api.getSyncLogs()
    ])
      .then(([cfgRes, logsRes]) => {
        setConfig(cfgRes.config);
        setShopDomain(cfgRes.config.shopDomain || '');
        setAutoSyncInterval(cfgRes.config.autoSyncInterval || 15);
        setSyncLogs(logsRes.logs);
      })
      .catch(err => console.error('Settings load error:', err))
      .finally(() => setLoading(false));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopDomain) {
      alert('Store domain is required.');
      return;
    }

    api.saveShopifyConfig({
      shopDomain,
      accessToken: accessToken || undefined,
      autoSyncInterval
    })
      .then(res => {
        setNotification({ type: 'success', message: res.message });
        setAccessToken('');
        loadSettings();
      })
      .catch(err => setNotification({ type: 'error', message: err.message }));
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);
    api.testShopifyConnection({
      shopDomain: shopDomain || undefined,
      accessToken: accessToken || undefined
    })
      .then(res => {
        if (res.success) {
          setTestResult({
            success: true,
            shop: res.shop,
            message: `Connected successfully to store: "${res.shop.name}" (${res.shop.domain})`
          });
        } else {
          setTestResult({
            success: false,
            message: res.error || 'Connection verification failed.'
          });
        }
      })
      .catch(err => {
        setTestResult({
          success: false,
          message: err.message
        });
      })
      .finally(() => setIsTesting(false));
  };

  const handleSyncNow = (fullSync = false) => {
    setIsSyncing(true);
    api.syncShopifyNow(fullSync)
      .then(res => {
        setNotification({
          type: 'success',
          message: `Sync finished: ${res.ordersFetched} orders fetched, ${res.ordersCreated} created, ${res.ordersUpdated} updated.`
        });
        loadSettings();
      })
      .catch(err => setNotification({ type: 'error', message: err.message }))
      .finally(() => setIsSyncing(false));
  };

  const handleDownloadBackup = () => {
    window.open('/api/system/backup', '_blank');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (window.confirm(`Are you sure you want to restore database from ${file.name}? Current data will be replaced.`)) {
        const formData = new FormData();
        formData.append('backupFile', file);
        fetch('/api/system/restore', {
          method: 'POST',
          body: formData
        })
          .then(res => res.json())
          .then(res => {
            alert(res.message);
            window.location.reload();
          })
          .catch(err => alert(err.message));
      }
    }
  };

  const handleReseed = () => {
    if (window.confirm('Re-seed initial records from Daily Sales Tracker.xlsx?')) {
      api.reseedExcel()
        .then(res => {
          alert(res.message);
          window.location.reload();
        })
        .catch(err => alert(err.message));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Toast */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-sm font-bold ml-3">✕</button>
        </div>
      )}

      {/* Shopify API Configuration */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center space-x-2 mb-1">
          <Store className="w-5 h-5 text-emerald-800" />
          <h2 className="text-sm font-bold text-slate-900">Shopify Admin API Integration</h2>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Configure official Shopify GraphQL Admin API access. Credentials are kept strictly on the backend and never exposed in browser storage.
        </p>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Store Domain *
              </label>
              <input
                type="text"
                required
                placeholder="store-name.myshopify.com"
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-emerald-600 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Your myshopify.com domain address</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin API Access Token *
              </label>
              <input
                type="password"
                placeholder={config?.hasToken ? `Existing (${config.maskedToken})` : 'Admin API Access Token'}
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-emerald-600 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Required Scopes: <code>read_orders</code>, <code>read_products</code>, <code>read_customers</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Automatic Background Sync Interval
              </label>
              <select
                value={autoSyncInterval}
                onChange={e => setAutoSyncInterval(parseInt(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-emerald-600 bg-white"
              >
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes (Default)</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
              >
                {isTesting ? 'Verifying...' : 'Test Connection'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition"
              >
                Save Settings
              </button>
            </div>
          </div>

          {/* Test Result Indicator */}
          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}
        </form>

        {/* Manual Sync Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-900">Manual Synchronization</div>
            <div className="text-[11px] text-slate-500">
              Trigger incremental or full catalog sync with Shopify Admin API.
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSyncNow(false)}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Incremental Sync'}</span>
            </button>
            <button
              onClick={() => handleSyncNow(true)}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-50"
            >
              Full Order Sync
            </button>
          </div>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Sync Activity</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Fetched</th>
                <th className="py-2.5 px-4">Created</th>
                <th className="py-2.5 px-4">Updated</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No sync activity recorded yet.
                  </td>
                </tr>
              ) : (
                syncLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'success'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{l.orders_fetched}</td>
                    <td className="py-2.5 px-4 text-emerald-700 font-medium">{l.orders_created}</td>
                    <td className="py-2.5 px-4 text-blue-700 font-medium">{l.orders_updated}</td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">{l.duration_ms}ms</td>
                    <td className="py-2.5 px-4 text-slate-500">{l.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Database Backup & Restore */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center space-x-2 mb-1">
          <Database className="w-5 h-5 text-slate-700" />
          <h3 className="text-sm font-bold text-slate-900">Database Backup & Disaster Recovery</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          All order records, customer details, products, and expenses are persistently stored in local SQLite database.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 mr-2" />
            <span>Download SQLite Backup</span>
          </button>

          <label className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer">
            <Upload className="w-3.5 h-3.5 mr-2" />
            <span>Restore Backup (.sqlite)</span>
            <input type="file" accept=".sqlite,.db" onChange={handleRestoreBackup} className="sr-only" />
          </label>

          <button
            onClick={handleReseed}
            className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2 text-amber-700" />
            <span>Re-seed Daily Sales Tracker.xlsx</span>
          </button>
        </div>
      </div>
    </div>
  );
};
