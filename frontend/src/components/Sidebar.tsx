import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  FileSpreadsheet,
  Package,
  DollarSign,
  FileText,
  Settings,
  Store,
  Layers
} from 'lucide-react';

export type ViewType =
  | 'dashboard'
  | 'reports_updates'
  | 'analytics'
  | 'orders'
  | 'import'
  | 'products'
  | 'expenses'
  | 'settings';

interface SidebarProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
  connectedStoreName?: string;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  connectedStoreName,
  isMobileOpen,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports_updates' as ViewType, label: 'Reports & Updates', icon: FileText },
    { id: 'analytics' as ViewType, label: 'Sales Analytics', icon: TrendingUp },
    { id: 'orders' as ViewType, label: 'Orders', icon: ShoppingBag },
    { id: 'import' as ViewType, label: 'Excel / CSV Import', icon: FileSpreadsheet },
    { id: 'products' as ViewType, label: 'Product Performance', icon: Package },
    { id: 'expenses' as ViewType, label: 'Expenses & Profit', icon: DollarSign },
    { id: 'settings' as ViewType, label: 'Shopify Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Brand Header */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-sm">
              <Store className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-slate-900 leading-none">
                Shopify Sales
              </div>
              <div className="text-[11px] font-medium text-emerald-700 tracking-wide mt-0.5">
                MANAGER PRO
              </div>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Store Indicator Badge */}
        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/70">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Store Connection</div>
          <div className="flex items-center space-x-1.5 mt-1">
            <span className={`w-2 h-2 rounded-full ${connectedStoreName ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className="text-xs font-semibold text-slate-800 truncate">
              {connectedStoreName || 'No Store Connected'}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mr-3 transition-colors ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-700" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>v1.0.0 Stable</span>
          </div>
          <span className="text-[10px] bg-slate-200/60 px-1.5 py-0.5 rounded text-slate-600 font-mono">SQLite WAL</span>
        </div>
      </aside>
    </>
  );
};
