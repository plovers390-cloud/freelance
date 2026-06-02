import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 border-b border-white/10 pb-8">
          <h1 className="text-4xl font-extrabold mb-4">Terms and Conditions</h1>
          <p className="text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to Freelance SaaS. By accessing or using our platform, you agree to be bound by these Terms and Conditions. Please read them carefully.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Account Registration</h2>
            <p>
              To use our invoicing and client management features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Acceptable Use</h2>
            <p>
              You agree not to use the platform for any unlawful purpose or in any way that interrupts, damages, or impairs the service. Generating fraudulent invoices or using the service to facilitate illegal transactions is strictly prohibited and will result in immediate account termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Payment and Subscriptions</h2>
            <p>
              Certain features of the platform are provided under a paid subscription model. Payments are processed securely via our third-party payment provider (Razorpay). Subscription fees are billed in advance and are non-refundable except as specified in our Refund Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
            <p>
              Freelance SaaS shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. We do not guarantee that the service will be uninterrupted or error-free.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Terms;
