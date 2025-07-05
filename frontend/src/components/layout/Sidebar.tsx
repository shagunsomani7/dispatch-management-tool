import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';

type MenuItem = { path: string; label: string; icon: string };

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  let menuItems: MenuItem[] = [];
  if (user?.role === 'admin') {
    menuItems = [
      { path: '/', label: 'Dashboard', icon: '📊' },
      { path: '/entry', label: 'Slab Entry', icon: '📝' },
      { path: '/slabs', label: 'View Database', icon: '🗄️' },
      { path: '/reports', label: 'Reports', icon: '📈' },
      { path: '/user-management', label: 'User Management', icon: '👤' },
    ];
  } else {
    menuItems = [
      { path: '/entry', label: 'Slab Entry', icon: '📝' },
    ];
  }

  return (
    <aside
      className={
        isMobile
          ? 'fixed left-0 top-0 w-72 sm:w-80 h-full bg-white border-r border-gray-200 z-50 shadow-lg transition-transform duration-200'
          : 'w-64 xl:w-72 bg-white border-r border-gray-200 min-h-screen'
      }
    >
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
          <button
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <nav className={`p-4 ${isMobile ? 'mt-0' : 'mt-8'}`}>
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={isMobile && onClose ? onClose : undefined}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 