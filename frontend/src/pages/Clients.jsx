import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  HiOutlineUserPlus,
  HiOutlineMagnifyingGlass,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlineXMark,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
} from 'react-icons/hi2';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = add, object = edit
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstin: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Client invoices drawer
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientInvoices, setClientInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get('/clients', { params: search ? { search } : {} });
      setClients(res.data.clients);
    } catch {
      setError('Could not load clients.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300); // debounce search
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Open modal for add/edit
  const openModal = (client = null) => {
    setEditing(client);
    setForm(client ? { name: client.name, email: client.email || '', phone: client.phone || '', address: client.address || '', gstin: client.gstin || '' } : { name: '', email: '', phone: '', address: '', gstin: '' });
    setFormError('');
    setModalOpen(true);
  };

  // Submit add/edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setFormLoading(true);
    setFormError('');
    try {
      if (editing) {
        await api.put(`/clients/${editing.id}`, form);
      } else {
        await api.post('/clients', form);
      }
      setModalOpen(false);
      setLoading(true);
      fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Operation failed.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete client
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/clients/${deleteTarget.id}`);
      setDeleteTarget(null);
      setLoading(true);
      fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not delete client.');
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Fetch invoices for a client
  const viewClientInvoices = async (client) => {
    setSelectedClient(client);
    setInvoicesLoading(true);
    try {
      const res = await api.get(`/clients/${client.id}/invoices`);
      setClientInvoices(res.data.invoices);
    } catch {
      setClientInvoices([]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const formatINR = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const StatusBadge = ({ status }) => {
    const cls = { paid: 'badge-paid', unpaid: 'badge-unpaid', overdue: 'badge-overdue' };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${cls[status] || 'badge-unpaid'}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Clients</h1>
          <p className="text-surface-700/60 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/20 cursor-pointer"
        >
          <HiOutlineUserPlus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-700/40" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setLoading(true); }}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
        />
      </div>

      {error && <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">{error}</div>}
      {formError && !modalOpen && !deleteTarget && <div className="p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">{formError}</div>}

      {/* Client Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-surface-700/40 text-lg mb-4">{search ? 'No clients match your search' : 'No clients yet'}</p>
          {!search && (
            <button onClick={() => openModal()} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors cursor-pointer">
              <HiOutlineUserPlus className="w-5 h-5" /> Add your first client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div key={client.id} className="glass-card p-5 hover:shadow-lg transition-shadow duration-300 group">
              {/* Client Info */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-surface-900 truncate">{client.name}</h3>
                    {client.email && <p className="text-xs text-surface-700/50 truncate">{client.email}</p>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(client)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-700/50 hover:text-primary-600 transition-colors cursor-pointer" title="Edit">
                    <HiOutlinePencilSquare className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(client)} className="p-1.5 rounded-lg hover:bg-red-50 text-surface-700/50 hover:text-danger-600 transition-colors cursor-pointer" title="Delete">
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-1.5 mb-4">
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs text-surface-700/60">
                    <HiOutlinePhone className="w-3.5 h-3.5" /> {client.phone}
                  </div>
                )}
                {client.address && (
                  <div className="flex items-start gap-2 text-xs text-surface-700/60">
                    <HiOutlineMapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{client.address}</span>
                  </div>
                )}
                {client.gstin && (
                  <div className="flex items-center gap-2 text-xs text-surface-700/60">
                    <span className="font-semibold text-[10px] px-1 py-0.5 bg-surface-200 rounded">GST</span>
                    {client.gstin}
                  </div>
                )}
              </div>

              {/* View Invoices */}
              <button
                onClick={() => viewClientInvoices(client)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-100 hover:bg-primary-50 text-xs font-medium text-surface-700/60 hover:text-primary-600 transition-colors cursor-pointer"
              >
                <HiOutlineDocumentText className="w-4 h-4" />
                View Invoices
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---- Add/Edit Modal ---- */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card p-6 slide-up bg-white">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900">{editing ? 'Edit Client' : 'Add Client'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-surface-100 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5 text-surface-700/50" />
              </button>
            </div>

            {formError && <div className="mb-4 p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-600 text-sm">{formError}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Client name"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">GSTIN</label>
                <input type="text" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="e.g. 22AAAAA0000A1Z5" maxLength={15}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm uppercase" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-medium hover:from-primary-700 hover:to-primary-800 transition-all disabled:opacity-60 cursor-pointer">
                  {formLoading ? 'Saving...' : editing ? 'Update' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete Confirmation ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-card p-6 slide-up bg-white text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-danger-500/10 flex items-center justify-center">
              <HiOutlineTrash className="w-6 h-6 text-danger-600" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">Delete Client</h3>
            <p className="text-sm text-surface-700/60 mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-danger-600 text-white text-sm font-medium hover:bg-danger-500 transition-colors disabled:opacity-60 cursor-pointer">
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Client Invoices Drawer ---- */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full bg-white shadow-2xl slide-up overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-surface-900">{selectedClient.name}</h2>
                <p className="text-xs text-surface-700/50">Invoices</p>
              </div>
              <button onClick={() => { setSelectedClient(null); setClientInvoices([]); }} className="p-1.5 rounded-lg hover:bg-surface-100 cursor-pointer">
                <HiOutlineXMark className="w-5 h-5 text-surface-700/50" />
              </button>
            </div>

            <div className="p-6">
              {invoicesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                </div>
              ) : clientInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-surface-700/40 mb-4">No invoices for this client</p>
                  <Link to="/invoices/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm rounded-xl hover:bg-primary-700 transition-colors">
                    Create Invoice
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientInvoices.map((inv) => (
                    <Link key={inv.id} to={`/invoices/${inv.id}`}
                      className="block p-4 rounded-xl border border-surface-200 hover:border-primary-300 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary-600">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center justify-between text-xs text-surface-700/60">
                        <span>Due: {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="font-semibold text-surface-900">{formatINR(inv.total_amount)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
