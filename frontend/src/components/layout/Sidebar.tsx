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
          ? 'fixed left-0 top-0 w-64 h-full bg-white border-r border-gray-200 z-50 shadow-lg transition-transform duration-200'
          : 'w-64 bg-white border-r border-gray-200 min-h-screen'
      }
    >
      {isMobile && (
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-2xl"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          &times;
        </button>
      )}
      <nav className="p-4 mt-8">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-primary-100 text-primary-700'
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