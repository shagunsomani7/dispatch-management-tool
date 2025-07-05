import React from 'react';
import { useAuth } from '../../App';

interface HeaderProps {
  onHamburgerClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHamburgerClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {/* Mobile-first: Stack elements vertically on very small screens */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          {/* Top row: Logo and hamburger */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Hamburger for mobile */}
              {onHamburgerClick && (
                <button
                  className="mr-3 p-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded sm:hidden"
                  onClick={onHamburgerClick}
                  aria-label="Open sidebar"
                >
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center">
                <h1 className="text-lg font-bold text-gradient sm:text-xl lg:text-2xl">
                  Dispatch Measurement
                </h1>
                <span className="text-xs text-gray-500 sm:ml-3 sm:text-sm">
                  Samdani Group ERP
                </span>
              </div>
            </div>
            
            {/* Mobile logout button (top right) */}
            <button
              onClick={logout}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors sm:hidden"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
          
          {/* Bottom row: User info and desktop logout */}
          <div className="flex items-center justify-between sm:justify-end sm:space-x-4">
            {/* User info */}
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium sm:w-8 sm:h-8">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.username}</span>
                <span className="text-gray-400 ml-1">({user?.role})</span>
              </div>
            </div>
            
            {/* Desktop logout button */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 