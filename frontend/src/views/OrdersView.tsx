import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { Order } from '../types';
import { DateRange } from '../components/DateRangePicker';

interface OrdersViewProps {
  dateRange: DateRange;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ dateRange }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [financialStatus, setFinancialStatus] = useState('ALL');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('ALL');
  const [source, setSource] = useState('ALL');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Partial<Order> | null>(null);
  const [orderItemsForm, setOrderItemsForm] = useState<{ productName: string; quantity: number; price: number }[]>([
    { productName: '', quantity: 1, price: 0 }
  ]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadOrders = () => {
    setLoading(true);
    api.getOrders({
      page,
      limit,
      search,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      financialStatus: financialStatus === 'ALL' ? undefined : financialStatus,
      fulfillmentStatus: fulfillmentStatus === 'ALL' ? undefined : fulfillmentStatus,
      source: source === 'ALL' ? undefined : source
    })
      .then(res => {
        setOrders(res.orders);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      })
      .catch(err => {
        console.error('Failed to load orders:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    setPage(1);
  }, [search, financialStatus, fulfillmentStatus, source, dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadOrders();
  }, [page, search, financialStatus, fulfillmentStatus, source, dateRange.startDate, dateRange.endDate]);

  const formatCurrency = (val: number) => `₹${Number(val).toLocaleString('en-IN')}`;

  const handleOpenDetail = (orderId: number) => {
    api.getOrder(orderId).then(res => {
      setSelectedOrder(res.order);
      setIsDetailOpen(true);
    });
  };

  const handleOpenAdd = () => {
    setEditingOrder({
      order_number: '',
      order_date: new Date().toISOString().slice(0, 10),
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      shipping_address: '',
      city: '',
      province: '',
      zip: '',
      total_price: 0,
      financial_status: 'PAID',
      fulfillment_status: 'Delivered',
      tracking_number: '',
      notes: ''
    });
    setOrderItemsForm([{ productName: '', quantity: 1, price: 0 }]);
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    api.getOrder(order.id).then(res => {
      const full = res.order;
      setEditingOrder(full);
      if (full.items && full.items.length > 0) {
        setOrderItemsForm(
          full.items.map(it => ({
            productName: it.product_name,
            quantity: it.quantity,
            price: it.price
          }))
        );
      } else {
        setOrderItemsForm([{ productName: 'Item', quantity: 1, price: full.total_price }]);
      }
      setIsAddEditOpen(true);
    });
  };

  const handleDelete = (order: Order) => {
    const isShopify = order.source === 'shopify';
    const confirmMsg = isShopify
      ? `Warning: Order #${order.order_number} originated from Shopify! Are you sure you want to permanently remove it?`
      : `Are you sure you want to delete order #${order.order_number}?`;

    if (window.confirm(confirmMsg)) {
      api.deleteOrder(order.id, isShopify)
        .then(() => {
          setNotification({ type: 'success', message: `Order #${order.order_number} deleted.` });
          loadOrders();
          setIsDetailOpen(false);
        })
        .catch(err => {
          setNotification({ type: 'error', message: err.message });
        });
    }
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const calcTotal = orderItemsForm.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

    const payload = {
      orderNumber: editingOrder.order_number,
      orderDate: editingOrder.order_date,
      customerName: editingOrder.customer_name,
      customerPhone: editingOrder.customer_phone,
      customerEmail: editingOrder.customer_email,
      shippingAddress: editingOrder.shipping_address,
      city: editingOrder.city,
      province: editingOrder.province,
      zip: editingOrder.zip,
      totalPrice: calcTotal > 0 ? calcTotal : editingOrder.total_price,
      financialStatus: editingOrder.financial_status,
      fulfillmentStatus: editingOrder.fulfillment_status,
      trackingNumber: editingOrder.tracking_number,
      notes: editingOrder.notes,
      items: orderItemsForm.filter(it => it.productName.trim() !== ''),
      manualOverride: true
    };

    if (editingOrder.id) {
      // Update
      api.updateOrder(editingOrder.id, payload)
        .then(() => {
          setNotification({ type: 'success', message: 'Order updated successfully!' });
          setIsAddEditOpen(false);
          loadOrders();
        })
        .catch(err => setNotification({ type: 'error', message: err.message }));
    } else {
      // Create
      api.createOrder(payload)
        .then(() => {
          setNotification({ type: 'success', message: 'Order created successfully!' });
          setIsAddEditOpen(false);
          loadOrders();
        })
        .catch(err => setNotification({ type: 'error', message: err.message }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Notification Toast */}
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

      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order #, customer, phone, email, product, tracking..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-emerald-600 bg-slate-50/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Status Filter */}
          <select
            value={financialStatus}
            onChange={e => setFinancialStatus(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-emerald-600"
          >
            <option value="ALL">Payment: All</option>
            <option value="PAID">PAID</option>
            <option value="COD">COD</option>
            <option value="PENDING">PENDING</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          {/* Fulfillment Status Filter */}
          <select
            value={fulfillmentStatus}
            onChange={e => setFulfillmentStatus(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-emerald-600"
          >
            <option value="ALL">Fulfillment: All</option>
            <option value="Delivered">Delivered</option>
            <option value="In Transit">In Transit</option>
            <option value="Pending">Pending</option>
            <option value="RTO">RTO</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Source Filter */}
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium focus:outline-emerald-600"
          >
            <option value="ALL">Source: All</option>
            <option value="shopify">Shopify API</option>
            <option value="excel_import">Excel Import</option>
            <option value="manual">Manual Entry</option>
          </select>

          {/* Add Order Button */}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white shadow-2xs transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Order</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Order #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Products & Qty</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Payment</th>
                <th className="py-2.5 px-3">Fulfillment</th>
                <th className="py-2.5 px-3">Tracking</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    {search || financialStatus !== 'ALL' || fulfillmentStatus !== 'ALL' || source !== 'ALL'
                      ? 'No orders match your search and filter criteria.'
                      : 'No Shopify orders found.'}
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition group">
                    <td className="py-3 px-3 font-bold text-emerald-800 whitespace-nowrap">
                      {o.order_name || `#${o.order_number}`}
                    </td>
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{o.order_date}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      <div className="truncate max-w-[140px]">{o.customer_name || '-'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{o.customer_phone || o.customer_email || ''}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="truncate max-w-[180px] font-medium text-slate-800" title={o.productSummary || ''}>
                        {o.productSummary || 'Item'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {o.totalQuantity || 1} {o.totalQuantity === 1 ? 'unit' : 'units'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(o.total_price)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
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
                    <td className="py-3 px-3 whitespace-nowrap">
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
                    <td className="py-3 px-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                      {o.tracking_number || '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {o.source}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenDetail(o.id)}
                          className="p-1 rounded text-slate-500 hover:text-emerald-800 hover:bg-slate-100"
                          title="View Order Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(o)}
                          className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-slate-100"
                          title="Edit Order"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(o)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title="Delete Order"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{orders.length}</strong> of{' '}
            <strong className="text-slate-900">{totalCount}</strong> orders
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-800">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Drawer */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setIsDetailOpen(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {selectedOrder.order_name || `#${selectedOrder.order_number}`}
                </h3>
                <p className="text-xs text-slate-500">Order placed on {selectedOrder.order_date}</p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Financial Status</div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">{selectedOrder.financial_status}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Fulfillment Status</div>
                  <div className="text-xs font-bold text-emerald-800 mt-0.5">{selectedOrder.fulfillment_status}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Source</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5 uppercase">{selectedOrder.source}</div>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Customer Details</h4>
                <div className="p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 bg-white">
                  <div className="font-bold text-slate-900">{selectedOrder.customer_name || '-'}</div>
                  {selectedOrder.customer_phone && (
                    <div className="text-slate-600">📞 {selectedOrder.customer_phone}</div>
                  )}
                  {selectedOrder.customer_email && (
                    <div className="text-slate-600">✉️ {selectedOrder.customer_email}</div>
                  )}
                  {selectedOrder.shipping_address && (
                    <div className="text-slate-600 pt-1 border-t border-slate-100 whitespace-pre-line">
                      📍 {selectedOrder.shipping_address}
                    </div>
                  )}
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Line Items</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map(it => (
                      <div key={it.id} className="p-3 flex items-center justify-between text-xs bg-white">
                        <div>
                          <p className="font-semibold text-slate-900">{it.product_name}</p>
                          <p className="text-[10px] text-slate-500">Qty: {it.quantity}</p>
                        </div>
                        <div className="text-right font-bold text-slate-900">{formatCurrency(it.price)}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-400">No individual line items listed.</div>
                  )}
                  <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-emerald-800 text-sm">{formatCurrency(selectedOrder.total_price)}</span>
                  </div>
                </div>
              </div>

              {/* Tracking Information */}
              {selectedOrder.tracking_number && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Courier & Tracking</h4>
                  <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{selectedOrder.tracking_company || 'Logistics Courier'}</p>
                      <p className="font-mono text-slate-600 text-[11px] mt-0.5">{selectedOrder.tracking_number}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Notes & Remarks</h4>
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200/60 text-xs text-amber-900">
                    {selectedOrder.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedOrder)}
                className="text-xs text-rose-700 hover:text-rose-800 font-semibold flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Order
              </button>
              <button
                onClick={() => {
                  setIsDetailOpen(false);
                  handleOpenEdit(selectedOrder);
                }}
                className="px-4 py-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
              >
                Edit Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Order Modal */}
      {isAddEditOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingOrder.id ? `Edit Order #${editingOrder.order_number}` : 'Create New Manual Order'}
              </h3>
              <button onClick={() => setIsAddEditOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Order # *</label>
                  <input
                    type="text"
                    required
                    value={editingOrder.order_number || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, order_number: e.target.value })}
                    placeholder="Order number"
                    disabled={Boolean(editingOrder.id)}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600 disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    required
                    value={editingOrder.order_date || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, order_date: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={editingOrder.customer_name || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                    placeholder="Full name"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingOrder.customer_phone || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, customer_phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingOrder.customer_email || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, customer_email: e.target.value })}
                    placeholder="Email address"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Shipping Address</label>
                <textarea
                  rows={2}
                  value={editingOrder.shipping_address || ''}
                  onChange={e => setEditingOrder({ ...editingOrder, shipping_address: e.target.value })}
                  placeholder="Street address, building, city, pin code..."
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                />
              </div>

              {/* Statuses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={editingOrder.financial_status || 'PAID'}
                    onChange={e => setEditingOrder({ ...editingOrder, financial_status: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="PAID">PAID (Prepaid)</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="REFUNDED">REFUNDED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fulfillment Status</label>
                  <select
                    value={editingOrder.fulfillment_status || 'Delivered'}
                    onChange={e => setEditingOrder({ ...editingOrder, fulfillment_status: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600 bg-white"
                  >
                    <option value="Delivered">Delivered</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Pending">Pending</option>
                    <option value="RTO">RTO</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-slate-700">Line Items</label>
                  <button
                    type="button"
                    onClick={() => setOrderItemsForm([...orderItemsForm, { productName: '', quantity: 1, price: 0 }])}
                    className="text-[11px] text-emerald-800 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {orderItemsForm.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={it.productName}
                        onChange={e => {
                          const copy = [...orderItemsForm];
                          copy[idx].productName = e.target.value;
                          setOrderItemsForm(copy);
                        }}
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={e => {
                          const copy = [...orderItemsForm];
                          copy[idx].quantity = parseInt(e.target.value) || 1;
                          setOrderItemsForm(copy);
                        }}
                        className="w-16 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                      />
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Price (INR)"
                        value={it.price}
                        onChange={e => {
                          const copy = [...orderItemsForm];
                          copy[idx].price = parseFloat(e.target.value) || 0;
                          setOrderItemsForm(copy);
                        }}
                        className="w-24 text-xs px-2 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                      />
                      {orderItemsForm.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setOrderItemsForm(orderItemsForm.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 text-xs px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tracking & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tracking #</label>
                  <input
                    type="text"
                    value={editingOrder.tracking_number || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, tracking_number: e.target.value })}
                    placeholder="AWB / Waybill"
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Notes / Remarks</label>
                  <input
                    type="text"
                    value={editingOrder.notes || ''}
                    onChange={e => setEditingOrder({ ...editingOrder, notes: e.target.value })}
                    placeholder="Delivery instructions..."
                    className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white"
                >
                  {editingOrder.id ? 'Save Changes' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
