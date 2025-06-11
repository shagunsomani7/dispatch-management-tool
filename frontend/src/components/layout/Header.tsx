import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gradient">
              Dispatch Measurement
            </h1>
            <span className="ml-3 text-sm text-gray-500">
              Samdani Group ERP
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Welcome, Supervisor
            </div>
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              S
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 