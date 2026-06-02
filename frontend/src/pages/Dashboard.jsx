import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import StatsCard from '../components/StatsCard';
import {
  HiOutlineCurrencyRupee,
  HiOutlineDocumentCheck,
  HiOutlineClock,
  HiOutlineExclamationTriangle,
  HiOutlinePlusCircle,
  HiOutlineUserPlus,
  HiOutlineArrowRight,
} from 'react-icons/hi2';

// Format Indian Rupee
const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Status badge component
const StatusBadge = ({ status }) => {
  const cls = {
    paid:    'badge-paid',
    unpaid:  'badge-unpaid',
    overdue: 'badge-overdue',
  };
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${cls[status] || 'badge-unpaid'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        setError('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600">
        {error}
      </div>
    );
  }

  return (
    <div className="fade-in space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-700/60 mt-1">Your business at a glance</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/invoices/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/20"
          >
            <HiOutlinePlusCircle className="w-5 h-5" />
            New Invoice
          </Link>
          <Link
            to="/clients"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-surface-700 text-sm font-medium rounded-xl border border-surface-200 hover:bg-surface-50 transition-colors"
          >
            <HiOutlineUserPlus className="w-5 h-5" />
            Add Client
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Earned"
          value={formatINR(stats.total_earned)}
          icon={HiOutlineCurrencyRupee}
          color="success"
          subtitle={`${stats.total_invoices} total invoices`}
        />
        <StatsCard
          title="Paid Invoices"
          value={stats.paid_count}
          icon={HiOutlineDocumentCheck}
          color="primary"
          subtitle={`${formatINR(stats.total_earned)} collected`}
        />
        <StatsCard
          title="Unpaid"
          value={stats.unpaid_count}
          icon={HiOutlineClock}
          color="warning"
          subtitle="Awaiting payment"
        />
        <StatsCard
          title="Overdue"
          value={stats.overdue_count}
          icon={HiOutlineExclamationTriangle}
          color="danger"
          subtitle="Past due date"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices — 2/3 width */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-900">Recent Invoices</h2>
            <Link
              to="/invoices"
              className="flex items-center gap-1 text-sm text-primary-600 font-medium hover:text-primary-700 transition-colors"
            >
              View all <HiOutlineArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {stats.recent_invoices?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-surface-700/40 text-lg mb-4">No invoices yet</p>
              <Link
                to="/invoices/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors"
              >
                <HiOutlinePlusCircle className="w-5 h-5" />
                Create your first invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider pb-3 whitespace-nowrap">Invoice</th>
                    <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider pb-3 whitespace-nowrap">Client</th>
                    <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider pb-3 whitespace-nowrap">Amount</th>
                    <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider pb-3 whitespace-nowrap">Due Date</th>
                    <th className="text-left text-xs font-semibold text-surface-700/50 uppercase tracking-wider pb-3 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {stats.recent_invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-50/50 transition-colors">
                      <td className="py-3.5 whitespace-nowrap">
                        <Link to={`/invoices/${inv.id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-700">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-3.5 text-sm text-surface-700 whitespace-nowrap">{inv.client_name}</td>
                      <td className="py-3.5 text-sm font-medium text-surface-900 whitespace-nowrap">{formatINR(inv.total_amount)}</td>
                      <td className="py-3.5 text-sm text-surface-700/70 whitespace-nowrap">
                        {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Stats Sidebar — 1/3 width */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-700/60">Total Clients</span>
                <span className="text-sm font-bold text-surface-900">{stats.total_clients}</span>
              </div>
              <div className="h-px bg-surface-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-700/60">Total Invoices</span>
                <span className="text-sm font-bold text-surface-900">{stats.total_invoices}</span>
              </div>
              <div className="h-px bg-surface-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-700/60">Pending Amount</span>
                <span className="text-sm font-bold text-warning-600">{formatINR(stats.total_pending)}</span>
              </div>
              <div className="h-px bg-surface-200" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-surface-700/60">Total Earned</span>
                <span className="text-sm font-bold text-success-600">{formatINR(stats.total_earned)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-surface-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link
                to="/invoices/new"
                className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlinePlusCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">Create Invoice</p>
                  <p className="text-xs text-surface-700/50">Generate a new invoice</p>
                </div>
              </Link>

              <Link
                to="/clients"
                className="flex items-center gap-3 p-3 rounded-xl bg-accent-500/5 hover:bg-accent-500/10 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-accent-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineUserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">Add Client</p>
                  <p className="text-xs text-surface-700/50">Register a new client</p>
                </div>
              </Link>

              <Link
                to="/reports"
                className="flex items-center gap-3 p-3 rounded-xl bg-success-500/5 hover:bg-success-500/10 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-success-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <HiOutlineDocumentCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">View Reports</p>
                  <p className="text-xs text-surface-700/50">Monthly & GST reports</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
