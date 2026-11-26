import React, { useEffect, useState } from 'react';
import { Search, Package, TrendingUp, Edit3, Check, X } from 'lucide-react';
import { api } from '../services/api';
import { ProductAnalyticsItem, ProductCatalogItem } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface ProductsViewProps {
  dateRange: DateRange;
}

export const ProductsView: React.FC<ProductsViewProps> = ({ dateRange }) => {
  const [products, setProducts] = useState<ProductAnalyticsItem[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Editing cost modal or inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [costInput, setCostInput] = useState<number>(0);

  useEffect(() => {
    loadProductData();
  }, [dateRange.startDate, dateRange.endDate, search]);

  const loadProductData = () => {
    setLoading(true);
    Promise.all([
      api.getProductAnalytics(dateRange.startDate, dateRange.endDate, search, 200),
      api.getProducts(search)
    ])
      .then(([analyticsRes, catalogRes]) => {
        setProducts(analyticsRes.products);
        setCatalog(catalogRes.products);
      })
      .catch(err => console.error('Failed to load products:', err))
      .finally(() => setLoading(false));
  };

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const handleSaveCost = (productId: number) => {
    api.updateProductCost(productId, costInput)
      .then(() => {
        setEditingId(null);
        loadProductData();
      })
      .catch(err => alert(err.message));
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>
        <div className="text-xs text-slate-500">
          Showing <strong>{products.length}</strong> top products for selected date period
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4 text-center">Units Sold</th>
                <th className="py-2.5 px-4 text-center">Orders</th>
                <th className="py-2.5 px-4 text-right">Avg Selling Price</th>
                <th className="py-2.5 px-4 text-right">Total Revenue</th>
                <th className="py-2.5 px-4 text-right">Sales Share</th>
                <th className="py-2.5 px-4 text-right">Unit Cost (COGS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Calculating product performance...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No product sales data available yet.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => {
                  const catalogItem = catalog.find(c => c.title === p.productName);
                  const isEditing = editingId === catalogItem?.id;

                  return (
                    <tr key={p.productName} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.productName}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">{p.unitsSold}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{p.orderCount}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(p.avgSellingPrice)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-800">{formatCurrency(p.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {p.contributionPercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right">
                        {catalogItem ? (
                          isEditing ? (
                            <div className="flex items-center justify-end space-x-1">
                              <input
                                type="number"
                                min="0"
                                value={costInput}
                                onChange={e => setCostInput(parseFloat(e.target.value) || 0)}
                                className="w-20 px-1.5 py-0.5 text-xs border border-emerald-600 rounded text-right"
                              />
                              <button
                                onClick={() => handleSaveCost(catalogItem.id)}
                                className="p-1 rounded text-emerald-700 hover:bg-emerald-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded text-slate-400 hover:bg-slate-100"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1.5">
                              <span className={catalogItem.cost_price > 0 ? 'text-slate-700 font-mono' : 'text-amber-600 font-medium'}>
                                {catalogItem.cost_price > 0 ? formatCurrency(catalogItem.cost_price) : 'Set Cost'}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingId(catalogItem.id);
                                  setCostInput(catalogItem.cost_price || 0);
                                }}
                                className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                                title="Edit unit cost price"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
