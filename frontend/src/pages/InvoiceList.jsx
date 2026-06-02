import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  HiOutlineMagnifyingGlass,
  HiOutlinePlusCircle,
  HiOutlineFunnel,
  HiOutlineArrowRight,
} from 'react-icons/hi2';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
];

const StatusBadge = ({ status }) => {
  const cls = { paid: 'badge-paid', unpaid: 'badge-unpaid', overdue: 'badge-overdue' };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cls[status] || 'badge-unpaid'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/invoices', { params });
      setInvoices(res.data.invoices);
    } catch {
      setError('Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchInvoices, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  // Stats from current list
  const paidCount = invoices.filter((i) => i.status === 'paid').length;
  const unpaidCount = invoices.filter((i) => i.status === 'unpaid').length;
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length;

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Invoices</h1>
          <p className="text-surface-700/60 mt-1">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/invoices/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/20"
        >
          <HiOutlinePlusCircle className="w-5 h-5" />
          New Invoice
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-700/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or invoice #..."
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-2">
          <HiOutlineFunnel className="w-4 h-4 text-surface-700/40" />
          {STATUS_FILTERS.map(({ value, label }) => {
            const isActive = statusFilter === value;
            const countMap = { paid: paidCount, unpaid: unpaidCount, overdue: overdueCount };
            return (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-surface-100 text-surface-700/60 hover:bg-surface-200'
                }`}
              >
                {label}
                {value && countMap[value] !== undefined && (
                  <span className={`ml-1.5 ${isActive ? 'text-white/70' : 'text-surface-700/40'}`}>
                    {countMap[value]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-surface-700/40 text-lg mb-4">
            {search || statusFilter ? 'No invoices match your filters' : 'No invoices yet'}
          </p>
          {!search && !statusFilter && (
            <Link to="/invoices/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
              <HiOutlinePlusCircle className="w-5 h-5" /> Create your first invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50/50">
                  <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Invoice #</th>
                  <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Client</th>
                  <th className="text-right text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Amount</th>
                  <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Due Date</th>
                  <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Status</th>
                  <th className="text-right text-xs font-semibold text-surface-700/50 uppercase tracking-wider py-3.5 px-5 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-primary-50/30 transition-colors">
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <p className="text-sm font-medium text-surface-900">{inv.client_name}</p>
                      <p className="text-xs text-surface-700/40">{inv.client_email}</p>
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-surface-900">{formatINR(inv.total_amount)}</p>
                      {parseFloat(inv.gst_amount) > 0 && (
                        <p className="text-[10px] text-surface-700/40">incl. GST {formatINR(inv.gst_amount)}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-sm text-surface-700/70 whitespace-nowrap">
                      {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <Link to={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                        View <HiOutlineArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
