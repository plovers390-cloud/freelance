import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import PublicFooter from '../components/PublicFooter';
import { 
  HiOutlineDocumentText, 
  HiOutlineUserGroup, 
  HiOutlineCurrencyRupee, 
  HiOutlineChartBar 
} from 'react-icons/hi2';

const Landing = () => {
  const images = [
    { src: '/images/freelance1.png', title: 'Dashboard Overview', desc: 'Get a bird\'s eye view of your entire freelance business.' },
    { src: '/images/freelance2.png', title: 'Professional Invoices', desc: 'Generate GST-compliant invoices in seconds.' },
    { src: '/images/freelance3.png', title: 'Client Management', desc: 'Keep track of all your clients and their outstanding balances.' },
    { src: '/images/freelance4.png', title: 'Payment Tracking', desc: 'Monitor your cash flow and never miss a payment.' },
    { src: '/images/freelance5.png', title: 'Smart Analytics', desc: 'Beautiful reports to help you make data-driven decisions.' },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            The Ultimate Tool for Indian Freelancers
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8">
            Manage your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Freelance Business</span> <br className="hidden sm:block"/> with absolute ease.
          </h1>
          
          <p className="mt-4 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Create GST-compliant invoices in seconds, manage clients efficiently, track payments, and grow your independent career without the administrative headache.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg transition-all transform hover:-translate-y-1 hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)]"
            >
              Start for Free
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-white font-semibold text-lg transition-all"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive App Slideshow */}
      <div className="py-24 relative z-10 overflow-hidden bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">See it in Action</h2>
            <p className="text-slate-400 text-lg">Intuitive and beautiful interfaces designed for your productivity.</p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            {/* Slideshow Container */}
            <div className="relative rounded-2xl p-2 sm:p-4 bg-white/5 border border-white/10 shadow-2xl overflow-hidden backdrop-blur-sm group">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none h-[40%] bottom-0 top-auto"></div>
              
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950/50">
                {images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img.src} 
                    alt={img.title}
                    className={`absolute inset-0 w-full h-full object-contain p-2 transition-opacity duration-1000 ease-in-out ${currentSlide === idx ? 'opacity-100 relative z-0' : 'opacity-0 z-[-1]'}`}
                  />
                ))}
              </div>

              {/* Text Overlay overlaying the image */}
              <div className="absolute bottom-6 left-6 right-6 z-20 text-center pointer-events-none">
                <div className="inline-block px-6 py-3 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 shadow-2xl transition-all duration-500">
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">{images[currentSlide].title}</h3>
                  <p className="text-slate-300 text-sm sm:text-base">{images[currentSlide].desc}</p>
                </div>
              </div>

            </div>

            {/* Slide Indicators */}
            <div className="flex justify-center items-center gap-3 mt-8">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-blue-500' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-950/50 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to succeed</h2>
            <p className="text-slate-400 text-lg">Powerful tools designed specifically for independent professionals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HiOutlineDocumentText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">GST Invoicing</h3>
              <p className="text-slate-400 leading-relaxed">
                Generate professional, GST-compliant invoices in seconds. Choose from beautiful templates and impress your clients.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HiOutlineUserGroup className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Client Management</h3>
              <p className="text-slate-400 leading-relaxed">
                Keep all your client details organized in one secure place. Track their invoices and outstanding balances easily.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HiOutlineCurrencyRupee className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Payment Tracking</h3>
              <p className="text-slate-400 leading-relaxed">
                Never lose track of who owes you. Automatically mark invoices as paid and monitor your cash flow in real-time.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HiOutlineChartBar className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Smart Reports</h3>
              <p className="text-slate-400 leading-relaxed">
                Get actionable insights into your revenue, top clients, and overdue payments with beautiful, easy-to-read charts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
            
            <h2 className="text-3xl sm:text-5xl font-bold mb-6 relative z-10">Ready to take control of your business?</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto relative z-10">
              Join thousands of Indian freelancers who are already using our platform to save time and get paid faster.
            </p>
            <Link 
              to="/register" 
              className="inline-block px-10 py-4 rounded-full bg-white text-slate-900 font-bold text-lg hover:bg-slate-100 transition-transform transform hover:scale-105 relative z-10 shadow-xl"
            >
              Create Your Free Account
            </Link>
          </div>
        </div>
      </div>

      {/* Shared Footer & Trust Banner */}
      <PublicFooter />

    </div>
  );
};

export default Landing;
