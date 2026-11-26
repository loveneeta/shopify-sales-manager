import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Clock,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { ImportPreviewResult } from '../types';

export const ImportView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'force_new'>('skip');

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedRows: number;
    skippedRows: number;
    errorCount: number;
    errors: string[];
  } | null>(null);

  const [importHistory, setImportHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    api.getImportHistory().then(res => setImportHistory(res.history));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      handleUploadPreview(selected);
    }
  };

  const handleUploadPreview = (fileToPreview: File) => {
    setIsUploading(true);
    setImportResult(null);
    api.uploadAndPreview(fileToPreview)
      .then(res => {
        setPreviewData(res);
        setMapping(res.detectedMapping || {});
      })
      .catch(err => {
        alert(`Error previewing file: ${err.message}`);
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  const handleExecuteImport = () => {
    if (!previewData?.file?.path) return;
    setIsImporting(true);
    api.executeImport(previewData.file.path, mapping, duplicateStrategy)
      .then(res => {
        setImportResult(res);
        loadHistory();
      })
      .catch(err => {
        alert(`Import failed: ${err.message}`);
      })
      .finally(() => {
        setIsImporting(false);
      });
  };

  const standardFields = [
    { key: 'orderNumber', label: 'Order Number (#ORDER)', required: true },
    { key: 'date', label: 'Order Date (DATE)', required: true },
    { key: 'customerName', label: 'Customer Name', required: false },
    { key: 'product', label: 'Product Name', required: true },
    { key: 'qty', label: 'Quantity (Qty)', required: false },
    { key: 'price', label: 'Order Price / Total Amount', required: true },
    { key: 'paymentStatus', label: 'Payment Status (COD / PAID)', required: false },
    { key: 'status', label: 'Fulfillment Status (Delivered/In Transit)', required: false },
    { key: 'tracking', label: 'Courier Tracking #', required: false },
    { key: 'address', label: 'Delivery Address', required: false },
    { key: 'contact', label: 'Contact (Phone / Email)', required: false }
  ];

  return (
    <div className="space-y-6">
      {/* File Upload Box */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Import Excel or CSV Orders</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Upload your historical order workbook (e.g. <code>Daily Sales Tracker.xlsx</code>) or Shopify export files (.xlsx, .xls, .csv).
          </p>

          <div className="mt-5 flex justify-center">
            <label className="relative cursor-pointer bg-white px-5 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-600 transition flex items-center space-x-3 text-xs font-semibold text-slate-700 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              <span>{file ? file.name : 'Select or Drop File to Import'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          </div>

          {isUploading && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-slate-500">
              <div className="w-4 h-4 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing file structure and matching columns...</span>
            </div>
          )}
        </div>
      </div>

      {/* Mapping and Preview Section (Visible when file is analyzed) */}
      {previewData && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">File Analysis & Column Mapping</h3>
              <p className="text-xs text-slate-500">
                Sheet: <strong>{previewData.sheetName}</strong> | Estimated valid orders: <strong>{previewData.estimatedTotalOrders}</strong>
              </p>
            </div>

            {/* Duplicate Strategy */}
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-600 font-medium">Duplicate orders:</span>
              <select
                value={duplicateStrategy}
                onChange={e => setDuplicateStrategy(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option value="skip">Skip duplicates (Recommended)</option>
                <option value="update">Update existing orders</option>
                <option value="force_new">Create new entry</option>
              </select>
            </div>
          </div>

          {/* Interactive Column Mapping Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Matched Column Fields
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {standardFields.map(field => (
                <div key={field.key} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.required && <span className="text-rose-500 font-bold">*</span>}
                  </div>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={e => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-300 bg-white text-slate-800 focus:outline-emerald-600"
                  >
                    <option value="">-- Not Mapped --</option>
                    {previewData.headers.map(h => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Live Data Preview Table (First 10 rows) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Live Data Preview (First 10 Rows)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold uppercase">
                    {previewData.headers.slice(0, 10).map(h => (
                      <th key={h} className="py-2 px-3 border-b border-slate-200 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {previewData.previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {previewData.headers.slice(0, 10).map(h => (
                        <td key={h} className="py-2 px-3 whitespace-nowrap max-w-[200px] truncate">
                          {String(row[h] || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Execute Button */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Historical records and customer details will be safely preserved in SQLite.
            </div>
            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white shadow-2xs transition disabled:opacity-50 flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing orders & items...</span>
                </>
              ) : (
                <>
                  <span>Execute Import Now</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Import Result Banner */}
          {importResult && (
            <div
              className={`p-4 rounded-xl border ${
                importResult.errorCount === 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Import Completed Successfully!</span>
              </div>
              <div className="mt-2 text-xs flex gap-6">
                <div>Imported Orders: <strong>{importResult.importedRows}</strong></div>
                <div>Skipped (Duplicates): <strong>{importResult.skippedRows}</strong></div>
                <div>Errors: <strong>{importResult.errorCount}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Import History Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Import Log History</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-4">Filename</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Imported</th>
                <th className="py-2.5 px-4">Skipped</th>
                <th className="py-2.5 px-4">Errors</th>
                <th className="py-2.5 px-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {importHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No files imported yet.
                  </td>
                </tr>
              ) : (
                importHistory.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{h.filename}</td>
                    <td className="py-2.5 px-4 text-slate-600 uppercase">{h.file_type}</td>
                    <td className="py-2.5 px-4 text-emerald-800 font-bold">{h.imported_rows}</td>
                    <td className="py-2.5 px-4 text-slate-500">{h.skipped_rows}</td>
                    <td className="py-2.5 px-4 text-rose-700 font-semibold">{h.error_count}</td>
                    <td className="py-2.5 px-4 text-slate-500">{h.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
