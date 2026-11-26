import React from 'react';
import { Menu, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { DateRangePicker, DateRange } from './DateRangePicker';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
  isSyncing: boolean;
  onSyncNow: () => void;
  lastSyncedAt?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  dateRange,
  onDateRangeChange,
  isSyncing,
  onSyncNow,
  lastSyncedAt
}) => {
  const formatLastSync = (iso?: string) => {
    if (!iso) return 'Not synced yet';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + d.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Sync Button */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-500 mr-2">
          <span className="text-[11px]">Synced: <strong className="text-slate-700">{formatLastSync(lastSyncedAt)}</strong></span>
        </div>

        <button
          onClick={onSyncNow}
          disabled={isSyncing}
          className="inline-flex items-center px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white shadow-2xs transition disabled:opacity-60 cursor-pointer"
          title="Trigger on-demand Shopify Admin API sync"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        {/* Global Date Filter */}
        <DateRangePicker currentRange={dateRange} onChange={onDateRangeChange} />
      </div>
    </header>
  );
};
