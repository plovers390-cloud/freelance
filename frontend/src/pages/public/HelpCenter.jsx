import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const HelpCenter = () => {
  const faqs = [
    {
      q: "How do I create my first invoice?",
      a: "Once you log in, click on the 'New Invoice' button on the dashboard. Fill in the client details, add your items, and the system will automatically calculate the GST and totals for you."
    },
    {
      q: "Is my data secure?",
      a: "Yes! We use 256-bit SSL encryption for all data transfers. Your passwords are cryptographically hashed, and we employ strict database security measures to ensure your client data remains private."
    },
    {
      q: "Can I use this for non-GST invoices?",
      a: "Absolutely. While we specialize in GST-compliant formats, you can easily set the tax rate to 0% for non-taxable services or clients."
    },
    {
      q: "How do I upgrade to the Pro plan?",
      a: "Navigate to the 'Settings' or 'Pricing' tab inside your dashboard, and you'll see an option to upgrade your account using our secure Razorpay integration."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold mb-4">Help Center & FAQ</h1>
          <p className="text-slate-400">Find answers to common questions about using our platform.</p>
        </div>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-3">{faq.q}</h3>
              <p className="text-slate-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center p-8 bg-blue-900/20 border border-blue-500/20 rounded-2xl">
          <h3 className="text-2xl font-bold mb-3">Still need help?</h3>
          <p className="text-slate-400 mb-6">Our support team is always ready to assist you.</p>
          <a href="mailto:support@freelance.app" className="inline-block px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">
            Contact Support
          </a>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default HelpCenter;
