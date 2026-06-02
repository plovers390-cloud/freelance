import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';

const Contact = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-slate-400">We'd love to hear from you. Please fill out this form or shoot us an email.</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input type="text" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Enter your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input type="email" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Enter your email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                <textarea rows="4" className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" placeholder="Enter your message"></textarea>
              </div>
              <button type="submit" className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition-colors">
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Details */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <h3 className="text-xl font-bold mb-2">Email Support</h3>
              <p className="text-slate-400 mb-1">For general queries and technical support:</p>
              <a href="mailto:support@freelance.app" className="text-blue-400 hover:text-blue-300 font-medium">support@freelance.app</a>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-2">Business Inquiries</h3>
              <p className="text-slate-400 mb-1">For partnerships and enterprise plans:</p>
              <a href="mailto:business@freelance.app" className="text-blue-400 hover:text-blue-300 font-medium">business@freelance.app</a>
            </div>

            <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
              <h4 className="font-bold text-indigo-400 mb-2">Response Time</h4>
              <p className="text-sm text-slate-300">We aim to respond to all inquiries within 24 hours during standard business days (Monday-Friday, IST).</p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Contact;
