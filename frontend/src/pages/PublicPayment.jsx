import { useState, useEffect, Component } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCodeImport from 'react-qr-code';
import api from '../utils/api';
import { HiOutlineShieldCheck, HiOutlineExclamationCircle } from 'react-icons/hi2';

const QRCode = QRCodeImport.default || QRCodeImport;

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}


const PublicPayment = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`/public/invoices/${id}`);
        setInvoice(res.data.invoice);
        setHasLinkedAccount(res.data.hasLinkedAccount);
      } catch (err) {
        setError(err.response?.data?.error || 'Invoice not found.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayNow = async () => {
    if (!hasLinkedAccount) {
      setError('The freelancer has not linked their payment account yet. Please contact them.');
      return;
    }

    setActionLoading(true);
    setError('');
    try {
      const res = await api.post(`/public/payments/create-route-order`, { invoice_id: id });
      const { order, razorpay_key } = res.data;

      const resScript = await loadRazorpayScript();
      if (!resScript) {
        throw new Error('Razorpay SDK failed to load. Check your connection.');
      }

      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: invoice.business_name || invoice.user_name,
        description: `Payment for Invoice #${invoice.invoice_number}`,
        image: invoice.logo_url || null,
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post(`/public/payments/verify-route-order`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setInvoice({ ...invoice, status: 'paid' });
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.error || 'Payment verification failed.');
          }
        },
        prefill: {
          name: invoice.client_name,
          email: invoice.client_email,
        },
        theme: {
          color: '#4F46E5', // primary-600
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed.');
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not initiate payment.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6 fade-in">
        <div className="max-w-md w-full glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-danger-100 text-danger-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <HiOutlineExclamationCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-surface-900">Oops!</h2>
          <p className="text-surface-700">{error}</p>
        </div>
      </div>
    );
  }

  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-surface-50 p-6 flex flex-col items-center justify-center py-12 fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-surface-200">
        
        {/* Header Section */}
        <div className="bg-primary-900 px-8 py-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-700/50 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center">
            {invoice.logo_url && (
              <img src={invoice.logo_url} alt="Logo" className="h-16 w-16 object-contain bg-white rounded-xl p-2 mb-4 shadow-lg" />
            )}
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {invoice.business_name || invoice.user_name}
            </h1>
            <p className="text-primary-100 font-medium tracking-wide mb-3">
              Invoice <span className="font-bold text-white">#{invoice.invoice_number}</span>
            </p>
            {/* Company Details */}
            <div className="text-sm text-primary-200/90 flex flex-col items-center gap-1 max-w-sm text-center">
              {invoice.business_phone && <p>📞 {invoice.business_phone}</p>}
              {invoice.business_address && <p>📍 {invoice.business_address}</p>}
              {invoice.business_gstin && (
                <p className="mt-1.5 px-2.5 py-1 bg-primary-800/60 rounded-lg text-xs font-mono border border-primary-700/50">
                  GSTIN: {invoice.business_gstin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="p-8">
          <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 pb-8 border-b border-surface-100">
            <div className="max-w-xs">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1.5">Billed To</p>
              <p className="text-base font-bold text-surface-900 mb-1">{invoice.client_name}</p>
              <div className="space-y-0.5">
                {invoice.client_email && <p className="text-sm text-surface-600">✉️ {invoice.client_email}</p>}
                {invoice.client_phone && <p className="text-sm text-surface-600">📞 {invoice.client_phone}</p>}
                {invoice.client_address && <p className="text-sm text-surface-600 mt-1.5">📍 {invoice.client_address}</p>}
              </div>
              {invoice.client_gstin && (
                <p className="text-xs font-mono text-surface-500 mt-2 bg-surface-100 inline-block px-2 py-1 rounded-md border border-surface-200">
                  GSTIN: {invoice.client_gstin}
                </p>
              )}
            </div>
            <div className="md:text-right">
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1">Due Date</p>
              <p className="text-base font-bold text-surface-900">{new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="mb-8">
            <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Invoice Items</p>
            <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse min-w-[500px]">
                   <thead className="bg-surface-50 text-xs text-surface-500 uppercase tracking-wider">
                     <tr>
                       <th className="px-4 py-3 font-semibold border-b border-surface-200">Description</th>
                       <th className="px-4 py-3 font-semibold border-b border-surface-200 text-center w-20">Qty</th>
                       <th className="px-4 py-3 font-semibold border-b border-surface-200 text-right w-32">Rate</th>
                       <th className="px-4 py-3 font-semibold border-b border-surface-200 text-right w-32">Amount</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-surface-100 text-sm text-surface-700">
                     {invoice.items && invoice.items.map((item, idx) => (
                       <tr key={idx} className="hover:bg-surface-50 transition-colors">
                         <td className="px-4 py-3">{item.description}</td>
                         <td className="px-4 py-3 text-center">{item.quantity}</td>
                         <td className="px-4 py-3 text-right">₹{Number(item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                         <td className="px-4 py-3 text-right font-medium text-surface-900">₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
            
            {/* Subtotal & Taxes */}
            <div className="flex flex-col items-end gap-1.5 mt-5 text-sm text-surface-600 px-4">
                <div className="flex justify-between w-48">
                    <span>Subtotal:</span>
                    <span className="font-medium text-surface-900">₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(invoice.discount_amount) > 0 && (
                    <div className="flex justify-between w-48 text-success-600">
                        <span>Discount:</span>
                        <span>-₹{Number(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
                {Number(invoice.gst_amount) > 0 && (
                    <div className="flex justify-between w-48">
                        <span>Tax ({invoice.gst_rate}%):</span>
                        <span className="font-medium text-surface-900">₹{Number(invoice.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
                {Number(invoice.shipping_charges) > 0 && (
                    <div className="flex justify-between w-48">
                        <span>Shipping:</span>
                        <span className="font-medium text-surface-900">₹{Number(invoice.shipping_charges).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                )}
            </div>
          </div>

          <div className="bg-surface-50 rounded-2xl p-6 mb-8 border border-surface-100">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-1">Total Amount Due</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-black text-surface-900">
                    ₹{Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </h2>
                </div>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${isPaid ? 'bg-success-100 text-success-700 border border-success-200' : 'bg-warning-100 text-warning-700 border border-warning-200'}`}>
                {isPaid ? 'Paid' : 'Unpaid'}
              </div>
            </div>
          </div>

          {error && !isPaid && (
            <div className="mb-6 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Action Area */}
          <div className="text-center">
            {isPaid ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 bg-success-50 rounded-2xl border border-success-100">
                <div className="w-16 h-16 bg-success-100 text-success-600 rounded-full flex items-center justify-center mb-4">
                  <HiOutlineShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-success-900 mb-1">Payment Successful!</h3>
                <p className="text-success-700">This invoice has been paid. Thank you!</p>
              </div>
            ) : (
              <>
                <button
                  onClick={handlePayNow}
                  disabled={actionLoading || !hasLinkedAccount}
                  className="w-full md:w-auto min-w-[240px] px-8 py-4 bg-primary-600 text-white font-bold rounded-2xl text-lg hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/30 hover:shadow-xl hover:shadow-primary-600/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:-translate-y-0 disabled:hover:shadow-lg flex items-center justify-center gap-3 mx-auto"
                >
                  {actionLoading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <HiOutlineShieldCheck className="w-6 h-6" /> Pay Securely via Razorpay
                    </>
                  )}
                </button>
                {!hasLinkedAccount && (
                  <p className="mt-3 text-xs text-danger-600 font-medium text-center">
                    The freelancer has not linked their payment account yet.<br/>Online payments are temporarily disabled.
                  </p>
                )}
                
                {/* UPI Section */}
                {invoice.upi_id && (
                  <div className="mt-8 pt-8 border-t border-surface-200">
                    <p className="text-sm font-bold text-surface-900 mb-4 uppercase tracking-wider">Or Pay Directly via UPI</p>
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6 bg-surface-50 p-6 rounded-2xl border border-surface-200">
                      <div className="bg-white p-2 rounded-xl shadow-sm border border-surface-200">
                        <QRCode
                          value={`upi://pay?pa=${invoice.upi_id}&pn=${encodeURIComponent(invoice.business_name || invoice.user_name)}&am=${invoice.total_amount}&cu=INR`}
                          size={120}
                          level="M"
                        />
                      </div>
                      <div className="text-center md:text-left">
                        <p className="text-xs text-surface-700/60 mb-1">Scan with any UPI App</p>
                        <div className="flex items-center gap-2 justify-center md:justify-start mt-2">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-6" />
                        </div>
                        <div className="mt-4">
                          <p className="text-[10px] text-surface-700/50 uppercase font-bold tracking-wider mb-0.5">UPI ID (Number Pay)</p>
                          <p className="font-mono text-sm font-semibold text-surface-900 bg-surface-200/50 px-3 py-1.5 rounded-lg inline-block border border-surface-200">
                            {invoice.upi_id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-center gap-2 text-surface-500 text-xs">
                  <HiOutlineShieldCheck className="w-4 h-4" /> 256-bit Secure Encrypted Payment
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      <div className="mt-10 text-center flex flex-col items-center gap-1 text-surface-400">
        <p className="text-xs font-medium tracking-wide">Powered by</p>
        <div className="flex items-center gap-1.5 opacity-80 mix-blend-luminosity">
          <div className="w-5 h-5 rounded bg-primary-600 flex items-center justify-center text-white font-bold text-[10px]">F</div>
          <span className="font-bold text-surface-600 tracking-tight">Freelance</span>
        </div>
      </div>
    </div>
  );
};

export default function PublicPaymentWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <PublicPayment />
    </ErrorBoundary>
  );
}
