import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { getThemeById, getStoredPrefs } from '../utils/invoiceTemplates';
import InvoicePreview from '../components/InvoicePreview';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlineArrowLeft,
  HiOutlineArrowDownTray,
  HiOutlineCurrencyRupee,
  HiOutlineCheckCircle,
  HiOutlineEnvelope,
  HiOutlineDocumentText,
  HiOutlineShare,
  HiOutlineTrash,
} from 'react-icons/hi2';

const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StatusBadge = ({ status }) => {
  const cls = { paid: 'badge-paid', unpaid: 'badge-unpaid', overdue: 'badge-overdue' };
  return (
    <span className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${cls[status] || 'badge-unpaid'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [actionLoading, setActionLoading] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`/invoices/${id}`);
        setInvoice(res.data.invoice);
      } catch (err) {
        setError(err.response?.data?.error || 'Invoice not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  // Download PDF exactly as rendered using browser's native print-to-PDF
  const handleDownloadPDF = () => {
    window.print();
  };

  // Share link natively or copy to clipboard
  const handleShareLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/pay/${id}`;
      if (navigator.share) {
        await navigator.share({
          title: `Invoice ${invoice?.invoice_number}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setActionMsg('Invoice link copied to clipboard!');
        setTimeout(() => setActionMsg(''), 3000);
      }
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  // Create custom payment link
  const handleCreatePaymentLink = async () => {
    setActionLoading('payment');
    setActionMsg('');
    setPaymentLink('');
    
    // Check if the user has linked a payment method
    if (!user?.razorpay_account_id && !user?.upi_id) {
      setActionMsg('Please add your Razorpay Account ID or UPI ID in Settings to generate payment links.');
      setActionLoading('');
      return;
    }

    try {
      // Simulate slight delay for UX
      await new Promise(resolve => setTimeout(resolve, 600));
      const customLink = `${window.location.origin}/pay/${id}`;
      setPaymentLink(customLink);
    } catch (err) {
      setActionMsg('Could not create payment link.');
    } finally {
      setActionLoading('');
    }
  };

  // Mark as paid manually
  const handleMarkPaid = async () => {
    setActionLoading('markpaid');
    setActionMsg('');
    try {
      await api.put(`/invoices/${id}/status`, { status: 'paid' });
      setInvoice({ ...invoice, status: 'paid' });
      setActionMsg('Invoice marked as paid!');
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not update status.');
    } finally {
      setActionLoading('');
    }
  };

  // Delete invoice
  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    setActionLoading('delete');
    setActionMsg('');
    try {
      await api.delete(`/invoices/${id}`);
      navigate('/invoices', { replace: true });
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Could not delete invoice.');
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fade-in space-y-4">
        <div className="p-6 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600">{error}</div>
        <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700">
          <HiOutlineArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
      </div>
    );
  }

  const inv = invoice;
  const items = inv.items || [];
  const subtotal = parseFloat(inv.subtotal) || 0;
  const discountAmount = parseFloat(inv.discount_amount) || 0;
  const discountType = inv.discount_type || 'flat';
  const discountValue = parseFloat(inv.discount_value) || 0;
  const shippingCharges = parseFloat(inv.shipping_charges) || 0;
  const gstAmount = parseFloat(inv.gst_amount) || 0;
  const total = parseFloat(inv.total_amount) || 0;

  // Get theme colors for this invoice
  const storedPrefs = getStoredPrefs();
  const themeId = inv.theme_id || storedPrefs.themeId || 'ocean-blue';
  const theme = getThemeById(themeId);
  const colors = theme.colors;

  return (
    <div className="fade-in space-y-6">
      {/* Back button + Header */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
            <HiOutlineArrowLeft className="w-5 h-5 text-surface-700/60" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-surface-900">{inv.invoice_number}</h1>
              <StatusBadge status={inv.status} />
            </div>
            <p className="text-surface-700/60 mt-0.5 text-sm">
              Created {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={user?.plan !== 'paid' ? () => setShowUpgradeModal(true) : handleShareLink}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-surface-700 text-sm font-medium rounded-xl border border-surface-200 hover:bg-surface-50 transition-colors cursor-pointer"
          >
            <HiOutlineShare className="w-5 h-5" />
            Share
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={actionLoading === 'pdf'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-surface-700 text-sm font-medium rounded-xl border border-surface-200 hover:bg-surface-50 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {actionLoading === 'pdf' ? (
              <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
            ) : (
              <HiOutlineArrowDownTray className="w-5 h-5" />
            )}
            Download PDF
          </button>

          {inv.status !== 'paid' && (
            <>
              <button
                onClick={user?.plan !== 'paid' ? () => setShowUpgradeModal(true) : handleCreatePaymentLink}
                disabled={actionLoading === 'payment'}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-medium rounded-xl hover:from-accent-600 hover:to-accent-600 transition-all shadow-lg shadow-accent-500/20 disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'payment' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlineCurrencyRupee className="w-5 h-5" />
                )}
                Payment Link
              </button>

              <button
                onClick={handleMarkPaid}
                disabled={actionLoading === 'markpaid'}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-success-500 to-success-600 text-white text-sm font-medium rounded-xl hover:from-success-600 hover:to-success-600 transition-all shadow-lg shadow-success-500/20 disabled:opacity-60 cursor-pointer"
              >
                {actionLoading === 'markpaid' ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <HiOutlineCheckCircle className="w-5 h-5" />
                )}
                Mark Paid
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className={`p-4 rounded-xl text-sm print:hidden ${actionMsg.includes('!') ? 'bg-success-500/10 border border-success-500/20 text-success-600' : 'bg-danger-500/10 border border-danger-500/20 text-danger-600'}`}>
          {actionMsg}
        </div>
      )}

      {/* Shareable Payment Link */}
      {paymentLink && (
        <div className="p-5 rounded-xl border border-primary-200 bg-primary-50 flex flex-col md:flex-row items-center justify-between gap-4 print:hidden fade-in">
          <div>
            <h4 className="text-sm font-bold text-primary-900 mb-1">Payment Link Generated!</h4>
            <p className="text-xs text-primary-700">Share this secure link with your client to receive payment instantly via Razorpay.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input type="text" readOnly value={paymentLink} className="px-3 py-2 rounded-lg border border-primary-200 bg-white text-xs w-full md:w-64 text-surface-700 focus:outline-none" onClick={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard.writeText(paymentLink)} className="px-4 py-2 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap cursor-pointer shadow-sm">
              Copy Link
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Here is the secure payment link for Invoice #${inv.invoice_number}:\n\n${paymentLink}`)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#25D366] text-white text-xs font-semibold rounded-lg hover:bg-[#20bd5a] transition-colors whitespace-nowrap cursor-pointer shadow-sm">
              WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Content: Invoice + Client Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block print:w-full">
        {/* Invoice Card — 2/3 */}
        <div className="lg:col-span-2 print:col-span-full print:w-full">
          <div id="invoice-print-area">
            <InvoicePreview
              client={{
                name: inv.client_name,
                address: inv.client_address,
                email: inv.client_email,
                phone: inv.client_phone,
                gstin: inv.client_gstin
              }}
              items={items}
              gstRate={inv.gst_rate}
              dueDate={inv.due_date}
              notes={inv.notes}
              termsConditions={inv.terms_conditions}
              discountType={inv.discount_type}
              discountValue={inv.discount_value}
              shippingCharges={inv.shipping_charges}
              templateId={inv.template_id}
              themeId={inv.theme_id}
              createdDate={inv.created_at}
              invoiceNumber={inv.invoice_number}
              userOverride={{
                business_name: inv.business_name,
                business_address: inv.business_address,
                gstin: inv.business_gstin || inv.gstin,
                phone: inv.business_phone,
                logo_url: inv.logo_url,
                signature_url: inv.signature_url,
                upi_id: inv.upi_id
              }}
            />
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-6 print:hidden">
          {/* Client Card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Client</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold">
                {inv.client_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-surface-900">{inv.client_name}</p>
                {inv.client_email && <p className="text-xs text-surface-700/50">{inv.client_email}</p>}
              </div>
            </div>
            {inv.client_phone && (
              <p className="text-xs text-surface-700/60 mb-1">📞 {inv.client_phone}</p>
            )}
            {inv.client_address && (
              <p className="text-xs text-surface-700/60">📍 {inv.client_address}</p>
            )}
          </div>

          {/* Payment Info */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Payment Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-700/60">Amount Due</span>
                <span className="font-bold text-surface-900">{inv.status === 'paid' ? formatINR(0) : formatINR(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-700/60">Due Date</span>
                <span className="font-medium text-surface-900">
                  {new Date(inv.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-700/60">Status</span>
                <StatusBadge status={inv.status} />
              </div>
            </div>
          </div>

          {/* Actions card */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Actions</h3>
            <div className="space-y-2">
              <button
                onClick={user?.plan !== 'paid' ? () => setShowUpgradeModal(true) : handleShareLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-primary-50 text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors cursor-pointer"
              >
                <HiOutlineShare className="w-5 h-5" /> Share Invoice
              </button>
              <button
                onClick={handleDownloadPDF}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-primary-50 text-sm font-medium text-surface-700 hover:text-primary-600 transition-colors cursor-pointer"
              >
                <HiOutlineArrowDownTray className="w-5 h-5" /> Download PDF
              </button>
              {inv.status !== 'paid' && (
                <>
                  <button
                    onClick={user?.plan !== 'paid' ? () => setShowUpgradeModal(true) : handleCreatePaymentLink}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-accent-50 text-sm font-medium text-surface-700 hover:text-accent-600 transition-colors cursor-pointer"
                  >
                    <HiOutlineCurrencyRupee className="w-5 h-5" /> Create Payment Link
                  </button>
                  <button
                    onClick={handleMarkPaid}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-green-50 text-sm font-medium text-surface-700 hover:text-success-600 transition-colors cursor-pointer"
                  >
                    <HiOutlineCheckCircle className="w-5 h-5" /> Mark as Paid
                  </button>
                </>
              )}
              <div className="pt-2 mt-2 border-t border-surface-200">
                <button
                  onClick={handleDelete}
                  disabled={actionLoading === 'delete'}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-100 hover:bg-danger-50 text-sm font-medium text-surface-700 hover:text-danger-600 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {actionLoading === 'delete' ? (
                    <span className="w-4 h-4 border-2 border-danger-300 border-t-danger-600 rounded-full animate-spin" />
                  ) : (
                    <HiOutlineTrash className="w-5 h-5" />
                  )}
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative fade-in">
            <h3 className="text-xl font-bold text-surface-900 mb-2">Premium Feature</h3>
            <p className="text-surface-700 mb-6">
              Upgrade your plan to share invoices instantly and generate Razorpay payment links for your clients.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-5 py-2 rounded-xl text-sm font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/25 transition-all cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative fade-in">
            <h3 className="text-xl font-bold text-surface-900 mb-2">Delete Invoice</h3>
            <p className="text-surface-700 mb-6">
              Are you sure you want to delete this invoice? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2 rounded-xl text-sm font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-danger-600 hover:bg-danger-700 shadow-lg shadow-danger-500/25 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
