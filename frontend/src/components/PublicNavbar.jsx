import React from 'react';
import { Link } from 'react-router-dom';

const PublicNavbar = () => {
  return (
    <nav className="fixed w-full z-50 top-0 left-0 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-blue-500">Free</span>
              <span className="text-white">lance</span>
            </span>
          </Link>
          
          {/* Nav Links */}
          <div className="flex items-center gap-4">
            <Link 
              to="/login" 
              className="text-slate-300 hover:text-white transition-colors font-medium text-sm sm:text-base"
            >
              Log in
            </Link>
            <Link 
              to="/register" 
              className="px-5 py-2.5 rounded-full bg-white text-slate-900 font-semibold hover:bg-slate-200 transition-all transform hover:scale-105 active:scale-95 text-sm sm:text-base shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
