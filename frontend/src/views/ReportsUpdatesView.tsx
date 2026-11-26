import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Share2,
  RefreshCw,
  Calendar,
  Check,
  Send,
  Sliders,
  Clock,
  Download,
  Plus,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import {
  ReportDataResult,
  ReportCustomization,
  GeneratedReportRecord,
  MonthlyReportResult,
  DailyReportItem
} from '../types';

export const ReportsUpdatesView: React.FC = () => {
  // Navigation sub-tabs
  const [activeTab, setActiveTab] = useState<'generator' | 'monthly' | 'history'>('generator');

  // Report configuration
  const [reportType, setReportType] = useState<'daily' | 'last2days' | 'custom' | 'weekly' | 'monthly'>('last2days');
  const [format, setFormat] = useState<'formal' | 'concise'>('formal');

  // Dates: Default to dynamic current 2-day range
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Customization options
  const [customSettings, setCustomSettings] = useState<ReportCustomization>({
    includeOrders: true,
    includeTotalSales: true,
    includeDiscounts: false,
    includeRefunds: false,
    includeNetSales: false,
    includePaidCod: false,
    includeMetaAds: true,
    includeShipping: true,
    includePackaging: false,
    includeOther: true,
    includeTotalExpenses: true,
    includeNetBalance: true,
    showMissingAsNotEntered: true
  });
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Generated state
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState<ReportDataResult | null>(null);
  const [whatsappText, setWhatsappText] = useState('');
  const [copied, setCopied] = useState(false);

  // Quick Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseDate, setExpenseDate] = useState('2026-11-24');
  const [expenseCategory, setExpenseCategory] = useState('Meta Ads');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');

  // History state
  const [historyList, setHistoryList] = useState<GeneratedReportRecord[]>([]);

  // Monthly state
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [monthlyData, setMonthlyData] = useState<MonthlyReportResult | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  // Initialize report on mount
  useEffect(() => {
    handlePresetChange('last2days');
  }, []);

  const formatINR = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const handlePresetChange = (type: typeof reportType) => {
    setReportType(type);
    const today = new Date();
    const baseDate = new Date();

    if (type === 'daily') {
      const d = baseDate.toISOString().slice(0, 10);
      setStartDate(d);
      setEndDate(d);
      triggerGenerate(d, d, type);
    } else if (type === 'last2days') {
      const d2 = baseDate.toISOString().slice(0, 10);
      const d1 = new Date(baseDate);
      d1.setDate(d1.getDate() - 1);
      const startStr = d1.toISOString().slice(0, 10);
      setStartDate(startStr);
      setEndDate(d2);
      triggerGenerate(startStr, d2, type);
    } else if (type === 'weekly') {
      const dEnd = baseDate.toISOString().slice(0, 10);
      const dStart = new Date(baseDate);
      dStart.setDate(dStart.getDate() - 6);
      const startStr = dStart.toISOString().slice(0, 10);
      setStartDate(startStr);
      setEndDate(dEnd);
      triggerGenerate(startStr, dEnd, type);
    } else if (type === 'monthly') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(startStr);
      setEndDate(endStr);
      triggerGenerate(startStr, endStr, type);
    }
  };

  const triggerGenerate = (start = startDate, end = endDate, rType = reportType, fmt = format, cust = customSettings) => {
    setLoading(true);
    api.generateReport({
      reportType: rType,
      startDate: start,
      endDate: end,
      format: fmt,
      customSettings: cust,
      saveToHistory: true
    })
      .then(res => {
        setReportResult(res.reportData);
        setWhatsappText(res.messageText);
        loadHistory();
      })
      .catch(err => {
        alert(`Failed to generate report: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleCopyMessage = () => {
    if (!whatsappText) return;
    navigator.clipboard.writeText(whatsappText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!whatsappText) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`;
    window.open(url, '_blank');
  };

  const loadHistory = () => {
    api.getReportHistory().then(res => {
      setHistoryList(res.history);
    });
  };

  const loadMonthlyData = (monthStr: string) => {
    setMonthlyLoading(true);
    api.getMonthlyReport(monthStr)
      .then(res => {
        setMonthlyData(res);
      })
      .catch(err => alert(err.message))
      .finally(() => setMonthlyLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'monthly') {
      loadMonthlyData(selectedMonth);
    } else if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, selectedMonth]);

  const handleSaveQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    api.createExpense({
      category: expenseCategory,
      description: expenseDesc || `${expenseCategory} spend`,
      amount: amt,
      expenseDate: expenseDate
    })
      .then(() => {
        setIsExpenseModalOpen(false);
        setExpenseAmount('');
        setExpenseDesc('');
        // Re-generate current report to immediately reflect newly added expense
        triggerGenerate();
      })
      .catch(err => alert(err.message));
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Sub-Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'generator'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>WhatsApp Report Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'monthly'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Consolidated</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'history'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Report History</span>
          </button>
        </div>

        <button
          onClick={() => setIsExpenseModalOpen(true)}
          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1 text-emerald-700" />
          <span>Quick Add Expense</span>
        </button>
      </div>

      {/* TAB 1: WHATSAPP REPORT GENERATOR */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls & Dynamic Calculations (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Report Type Selector Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Report Type</h3>
                <p className="text-[11px] text-slate-500">Pick alternate-day (2-day) or custom period to generate</p>
              </div>

              {/* Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => handlePresetChange('last2days')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${
                    reportType === 'last2days'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Last 2 Days (Default)
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange('daily')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    reportType === 'daily'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Single Day
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange('weekly')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    reportType === 'weekly'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Weekly (7 Days)
                </button>

                <button
                  type="button"
                  onClick={() => handlePresetChange('monthly')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    reportType === 'monthly'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Monthly Report
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('custom')}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition ${
                    reportType === 'custom'
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              {/* Date Pickers */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                  />
                </div>
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                  />
                </div>

                <div className="flex items-end space-x-2 pt-4">
                  <button
                    onClick={() => triggerGenerate()}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition flex items-center space-x-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>Generate Report</span>
                  </button>

                  <button
                    onClick={() => setShowCustomizer(!showCustomizer)}
                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    title="Customize report fields"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Customization Drawer (Togglable) */}
              {showCustomizer && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>WhatsApp Message Content Customization</span>
                    <button
                      onClick={() => {
                        setShowCustomizer(false);
                        triggerGenerate();
                      }}
                      className="text-[11px] text-emerald-800 font-semibold hover:underline"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeOrders}
                        onChange={e => setCustomSettings({ ...customSettings, includeOrders: e.target.checked })}
                      />
                      <span>Total Orders</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeTotalSales}
                        onChange={e => setCustomSettings({ ...customSettings, includeTotalSales: e.target.checked })}
                      />
                      <span>Total Sales</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeMetaAds}
                        onChange={e => setCustomSettings({ ...customSettings, includeMetaAds: e.target.checked })}
                      />
                      <span>Meta Ads</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeShipping}
                        onChange={e => setCustomSettings({ ...customSettings, includeShipping: e.target.checked })}
                      />
                      <span>Shipping (Delhivery)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeOther}
                        onChange={e => setCustomSettings({ ...customSettings, includeOther: e.target.checked })}
                      />
                      <span>Other Expenses</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeTotalExpenses}
                        onChange={e => setCustomSettings({ ...customSettings, includeTotalExpenses: e.target.checked })}
                      />
                      <span>Total Expenses</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includeNetBalance}
                        onChange={e => setCustomSettings({ ...customSettings, includeNetBalance: e.target.checked })}
                      />
                      <span>Net Balance</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.includePaidCod}
                        onChange={e => setCustomSettings({ ...customSettings, includePaidCod: e.target.checked })}
                      />
                      <span>Paid vs COD</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={customSettings.showMissingAsNotEntered}
                        onChange={e => setCustomSettings({ ...customSettings, showMissingAsNotEntered: e.target.checked })}
                      />
                      <span>Show Missing as "Not Entered"</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Breakdown Cards */}
            {reportResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Calculated Breakdown ({reportResult.daysCount} Days)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {reportResult.startDate} to {reportResult.endDate}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reportResult.dailyList.map(day => (
                    <div
                      key={day.date}
                      className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-900">{day.displayDate}</span>
                        <button
                          onClick={() => {
                            setExpenseDate(day.date);
                            setIsExpenseModalOpen(true);
                          }}
                          className="text-[10px] text-emerald-800 font-bold hover:underline"
                        >
                          + Add Expense
                        </button>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Orders:</span>
                          <strong className="text-slate-900">{day.validOrders}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Gross Sales:</span>
                          <strong className="text-slate-900">{formatINR(day.grossSales)}</strong>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Meta Ads:</span>
                          <span>{day.expenses.metaAds !== null ? formatINR(day.expenses.metaAds) : <span className="text-amber-600">Not Entered</span>}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping:</span>
                          <span>{day.expenses.shipping !== null ? formatINR(day.expenses.shipping) : <span className="text-amber-600">Not Entered</span>}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Other Expenses:</span>
                          <span>{day.expenses.other !== null ? formatINR(day.expenses.other) : <span className="text-amber-600">Not Entered</span>}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 font-semibold text-slate-800">
                          <span>Total Expenses:</span>
                          <span>{formatINR(day.expenses.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between pt-1 font-bold text-emerald-800">
                          <span>Net Balance:</span>
                          <span>{formatINR(day.netBalance)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Consolidated 2-Day Total Card */}
                <div className="bg-emerald-900 text-white p-5 rounded-xl shadow-md">
                  <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3 mb-3">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Consolidated Summary ({reportResult.daysCount} Days)
                      </h4>
                      <p className="text-[11px] text-emerald-200">Reconciled sum of all selected daily figures</p>
                    </div>
                    <span className="text-xs bg-emerald-800 px-2.5 py-1 rounded font-mono font-bold text-emerald-200">
                      Sum Verified ✅
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300 font-semibold">Total Orders</div>
                      <div className="text-xl font-bold mt-0.5">{reportResult.consolidated.totalOrders}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300 font-semibold">Total Sales</div>
                      <div className="text-xl font-bold mt-0.5">{formatINR(reportResult.consolidated.grossSales)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300 font-semibold">Total Expenses</div>
                      <div className="text-xl font-bold mt-0.5">{formatINR(reportResult.consolidated.totalExpenses)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300 font-semibold">Net Balance</div>
                      <div className="text-xl font-bold mt-0.5 text-emerald-300">{formatINR(reportResult.consolidated.netBalance)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: WhatsApp Message Preview & One-Click Copy (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">WhatsApp Message Preview</h3>
                  <p className="text-[11px] text-slate-500">Ready to copy and send directly to your boss</p>
                </div>

                {/* Format Toggle */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
                  <button
                    onClick={() => {
                      setFormat('formal');
                      if (reportResult) triggerGenerate(startDate, endDate, reportType, 'formal');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      format === 'formal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Formal
                  </button>
                  <button
                    onClick={() => {
                      setFormat('concise');
                      if (reportResult) triggerGenerate(startDate, endDate, reportType, 'concise');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                      format === 'concise' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    Concise
                  </button>
                </div>
              </div>

              {/* WhatsApp Chat Preview Bubble */}
              <div className="flex-1 bg-[#efeae2] p-4 rounded-xl border border-slate-300 flex flex-col justify-between">
                <div className="bg-white p-4 rounded-lg shadow-sm border border-emerald-100 text-xs font-mono whitespace-pre-wrap text-slate-800 leading-relaxed max-h-[480px] overflow-y-auto">
                  <textarea
                    rows={18}
                    value={whatsappText}
                    onChange={e => setWhatsappText(e.target.value)}
                    className="w-full bg-transparent border-0 focus:outline-hidden resize-none font-mono text-xs text-slate-800 leading-relaxed"
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-right mt-1.5 flex items-center justify-end space-x-1">
                  <span>Editable preview</span>
                </div>
              </div>

              {/* Action Buttons: 30-Second Workflow */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleCopyMessage}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy WhatsApp Message</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-4 rounded-xl border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition flex items-center justify-center space-x-2"
                  title="Directly open WhatsApp Web / App"
                >
                  <Share2 className="w-4 h-4 text-emerald-700" />
                  <span>Send on WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY CONSOLIDATED REPORT */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Consolidated Sales & Expenses</h3>
              <p className="text-xs text-slate-500">Comprehensive calendar month breakdown with high/low analysis</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
              />
              <button
                onClick={() => {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  const startStr = `${selectedMonth}-01`;
                  const lastDay = new Date(y, m, 0).getDate();
                  const endStr = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
                  setStartDate(startStr);
                  setEndDate(endStr);
                  setReportType('monthly');
                  setActiveTab('generator');
                  triggerGenerate(startStr, endStr, 'monthly');
                }}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-600 shadow-2xs transition"
                title="Generate formatted WhatsApp message for this entire month"
              >
                <Send className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                <span>Generate WhatsApp Message</span>
              </button>
              <button
                onClick={() => window.open(`/api/reports/monthly/export?month=${selectedMonth}&format=xlsx`, '_blank')}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Export Month (.xlsx)</span>
              </button>
            </div>
          </div>

          {monthlyData && (
            <div className="space-y-6">
              {/* Month KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Total Monthly Orders</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">{monthlyData.consolidated.totalOrders}</div>
                  <span className="text-[10px] text-slate-400 font-medium">Across {monthlyData.totalActiveDays} active days</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Gross Monthly Sales</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{formatINR(monthlyData.consolidated.grossSales)}</div>
                  <span className="text-[10px] text-slate-400 font-medium">Avg {formatINR(monthlyData.avgDailySales)} / day</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Total Operating Expenses</span>
                  <div className="text-xl font-bold text-slate-900 mt-1">{formatINR(monthlyData.consolidated.totalExpenses)}</div>
                  <span className="text-[10px] text-slate-400 font-medium">Ads: {formatINR(monthlyData.consolidated.metaAdsExpenses)}</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-500">Estimated Operating Balance</span>
                  <div className="text-xl font-bold text-emerald-800 mt-1">{formatINR(monthlyData.consolidated.netBalance)}</div>
                  <span className="text-[10px] text-slate-400 font-medium">Net Sales minus recorded exp</span>
                </div>
              </div>

              {/* Highest & Lowest Sales Day Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Highest Sales Day</span>
                    <div className="text-sm font-bold mt-0.5">{monthlyData.highestDay?.displayDate || '-'}</div>
                    <div className="text-emerald-700 mt-0.5">{monthlyData.highestDay?.validOrders || 0} orders</div>
                  </div>
                  <div className="text-base font-extrabold text-emerald-900">
                    {formatINR(monthlyData.highestDay?.grossSales || 0)}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Lowest Active Sales Day</span>
                    <div className="text-sm font-bold mt-0.5">{monthlyData.lowestDay?.displayDate || '-'}</div>
                    <div className="text-slate-600 mt-0.5">{monthlyData.lowestDay?.validOrders || 0} orders</div>
                  </div>
                  <div className="text-base font-bold text-slate-900">
                    {formatINR(monthlyData.lowestDay?.grossSales || 0)}
                  </div>
                </div>
              </div>

              {/* Daily Month Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900">
                  Daily Calendar Breakdown ({monthlyData.yearMonth})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-center">Orders</th>
                        <th className="py-2.5 px-4 text-right">Gross Sales</th>
                        <th className="py-2.5 px-4 text-right">Paid Sales</th>
                        <th className="py-2.5 px-4 text-right">COD Sales</th>
                        <th className="py-2.5 px-4 text-right">Meta Ads</th>
                        <th className="py-2.5 px-4 text-right">Shipping</th>
                        <th className="py-2.5 px-4 text-right">Total Exp</th>
                        <th className="py-2.5 px-4 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {monthlyData.dailyList.map(d => (
                        <tr key={d.date} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{d.date}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{d.validOrders}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{formatINR(d.grossSales)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">{formatINR(d.paidSales)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">{formatINR(d.codSales)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">{d.expenses.metaAds !== null ? formatINR(d.expenses.metaAds) : '-'}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">{d.expenses.shipping !== null ? formatINR(d.expenses.shipping) : '-'}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-slate-900">{formatINR(d.expenses.totalExpenses)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-800">{formatINR(d.netBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REPORT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs text-slate-900 flex items-center justify-between">
            <span>Past Generated Reports History</span>
            <button onClick={loadHistory} className="text-slate-400 hover:text-slate-700">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4 text-center">Orders</th>
                  <th className="py-2.5 px-4 text-right">Sales</th>
                  <th className="py-2.5 px-4 text-right">Expenses</th>
                  <th className="py-2.5 px-4 text-right">Net Balance</th>
                  <th className="py-2.5 px-4">Generated At</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No reports generated yet.
                    </td>
                  </tr>
                ) : (
                  historyList.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {h.start_date} to {h.end_date}
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">{h.report_type}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{h.total_orders}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">{formatINR(h.total_sales)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatINR(h.total_expenses)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">{formatINR(h.net_balance)}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{h.generated_at}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setWhatsappText(h.message_content);
                            setActiveTab('generator');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px]"
                        >
                          View / Copy
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-xs font-bold text-slate-900">Quick Record Expense</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveQuickExpense} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                >
                  <option value="Meta Ads">Meta Ads Expenses</option>
                  <option value="Delhivery / Shipping">Shipping Expenses (Delhivery)</option>
                  <option value="Packaging">Packaging Expenses</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="e.g. 2500"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Daily Meta ad campaign"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white"
                >
                  Save & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
