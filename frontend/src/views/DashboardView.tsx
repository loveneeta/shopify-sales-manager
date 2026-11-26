import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  DollarSign,
  Package,
  CreditCard,
  Truck,
  Clock,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { KPISummary, DailyTrendItem, PaymentBreakdownItem, FulfillmentBreakdownItem, MonthlyComparisonItem, Order, ProductAnalyticsItem } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface DashboardViewProps {
  dateRange: DateRange;
  onNavigateToOrders: () => void;
  onNavigateToProducts: () => void;
}

const COLORS = ['#008060', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  dateRange,
  onNavigateToOrders,
  onNavigateToProducts
}) => {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPISummary | null>(null);
  const [chartData, setChartData] = useState<{
    dailySales: DailyTrendItem[];
    paymentBreakdown: PaymentBreakdownItem[];
    fulfillmentBreakdown: FulfillmentBreakdownItem[];
    monthlyComparison: MonthlyComparisonItem[];
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topProducts, setTopProducts] = useState<ProductAnalyticsItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      api.getKPIs(dateRange.startDate, dateRange.endDate),
      api.getCharts(dateRange.startDate, dateRange.endDate),
      api.getRecentOrders(),
      api.getProductAnalytics(dateRange.startDate, dateRange.endDate, '', 5)
    ])
      .then(([kpis, charts, recent, prods]) => {
        if (!isMounted) return;
        setKpiData(kpis);
        setChartData(charts);
        setRecentOrders(recent.orders);
        setTopProducts(prods.products);
      })
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const renderGrowth = (growth?: number, currentVal?: number, prevVal?: number) => {
    if (growth === undefined || isNaN(growth)) return null;
    if ((currentVal === 0 || currentVal === undefined) && (prevVal === 0 || prevVal === undefined)) {
      return (
        <span className="text-[10px] text-slate-400 font-normal">No prior data</span>
      );
    }
    const isPositive = growth >= 0;
    return (
      <div
        className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded ${
          isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
        }`}
      >
        {isPositive ? (
          <TrendingUp className="w-3 h-3 mr-1 text-emerald-600" />
        ) : (
          <TrendingDown className="w-3 h-3 mr-1 text-rose-600" />
        )}
        <span>{Math.abs(growth).toFixed(1)}%</span>
        <span className="text-[10px] text-slate-400 ml-1 font-normal">vs prev period</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">Reconciling order metrics & analytics...</p>
      </div>
    );
  }

  const k = kpiData?.kpis;

  return (
    <div className="space-y-6">
      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(k?.totalSales.value || 0)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {renderGrowth(k?.totalSales.growth, k?.totalSales.value, k?.totalSales.previous)}
            <span className="text-[10px] text-slate-400 font-mono">
              Prev: {formatCurrency(k?.totalSales.previous || 0)}
            </span>
          </div>
        </div>

        {/* 2. Total Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {(k?.totalOrders.value || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {renderGrowth(k?.totalOrders.growth, k?.totalOrders.value, k?.totalOrders.previous)}
            <span className="text-[10px] text-slate-400 font-mono">
              Prev: {k?.totalOrders.previous || 0}
            </span>
          </div>
        </div>

        {/* 3. Total Units Sold */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Units Sold</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {(k?.totalUnits.value || 0).toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {renderGrowth(k?.totalUnits.growth, k?.totalUnits.value, k?.totalUnits.previous)}
            <span className="text-[10px] text-slate-400 font-mono">
              Prev: {k?.totalUnits.previous || 0}
            </span>
          </div>
        </div>

        {/* 4. Average Order Value (AOV) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Order Value</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(k?.aov.value || 0)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            {renderGrowth(k?.aov.growth, k?.aov.value, k?.aov.previous)}
            <span className="text-[10px] text-slate-400 font-mono">
              Prev: {formatCurrency(k?.aov.previous || 0)}
            </span>
          </div>
        </div>

        {/* 5. Paid Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Prepaid (Paid)</span>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              PAID
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {k?.paidOrders.value || 0}{' '}
              <span className="text-xs font-normal text-slate-500">orders</span>
            </span>
          </div>
          <div className="mt-2.5 text-xs font-semibold text-emerald-800">
            {formatCurrency(k?.paidOrders.sales || 0)}
          </div>
        </div>

        {/* 6. COD Orders */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cash on Delivery</span>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
              COD
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {k?.codOrders.value || 0}{' '}
              <span className="text-xs font-normal text-slate-500">orders</span>
            </span>
          </div>
          <div className="mt-2.5 text-xs font-semibold text-amber-800">
            {formatCurrency(k?.codOrders.sales || 0)}
          </div>
        </div>

        {/* 7. Pending Payments / Fulfillment */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {k?.pendingPayments.value || 0}{' '}
              <span className="text-xs font-normal text-slate-500">orders</span>
            </span>
          </div>
          <div className="mt-2.5 text-[11px] text-slate-400">
            Awaiting delivery or payment
          </div>
        </div>

        {/* 8. Refunded / Returned */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Refunded / RTO</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {k?.refundedOrders.value || 0}{' '}
              <span className="text-xs font-normal text-slate-500">orders</span>
            </span>
          </div>
          <div className="mt-2.5 text-xs font-semibold text-rose-700">
            {formatCurrency(k?.refundedOrders.amount || 0)}
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Chart (Span 2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Sales Trend</h2>
              <p className="text-[11px] text-slate-500">Revenue and order velocity over time</p>
            </div>
          </div>
          <div className="h-72 w-full">
            {chartData?.dailySales && chartData.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailySales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008060" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#008060" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Sales']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#008060" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No sales recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Paid vs COD Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Paid vs COD Share</h2>
            <p className="text-[11px] text-slate-500">Revenue distribution by payment method</p>
          </div>
          <div className="h-56 my-2">
            {chartData?.paymentBreakdown && chartData.paymentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.paymentBreakdown}
                    dataKey="totalAmount"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {chartData.paymentBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment data available for this period.
              </div>
            )}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {chartData?.paymentBreakdown.map((item, idx) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-medium text-slate-700">{item.status}</span>
                  <span className="text-slate-400">({item.count} orders)</span>
                </div>
                <span className="font-semibold text-slate-900">{formatCurrency(item.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Top Products & Fulfillment Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Performing Products</h2>
              <p className="text-[11px] text-slate-500">Highest revenue contributors in this period</p>
            </div>
            <button
              onClick={onNavigateToProducts}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center"
            >
              View all <ArrowRight className="w-3 h-3 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                No product sales data available yet.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.productName} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <div className="flex items-center space-x-3 overflow-hidden pr-3">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">{p.productName}</p>
                      <p className="text-[10px] text-slate-500">{p.unitsSold} units sold across {p.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(p.totalRevenue)}</p>
                    <p className="text-[10px] text-emerald-700 font-medium">{p.contributionPercentage.toFixed(1)}% share</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Fulfillment Status Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Order Fulfillment Status</h2>
              <p className="text-[11px] text-slate-500">Logistics delivery & transit progression</p>
            </div>
          </div>
          <div className="h-60">
            {chartData?.fulfillmentBreakdown && chartData.fulfillmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.fulfillmentBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Orders" fill="#008060" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No fulfillment data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
            <p className="text-[11px] text-slate-500">Latest synchronized and imported transactions</p>
          </div>
          <button
            onClick={onNavigateToOrders}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center"
          >
            Manage all orders <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Amount</th>
                <th className="py-2.5 px-4">Payment</th>
                <th className="py-2.5 px-4">Fulfillment</th>
                <th className="py-2.5 px-4">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No Shopify orders found.
                  </td>
                </tr>
              ) : (
                recentOrders.map(o => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-emerald-800">{o.order_name || `#${o.order_number}`}</td>
                  <td className="py-3 px-4 text-slate-600">{o.order_date}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{o.customer_name || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{formatCurrency(o.total_price)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.financial_status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-800'
                          : o.financial_status === 'COD'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {o.financial_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                        o.fulfillment_status === 'Delivered'
                          ? 'bg-blue-50 text-blue-700'
                          : o.fulfillment_status === 'In Transit'
                          ? 'bg-indigo-50 text-indigo-700'
                          : o.fulfillment_status === 'RTO' || o.fulfillment_status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {o.fulfillment_status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                      {o.source}
                    </span>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
