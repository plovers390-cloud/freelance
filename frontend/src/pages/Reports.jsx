import { useState, useEffect } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  HiOutlineChartBar,
  HiOutlineDocumentText,
  HiOutlineArrowPath,
} from 'react-icons/hi2';

const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

const quarterOptions = [
  { value: '', label: 'Full Year' },
  { value: '1', label: 'Q1 (Jan–Mar)' },
  { value: '2', label: 'Q2 (Apr–Jun)' },
  { value: '3', label: 'Q3 (Jul–Sep)' },
  { value: '4', label: 'Q4 (Oct–Dec)' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 shadow-lg bg-white !backdrop-blur-md text-xs">
      <p className="font-semibold text-surface-900 mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState('monthly');
  const [year, setYear] = useState(currentYear);

  // Monthly report state
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(true);

  // GST report state
  const [gstQuarter, setGstQuarter] = useState('');
  const [gstData, setGstData] = useState(null);
  const [gstLoading, setGstLoading] = useState(false);

  // Fetch monthly report
  useEffect(() => {
    if (activeTab !== 'monthly') return;
    const fetch = async () => {
      setMonthlyLoading(true);
      try {
        const res = await api.get('/reports/monthly', { params: { year } });
        setMonthlyData(res.data);
      } catch {
        setMonthlyData(null);
      } finally {
        setMonthlyLoading(false);
      }
    };
    fetch();
  }, [year, activeTab]);

  // Fetch GST report
  useEffect(() => {
    if (activeTab !== 'gst') return;
    const fetch = async () => {
      setGstLoading(true);
      try {
        const params = { year };
        if (gstQuarter) params.quarter = gstQuarter;
        const res = await api.get('/reports/gst', { params });
        setGstData(res.data);
      } catch {
        setGstData(null);
      } finally {
        setGstLoading(false);
      }
    };
    fetch();
  }, [year, gstQuarter, activeTab]);

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
          <p className="text-surface-700/60 mt-1">Analytics and tax summaries</p>
        </div>

        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm font-medium focus:border-primary-500 transition-colors appearance-none cursor-pointer"
        >
          {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'monthly'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
              : 'bg-surface-100 text-surface-700/60 hover:bg-surface-200'
          }`}
        >
          <HiOutlineChartBar className="w-5 h-5" />
          Monthly Earnings
        </button>
        <button
          onClick={() => setActiveTab('gst')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
            activeTab === 'gst'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
              : 'bg-surface-100 text-surface-700/60 hover:bg-surface-200'
          }`}
        >
          <HiOutlineDocumentText className="w-5 h-5" />
          GST Summary
        </button>
      </div>

      {/* ========= Monthly Earnings Tab ========= */}
      {activeTab === 'monthly' && (
        <>
          {monthlyLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : !monthlyData ? (
            <div className="glass-card p-12 text-center text-surface-700/40">Could not load report data.</div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-surface-700/50">Total Billed</p>
                  <p className="text-xl font-bold text-surface-900 mt-1">{formatINR(monthlyData.totals.total_billed)}</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-surface-700/50">Total Earned</p>
                  <p className="text-xl font-bold text-success-600 mt-1">{formatINR(monthlyData.totals.total_earned)}</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-surface-700/50">Pending</p>
                  <p className="text-xl font-bold text-warning-600 mt-1">{formatINR(monthlyData.totals.total_pending)}</p>
                </div>
                <div className="glass-card p-5">
                  <p className="text-xs font-medium text-surface-700/50">Total Invoices</p>
                  <p className="text-xl font-bold text-surface-900 mt-1">{monthlyData.totals.total_invoices}</p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="glass-card p-6">
                <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">
                  Monthly Revenue — {year}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData.months} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month_short" tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="total_earned" name="Earned" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Monthly breakdown table */}
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50/50">
                      <th className="text-left py-3 px-5 font-semibold text-surface-700/50">Month</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Invoices</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Billed</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Earned</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {monthlyData.months.filter(m => m.total_invoices > 0).map((m) => (
                      <tr key={m.month} className="hover:bg-primary-50/30 transition-colors">
                        <td className="py-3 px-5 font-medium text-surface-900">{m.month}</td>
                        <td className="py-3 px-5 text-right text-surface-700">{m.total_invoices}</td>
                        <td className="py-3 px-5 text-right text-surface-700">{formatINR(m.total_billed)}</td>
                        <td className="py-3 px-5 text-right font-medium text-success-600">{formatINR(m.total_earned)}</td>
                        <td className="py-3 px-5 text-right font-medium text-warning-600">{formatINR(m.total_pending)}</td>
                      </tr>
                    ))}
                    {monthlyData.months.filter(m => m.total_invoices > 0).length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-surface-700/40">No data for {year}</td></tr>
                    )}
                  </tbody>
                  {monthlyData.months.filter(m => m.total_invoices > 0).length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-surface-300 bg-surface-50">
                        <td className="py-3 px-5 font-bold text-surface-900">Total</td>
                        <td className="py-3 px-5 text-right font-bold text-surface-900">{monthlyData.totals.total_invoices}</td>
                        <td className="py-3 px-5 text-right font-bold text-surface-900">{formatINR(monthlyData.totals.total_billed)}</td>
                        <td className="py-3 px-5 text-right font-bold text-success-600">{formatINR(monthlyData.totals.total_earned)}</td>
                        <td className="py-3 px-5 text-right font-bold text-warning-600">{formatINR(monthlyData.totals.total_pending)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ========= GST Summary Tab ========= */}
      {activeTab === 'gst' && (
        <>
          {/* Quarter filter */}
          <div className="flex gap-2">
            {quarterOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setGstQuarter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  gstQuarter === value
                    ? 'bg-accent-600 text-white shadow-sm'
                    : 'bg-surface-100 text-surface-700/60 hover:bg-surface-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {gstLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : !gstData ? (
            <div className="glass-card p-12 text-center text-surface-700/40">Could not load GST data.</div>
          ) : (
            <>
              {/* Period label */}
              <div className="glass-card p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-surface-700/50">Period</p>
                  <p className="text-lg font-bold text-surface-900">{gstData.period}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-surface-700/50">GST Collected</p>
                  <p className="text-lg font-bold text-primary-600">{formatINR(gstData.totals.gst_collected)}</p>
                </div>
              </div>

              {/* GST by Rate */}
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-200">
                  <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">GST by Rate</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-50/50">
                      <th className="text-left py-3 px-5 font-semibold text-surface-700/50">GST Rate</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Invoices</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Taxable Amount</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">GST Collected</th>
                      <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {gstData.gst_summary.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-surface-700/40">No paid invoices for this period</td></tr>
                    ) : (
                      gstData.gst_summary.map((row) => (
                        <tr key={row.gst_rate} className="hover:bg-primary-50/30 transition-colors">
                          <td className="py-3 px-5 font-medium text-surface-900">{row.gst_rate}%</td>
                          <td className="py-3 px-5 text-right text-surface-700">{row.invoice_count}</td>
                          <td className="py-3 px-5 text-right text-surface-700">{formatINR(row.taxable_amount)}</td>
                          <td className="py-3 px-5 text-right font-medium text-primary-600">{formatINR(row.gst_collected)}</td>
                          <td className="py-3 px-5 text-right font-bold text-surface-900">{formatINR(row.total_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {gstData.gst_summary.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-surface-300 bg-surface-50">
                        <td className="py-3 px-5 font-bold text-surface-900">Total</td>
                        <td className="py-3 px-5 text-right font-bold text-surface-900">{gstData.totals.invoice_count}</td>
                        <td className="py-3 px-5 text-right font-bold text-surface-900">{formatINR(gstData.totals.taxable_amount)}</td>
                        <td className="py-3 px-5 text-right font-bold text-primary-600">{formatINR(gstData.totals.gst_collected)}</td>
                        <td className="py-3 px-5 text-right font-bold text-surface-900">{formatINR(gstData.totals.total_amount)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Detailed invoices */}
              {gstData.invoices?.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-surface-200">
                    <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Invoice Details — {gstData.period}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50/50">
                          <th className="text-left py-3 px-5 font-semibold text-surface-700/50">Invoice #</th>
                          <th className="text-left py-3 px-5 font-semibold text-surface-700/50">Client</th>
                          <th className="text-left py-3 px-5 font-semibold text-surface-700/50">Date</th>
                          <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Subtotal</th>
                          <th className="text-right py-3 px-5 font-semibold text-surface-700/50">GST</th>
                          <th className="text-right py-3 px-5 font-semibold text-surface-700/50">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {gstData.invoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-primary-50/30 transition-colors">
                            <td className="py-3 px-5 font-medium text-primary-600">{inv.invoice_number}</td>
                            <td className="py-3 px-5 text-surface-700">{inv.client_name}</td>
                            <td className="py-3 px-5 text-surface-700/70">
                              {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-3 px-5 text-right text-surface-700">{formatINR(inv.subtotal)}</td>
                            <td className="py-3 px-5 text-right text-primary-600">{formatINR(inv.gst_amount)}</td>
                            <td className="py-3 px-5 text-right font-bold text-surface-900">{formatINR(inv.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
