import React, { useState } from 'react';
import { apiService } from '../../services/api';

const DatabaseManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Date range form state
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // Clear success/error messages after 5 seconds
  React.useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const handleClearAll = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL slab measurements from the database. This action cannot be undone. Are you absolutely sure?')) {
      return;
    }

    if (!window.confirm('This is your final confirmation. Click OK to proceed with deleting ALL data.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiService.clearAllSlabs();
      setSuccess('All slab measurements have been cleared successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to clear all slab measurements');
    } finally {
      setLoading(false);
    }
  };

  const handleClearByDateRange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dateRange.startDate || !dateRange.endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    if (new Date(dateRange.startDate) >= new Date(dateRange.endDate)) {
      setError('Start date must be before end date.');
      return;
    }

    const confirmMessage = `⚠️ WARNING: This will permanently delete all slab measurements dispatched between ${dateRange.startDate} and ${dateRange.endDate}. This action cannot be undone. Are you sure?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiService.clearSlabsByDateRange({
        ...dateRange,
        dateField: 'dispatchTimestamp'
      });
      
      if (result.deletedCount === 0) {
        setSuccess('No slab measurements found in the specified date range.');
      } else {
        setSuccess(`Successfully deleted ${result.deletedCount} slab measurements from the specified date range.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to clear slab measurements by date range');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Database Management</h1>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Clear by Date Range */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-400">
          <h2 className="text-lg font-semibold mb-4 text-orange-800">Clear Data by Date Range</h2>
          <p className="text-sm text-gray-600 mb-4">
            Delete slab measurements within a specific dispatch date range. This will remove records based on when they were dispatched.
          </p>
          
          <form onSubmit={handleClearByDateRange}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Data in Date Range'}
            </button>
          </form>
        </div>

        {/* Clear All Data */}
        <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <h2 className="text-lg font-semibold mb-4 text-red-800">Clear All Data</h2>
          <p className="text-sm text-gray-600 mb-4">
            ⚠️ <strong>EXTREME CAUTION:</strong> This will permanently delete ALL slab measurements from the database. 
            This action cannot be undone and will remove all historical data.
          </p>

          <button
            onClick={handleClearAll}
            disabled={loading}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting All Data...' : 'Delete ALL Data'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagement; 