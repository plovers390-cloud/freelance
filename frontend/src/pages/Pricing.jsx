import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { HiCheck, HiOutlineSparkles } from 'react-icons/hi2';

const Pricing = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // 1. Create plan order
      const { data } = await api.post('/payments/create-plan-order');
      const { order, razorpay_key } = data;

      // 2. Load Razorpay script if not present
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // 3. Open Razorpay checkout
      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: 'Freelance',
        description: 'Upgrade to Pro Plan',
        order_id: order.id,
        handler: async (response) => {
          setLoading(true);
          setError('');
          setSuccess('');

          // Retry logic — verification can fail transiently (QR/UPI flows)
          const maxRetries = 3;
          let lastError = '';

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const verifyRes = await api.post('/payments/verify-plan', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              
              if (verifyRes.data.message) {
                setSuccess('Successfully upgraded to Pro Plan!');
                setUser({ ...user, plan: 'paid' });
                // Also update localStorage so the plan persists on refresh
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
                localStorage.setItem('user', JSON.stringify({ ...storedUser, plan: 'paid' }));
                setTimeout(() => {
                  navigate('/dashboard');
                }, 2000);
                setLoading(false);
                return; // Success — exit retry loop
              }
            } catch (err) {
              lastError = err.response?.data?.error || 'Payment verification failed.';
              console.warn(`Verification attempt ${attempt} failed:`, lastError);
              if (attempt < maxRetries) {
                // Wait before retrying (1s, 2s)
                await new Promise(r => setTimeout(r, attempt * 1000));
              }
            }
          }

          // All retries exhausted
          setError(lastError + ' Payment was received — please contact support if your plan is not upgraded.');
          setLoading(false);
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || '',
        },
        theme: {
          color: '#3b82f6', // primary-500
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed.');
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate checkout.');
      setLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold text-surface-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-surface-700/60 max-w-2xl mx-auto">
          Choose the right plan for your freelance business. Upgrade anytime to unlock unlimited invoices and premium features.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-center max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-8 p-4 bg-success-500/10 border border-success-500/20 rounded-xl text-success-600 text-center max-w-2xl mx-auto font-medium">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white rounded-3xl shadow-xl border border-surface-200 p-8 relative overflow-hidden">
          <h3 className="text-2xl font-bold text-surface-900 mb-2">Basic</h3>
          <p className="text-surface-700/60 mb-6">Perfect for just getting started.</p>
          <div className="mb-8 flex items-baseline">
            <span className="text-5xl font-extrabold text-surface-900">₹0</span>
            <span className="text-xl text-surface-700/50 ml-2">/ forever</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center text-surface-700">
              <HiCheck className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
              <span>Up to <strong>5 invoices</strong> per month</span>
            </li>
            <li className="flex items-center text-surface-700">
              <HiCheck className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
              <span>Basic templates</span>
            </li>
            <li className="flex items-center text-surface-700">
              <HiCheck className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
              <span>Client management</span>
            </li>
            <li className="flex items-center text-surface-700">
              <HiCheck className="w-5 h-5 text-success-500 mr-3 flex-shrink-0" />
              <span>PDF downloads</span>
            </li>
          </ul>

          <button
            disabled
            className="w-full py-3 px-6 rounded-xl font-semibold text-surface-700 bg-surface-100 border border-surface-200 opacity-70"
          >
            {user?.plan === 'free' ? 'Current Plan' : 'Free'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-br from-primary-900 to-primary-800 rounded-3xl shadow-2xl shadow-primary-500/20 border border-primary-700/50 p-8 relative overflow-hidden transform md:-translate-y-4">
          <div className="absolute top-0 right-0 p-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-accent-400 to-accent-500 text-white shadow-lg">
              <HiOutlineSparkles className="w-4 h-4" /> Recommended
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
          <p className="text-primary-200 mb-6">For growing freelance businesses.</p>
          <div className="mb-8 flex items-baseline">
            <span className="text-5xl font-extrabold text-white">₹99</span>
            <span className="text-xl text-primary-300 ml-2">/ month</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center text-primary-100">
              <HiCheck className="w-5 h-5 text-accent-400 mr-3 flex-shrink-0" />
              <span><strong>Unlimited</strong> invoices</span>
            </li>
            <li className="flex items-center text-primary-100">
              <HiCheck className="w-5 h-5 text-accent-400 mr-3 flex-shrink-0" />
              <span>Premium customizable templates</span>
            </li>
            <li className="flex items-center text-primary-100">
              <HiCheck className="w-5 h-5 text-accent-400 mr-3 flex-shrink-0" />
              <span>Unlimited clients</span>
            </li>
            <li className="flex items-center text-primary-100">
              <HiCheck className="w-5 h-5 text-accent-400 mr-3 flex-shrink-0" />
              <span>Payment links (Razorpay integration)</span>
            </li>
            <li className="flex items-center text-primary-100">
              <HiCheck className="w-5 h-5 text-accent-400 mr-3 flex-shrink-0" />
              <span>Priority email support</span>
            </li>
          </ul>

          <button
            onClick={handleUpgrade}
            disabled={loading || user?.plan === 'paid'}
            className="w-full py-3 px-6 rounded-xl font-bold text-primary-900 bg-white hover:bg-primary-50 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />}
            {user?.plan === 'paid' ? 'Active Plan' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
