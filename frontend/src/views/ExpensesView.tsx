import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Percent,
  MinusCircle
} from 'lucide-react';
import { api } from '../services/api';
import { ExpenseItem, ProfitSummary } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface ExpensesViewProps {
  dateRange: DateRange;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ dateRange }) => {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [profitSummary, setProfitSummary] = useState<ProfitSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCategory, setFormCategory] = useState('Meta Ads');
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNotes, setFormNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getExpenses({ startDate: dateRange.startDate, endDate: dateRange.endDate }),
      api.getProfitSummary(dateRange.startDate, dateRange.endDate)
    ])
      .then(([expRes, profitRes]) => {
        setExpenses(expRes.expenses);
        setProfitSummary(profitRes);
      })
      .catch(err => console.error('Failed to load expenses & profit:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    api.createExpense({
      category: formCategory,
      description: formDesc,
      amount: amt,
      expenseDate: formDate,
      notes: formNotes
    })
      .then(() => {
        setIsModalOpen(false);
        setFormDesc('');
        setFormAmount('');
        loadData();
      })
      .catch(err => alert(err.message));
  };

  const handleDeleteExpense = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense record?')) {
      api.deleteExpense(id)
        .then(() => loadData())
        .catch(err => alert(err.message));
    }
  };

  const p = profitSummary;

  return (
    <div className="space-y-6">
      {/* Missing Cost Notice (Mandatory Requirement from User Prompt) */}
      {p?.isCostIncomplete && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start space-x-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900">Profit Estimation Notice: Incomplete Product Cost Data</h4>
            <p className="mt-0.5 text-amber-800">
              There are <strong>{p.missingCostItems}</strong> sold catalog items without a defined cost price (COGS).
              The net profit figure below represents operational profit based only on recorded expenses. You can configure unit costs in the Product Performance tab.
            </p>
          </div>
        </div>
      )}

      {/* P&L Statement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gross & Net Sales Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Revenue Breakdown</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Gross Sales</span>
              <span className="font-bold text-slate-900">{formatCurrency(p?.grossSales || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
              <span>(-) Discounts Given</span>
              <span>-{formatCurrency(p?.discounts || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 text-rose-600">
              <span>(-) Refunds & Returns</span>
              <span>-{formatCurrency(p?.refunds || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold text-emerald-800">
              <span>= Net Sales</span>
              <span>{formatCurrency(p?.netSales || 0)}</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Operating Expenses</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Cost of Goods (COGS)</span>
              <span className="font-semibold text-slate-800">{formatCurrency(p?.productCost || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Meta Ads / Advertising</span>
              <span className="font-semibold text-slate-800">{formatCurrency(p?.advertisingExpenses || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Courier & Shipping (Delhivery)</span>
              <span className="font-semibold text-slate-800">{formatCurrency(p?.shippingExpenses || 0)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Packaging & Other</span>
              <span className="font-semibold text-slate-800">{formatCurrency((p?.packagingExpenses || 0) + (p?.otherExpenses || 0))}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold text-slate-900">
              <span>= Total Expenses</span>
              <span>{formatCurrency(p?.totalExpenses || 0)}</span>
            </div>
          </div>
        </div>

        {/* Estimated Net Profit Highlight Card */}
        <div className="bg-emerald-900 text-white p-5 rounded-xl shadow-md flex flex-col justify-between">
          <div>
            <div className="text-[11px] uppercase font-bold text-emerald-300 tracking-wider">
              3. Estimated Net Profit
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatCurrency(p?.estimatedNetProfit || 0)}
            </div>
            <p className="text-xs text-emerald-200 mt-1">
              Net Sales minus all recorded costs & expenses
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-emerald-800/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-300">Profit Margin: </span>
              <strong className="text-white font-bold">{p?.profitMargin.toFixed(1)}%</strong>
            </div>
            <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded text-emerald-200 font-medium">
              Period View
            </span>
          </div>
        </div>
      </div>

      {/* Expense Management Header & Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recorded Expenses</h3>
            <p className="text-[11px] text-slate-500">Track and manage ad spends, courier charges, and packaging</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Expense</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Notes</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{exp.expense_date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{exp.description || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate">{exp.notes || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Record New Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddExpense} className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600 bg-white"
                >
                  <option value="Meta Ads">Meta Ads (Facebook / Instagram)</option>
                  <option value="Delhivery / Shipping">Delhivery / Shipping Logistics</option>
                  <option value="Packaging">Packaging Expenses</option>
                  <option value="Shopify Fees">Shopify Platform Fees</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  placeholder="e.g. 5000"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali campaign ad spend"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Invoice # or billing details"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
