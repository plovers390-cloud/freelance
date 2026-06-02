import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineDocumentText,
  HiOutlinePlusCircle,
  HiOutlineChartBar,
  HiOutlineCube,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineXMark,
} from 'react-icons/hi2';

const navItems = [
  { to: '/dashboard',    icon: HiOutlineHome,         label: 'Dashboard' },
  { to: '/clients',      icon: HiOutlineUsers,        label: 'Clients' },
  { to: '/invoices',     icon: HiOutlineDocumentText, label: 'Invoices' },
  { to: '/invoices/new', icon: HiOutlinePlusCircle,   label: 'New Invoice' },
  { to: '/reports',      icon: HiOutlineChartBar,     label: 'Reports' },
  { to: '/settings',     icon: HiOutlineCog6Tooth,    label: 'Settings' },
];

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed left-0 top-0 h-screen w-64 bg-surface-950 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0`}
      >
        {/* Brand */}
        <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-primary-400">Free</span>lance
            </h1>
            <p className="text-xs text-surface-200/60 mt-1">Invoice Management</p>
          </div>
          {/* Close button (Mobile only) */}
          <button 
            onClick={closeSidebar}
            className="md:hidden p-2 -mr-2 text-surface-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                    : 'text-surface-200/70 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade Banner (if free plan) */}
        {user?.plan === 'free' && (
          <div className="px-4 py-4 border-t border-white/10">
            <div className="bg-gradient-to-br from-primary-900 to-primary-800 p-4 rounded-xl border border-primary-700/50 shadow-inner">
              <p className="text-xs font-semibold text-white mb-1">Free Plan</p>
              <p className="text-[10px] text-primary-200 mb-3">5 invoices/month</p>
              <button
                onClick={() => { navigate('/pricing'); closeSidebar(); }}
                className="w-full py-1.5 rounded bg-gradient-to-r from-accent-400 to-accent-500 text-white text-xs font-bold shadow-lg hover:from-accent-500 hover:to-accent-600 transition-colors"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        {/* User Info + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden shadow-md flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-surface-200/50 truncate">{user?.email || ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm text-surface-200/70 hover:bg-red-500/15 hover:text-red-400 transition-colors cursor-pointer"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
