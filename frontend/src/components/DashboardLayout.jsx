import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import { HiOutlineBars3 } from 'react-icons/hi2';

const DashboardLayout = () => {
  const { user, loading, isOnboarded } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isOnboarded) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-surface-50 print:bg-white">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-surface-950 text-white flex items-center justify-between px-4 z-30 border-b border-white/10 print:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary-400">Free</span>lance
          </span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <HiOutlineBars3 className="w-6 h-6" />
        </button>
      </div>

      <div className="print:hidden">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      
      {/* Main content area */}
      <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8 print:ml-0 print:p-0 print:w-full min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
