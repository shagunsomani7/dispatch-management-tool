import React from 'react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Today's Dispatches</h3>
          <p className="text-3xl font-bold text-primary-600">12</p>
          <p className="text-sm text-gray-500">+3 from yesterday</p>
        </div>
        
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Total Area</h3>
          <p className="text-3xl font-bold text-primary-600">1,240</p>
          <p className="text-sm text-gray-500">sq ft today</p>
        </div>
        
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Active Supervisors</h3>
          <p className="text-3xl font-bold text-primary-600">5</p>
          <p className="text-sm text-gray-500">on duty</p>
        </div>
        
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-2">Pending Reports</h3>
          <p className="text-3xl font-bold text-orange-600">2</p>
          <p className="text-sm text-gray-500">to be generated</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Slab #245 measured by John Doe</span>
              <span className="text-xs text-gray-500 ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm">Report generated for Party ABC</span>
              <span className="text-xs text-gray-500 ml-auto">15 min ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-sm">Vehicle #VH123 dispatched</span>
              <span className="text-xs text-gray-500 ml-auto">1 hour ago</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-primary text-left">
              Start New Dispatch Entry
            </button>
            <button className="w-full btn-secondary text-left">
              Generate Today's Report
            </button>
            <button className="w-full btn-secondary text-left">
              View All Measurements
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 