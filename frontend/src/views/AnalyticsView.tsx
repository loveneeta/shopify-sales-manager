import React, { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { DailyTrendItem, PaymentBreakdownItem, FulfillmentBreakdownItem, MonthlyComparisonItem, ProductAnalyticsItem } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface AnalyticsViewProps {
  dateRange: DateRange;
}

const COLORS = ['#008060', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ dateRange }) => {
  const [loading, setLoading] = useState(true);
  const [dailySales, setDailySales] = useState<DailyTrendItem[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([]);
  const [fulfillmentBreakdown, setFulfillmentBreakdown] = useState<FulfillmentBreakdownItem[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<MonthlyComparisonItem[]>([]);
  const [products, setProducts] = useState<ProductAnalyticsItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getCharts(dateRange.startDate, dateRange.endDate),
      api.getProductAnalytics(dateRange.startDate, dateRange.endDate, '', 10)
    ])
      .then(([charts, prods]) => {
        if (!isMounted) return;
        setDailySales(charts.dailySales);
        setPaymentBreakdown(charts.paymentBreakdown);
        setFulfillmentBreakdown(charts.fulfillmentBreakdown);
        setMonthlyComparison(charts.monthlyComparison);
        setProducts(prods.products);
      })
      .catch(err => {
        console.error('Analytics load error:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (v: number) => `₹${Number(v).toLocaleString('en-IN')}`;

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Generating sales analytics charts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Daily Sales & Orders per day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Daily Revenue Trend</h2>
          <p className="text-[11px] text-slate-500 mb-4">Total gross sales generated each day</p>
          <div className="h-64">
            {dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008060" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#008060" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: any) => [formatCurrency(val), 'Sales']} />
                  <Area type="monotone" dataKey="sales" stroke="#008060" strokeWidth={2} fill="url(#areaSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Orders per day */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Orders Count per Day</h2>
          <p className="text-[11px] text-slate-500 mb-4">Number of daily incoming customer orders</p>
          <div className="h-64">
            {dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales recorded for this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Monthly Comparison & Paid vs COD breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month-over-Month Revenue (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Monthly Revenue Comparison (MoM)</h2>
          <p className="text-[11px] text-slate-500 mb-4">Comparison of Prepaid vs COD revenue across months</p>
          <div className="h-72">
            {monthlyComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: any) => [formatCurrency(val)]} />
                  <Legend />
                  <Bar dataKey="paidSales" name="Prepaid (Paid)" fill="#008060" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="codSales" name="COD" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No monthly sales data available.
              </div>
            )}
          </div>
        </div>

        {/* Paid vs COD Donut */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Payment Method Split</h2>
            <p className="text-[11px] text-slate-500">Cash on Delivery vs Prepaid ratio</p>
          </div>
          <div className="h-56 my-2">
            {paymentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentBreakdown} dataKey="totalAmount" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                    {paymentBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: any) => [formatCurrency(val), 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment data available for this period.
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {paymentBreakdown.map((item, idx) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-semibold text-slate-800">{item.status}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatCurrency(item.totalAmount)}</span>
                  <span className="text-slate-400 text-[10px] ml-1.5">({item.count} orders)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Product-wise Revenue Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Top 10 Products by Revenue</h2>
        <p className="text-[11px] text-slate-500 mb-4">Volume and gross revenue comparison across top catalog items</p>
        <div className="h-72">
          {products.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={products} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis dataKey="productName" type="category" tick={{ fontSize: 11, fill: '#334155' }} width={140} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(val: any) => [formatCurrency(val), 'Revenue']} />
                <Bar dataKey="totalRevenue" fill="#008060" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No product sales data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
