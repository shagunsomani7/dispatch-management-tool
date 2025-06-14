import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';

type MenuItem = { path: string; label: string; icon: string };

const Sidebar = () => {
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
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="p-4">
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