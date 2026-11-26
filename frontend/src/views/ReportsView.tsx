import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Package,
  RotateCcw,
  Truck,
  CreditCard
} from 'lucide-react';
import { DateRange } from '../components/DateRangePicker';

interface ReportsViewProps {
  dateRange: DateRange;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ dateRange }) => {
  const reports = [
    {
      id: 'daily-sales',
      title: 'Daily Sales Report',
      description: 'Day-by-day breakdown of order volume, gross revenue, prepaid vs COD sales, and average order value.',
      icon: Calendar,
      color: 'bg-emerald-50 text-emerald-800'
    },
    {
      id: 'monthly-sales',
      title: 'Monthly Sales Report',
      description: 'Month-over-month performance analysis tracking long-term trends and growth across historical months.',
      icon: DollarSign,
      color: 'bg-blue-50 text-blue-800'
    },
    {
      id: 'product-performance',
      title: 'Product Performance Report',
      description: 'Comprehensive item ranking by revenue contribution, total units sold, order frequency, and ASP.',
      icon: Package,
      color: 'bg-indigo-50 text-indigo-800'
    },
    {
      id: 'payment-collection',
      title: 'Payment Collection Report',
      description: 'Itemized log of prepaid and COD collections with courier tracking and customer identifiers.',
      icon: CreditCard,
      color: 'bg-amber-50 text-amber-800'
    },
    {
      id: 'cod-reconciliation',
      title: 'COD Reconciliation Report',
      description: 'Dedicated Cash on Delivery tracking report for reconciliation with Delhivery logistics remittances.',
      icon: Truck,
      color: 'bg-purple-50 text-purple-800'
    },
    {
      id: 'refunds',
      title: 'Refund & RTO Report',
      description: 'Audit log of returned-to-origin orders, cancellations, lost shipments, and refunded amounts.',
      icon: RotateCcw,
      color: 'bg-rose-50 text-rose-800'
    },
    {
      id: 'profitability',
      title: 'Profitability Report (P&L)',
      description: 'Executive financial summary displaying Gross Sales, Net Revenue, COGS, Ad Spend, Logistics, and Net Profit.',
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-900'
    }
  ];

  const handleDownloadReport = (reportId: string, format: 'xlsx' | 'csv') => {
    const url = `/api/export/report/${reportId}?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=${format}`;
    window.open(url, '_blank');
  };

  const handleDownloadOrders = (format: 'xlsx' | 'csv') => {
    const url = `/api/export/orders?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Export All Orders */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Full Raw Orders Export</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Export all order records matching the active date range ({dateRange.startDate} to {dateRange.endDate})
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleDownloadOrders('xlsx')}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export to Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => handleDownloadOrders('csv')}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* 7 Standard Reports Grid */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          7 Standard Financial & Operations Reports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map(rep => {
            const Icon = rep.icon;
            return (
              <div
                key={rep.id}
                className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className={`w-9 h-9 rounded-lg ${rep.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">{rep.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    {rep.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadReport(rep.id, 'xlsx')}
                    className="flex-1 py-1.5 px-2 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold text-center transition"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleDownloadReport(rep.id, 'csv')}
                    className="flex-1 py-1.5 px-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold text-center transition"
                  >
                    CSV (.csv)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
