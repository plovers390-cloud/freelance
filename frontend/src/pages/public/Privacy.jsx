import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 border-b border-white/10 pb-8">
          <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-slate-400">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 space-y-6">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
            <p>
              We collect information you provide directly to us when you register for an account, create an invoice, or communicate with us. This may include your name, email address, phone number, GSTIN, and your clients' details as entered by you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to operate, maintain, and improve our services. Specifically, your data is used to generate invoices, send payment reminders (if enabled), and provide customer support.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Data Security</h2>
            <p>
              We implement industry-standard security measures, including 256-bit SSL encryption, to protect your personal information and business data. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Sharing of Information</h2>
            <p>
              We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you (e.g., payment gateways), so long as those parties agree to keep this information confidential.
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Privacy;
