import React from 'react';
import { Link } from 'react-router-dom';

const PublicFooter = () => {
  return (
    <>
      {/* Trust & Security Banner */}
      <div className="py-16 border-t border-b border-white/5 bg-slate-950 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-white">Your Business is Safe With Us</h3>
              <p className="text-slate-400">Enterprise-grade security built for independent professionals.</p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-6 sm:gap-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div className="text-left text-white">
                  <p className="font-semibold text-sm">256-bit</p>
                  <p className="text-xs text-slate-500">SSL Encryption</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div className="text-left text-white">
                  <p className="font-semibold text-sm">100%</p>
                  <p className="text-xs text-slate-500">Data Privacy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Footer */}
      <footer className="bg-slate-950 pt-16 pb-8 border-t border-white/10 relative z-10 text-white font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand Column */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-white font-bold text-xl">F</span>
                </div>
                <span className="text-2xl font-bold tracking-tight">
                  <span className="text-blue-500">Free</span>
                  <span className="text-white">lance</span>
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed">
                Empowering Indian freelancers with tools to manage invoices, clients, and payments seamlessly.
              </p>
            </div>
            
            {/* Links Column 1 */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link to="/features" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Features</Link></li>
                <li><Link to="/pricing-public" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Pricing</Link></li>
                <li><Link to="/register" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Sign Up Free</Link></li>
              </ul>
            </div>

            {/* Links Column 2 */}
            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-3">
                <li><Link to="/help" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Help Center / FAQ</Link></li>
                <li><Link to="/contact" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Contact Us</Link></li>
                <li><a href="mailto:support@freelance.app" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Email Support</a></li>
              </ul>
            </div>

            {/* Links Column 3 */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><Link to="/terms" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Terms and Conditions</Link></li>
                <li><Link to="/privacy" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Privacy Policy</Link></li>
                <li><Link to="/refund" className="text-slate-400 hover:text-blue-400 text-sm transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()} Freelance SaaS. All rights reserved.
            </p>
            <div className="flex gap-4">
              <span className="text-slate-600 text-sm">Made with ❤️ for Indian Freelancers</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default PublicFooter;
