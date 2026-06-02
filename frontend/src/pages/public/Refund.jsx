import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const Refund = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 border-b border-white/10 pb-8">
          <h1 className="text-4xl font-extrabold mb-4">Refund Policy</h1>
          <p className="text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Subscription Cancellations</h2>
            <p>
              You can cancel your subscription at any time. Once cancelled, you will continue to have access to the Pro features until the end of your current billing cycle. We do not provide prorated refunds for mid-cycle cancellations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Refund Eligibility</h2>
            <p>
              If you are dissatisfied with our service, you may request a full refund within the first 7 days of your initial subscription purchase. Refund requests made after this 7-day period will not be honored.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How to Request a Refund</h2>
            <p>
              To request a refund within the eligible period, please contact our support team at <a href="mailto:support@freelance.app" className="text-blue-400 hover:underline">support@freelance.app</a> with your account details and reason for the request.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Refund;
