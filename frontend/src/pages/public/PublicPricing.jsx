import React from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const PublicPricing = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-400">Start for free, upgrade when you need to.</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm relative">
            <h3 className="text-2xl font-bold mb-2">Starter</h3>
            <p className="text-slate-400 mb-6">Perfect for new freelancers.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold">₹0</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Up to 10 Invoices/month</li>
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> 5 Clients</li>
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Basic Reports</li>
            </ul>
            <Link to="/register" className="block w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-center font-bold transition-colors">
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-900/40 to-slate-900 border border-blue-500/30 backdrop-blur-sm relative shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <div className="absolute top-0 right-8 transform -translate-y-1/2">
              <span className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">Most Popular</span>
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <p className="text-blue-300 mb-6">For growing freelance businesses.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold">₹99</span>
              <span className="text-slate-400">/month</span>
            </div>
            <ul className="space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Unlimited Invoices</li>
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Unlimited Clients</li>
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Advanced Analytics</li>
              <li className="flex items-center gap-3"><span className="text-emerald-500">✓</span> Priority Support</li>
            </ul>
            <Link to="/register" className="block w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-center font-bold transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default PublicPricing;
