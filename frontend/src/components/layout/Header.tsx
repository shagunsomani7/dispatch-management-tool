import React from 'react';
import { useAuth } from '../../App';

interface HeaderProps {
  onHamburgerClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHamburgerClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {/* Hamburger for mobile */}
            {onHamburgerClick && (
              <button
                className="md:hidden mr-3 focus:outline-none"
                onClick={onHamburgerClick}
                aria-label="Open sidebar"
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-2xl font-bold text-gradient">
              Dispatch Measurement
            </h1>
            <span className="ml-3 text-sm text-gray-500">
              Samdani Group ERP
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, {user?.username} ({user?.role})
            </div>
            <button
              onClick={logout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 