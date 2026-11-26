import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

interface DateRangePickerProps {
  currentRange: DateRange;
  onChange: (range: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ currentRange, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(currentRange.startDate);
  const [customEnd, setCustomEnd] = useState(currentRange.endDate);

  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

  const presets: { label: string; getRange: () => { startDate: string; endDate: string } }[] = [
    {
      label: 'All Time (Full Tracker)',
      getRange: () => ({ startDate: '2026-05-01', endDate: formatYMD(today) })
    },
    {
      label: 'Today',
      getRange: () => {
        const d = formatYMD(today);
        return { startDate: d, endDate: d };
      }
    },
    {
      label: 'Yesterday',
      getRange: () => {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        const d = formatYMD(y);
        return { startDate: d, endDate: d };
      }
    },
    {
      label: 'Last 7 Days',
      getRange: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { startDate: formatYMD(start), endDate: formatYMD(today) };
      }
    },
    {
      label: 'Last 30 Days',
      getRange: () => {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { startDate: formatYMD(start), endDate: formatYMD(today) };
      }
    },
    {
      label: 'This Month',
      getRange: () => {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: formatYMD(start), endDate: formatYMD(today) };
      }
    },
    {
      label: 'Previous Month',
      getRange: () => {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return { startDate: formatYMD(start), endDate: formatYMD(end) };
      }
    }
  ];

  const handleSelectPreset = (p: typeof presets[0]) => {
    const r = p.getRange();
    onChange({ ...r, label: p.label });
    setIsOpen(false);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onChange({
        startDate: customStart,
        endDate: customEnd,
        label: `${customStart} to ${customEnd}`
      });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs transition"
      >
        <Calendar className="w-3.5 h-3.5 mr-2 text-slate-500" />
        <span>{currentRange.label}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-2 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-40 mt-1.5 w-72 origin-top-right rounded-xl bg-white p-3 shadow-lg ring-1 ring-black/5 border border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
              Date Presets
            </div>
            <div className="space-y-0.5">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                    currentRange.label === p.label
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-100 my-2 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
                Custom Range
              </div>
              <form onSubmit={handleApplyCustom} className="space-y-2 px-1">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-200 focus:outline-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-1 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold py-1.5 rounded transition"
                >
                  Apply Custom Range
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
