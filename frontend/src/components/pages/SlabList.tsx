import React, { useState, useEffect, useCallback } from 'react';
import { SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';
import { Link } from 'react-router-dom';

const SlabList = () => {
  const [slabs, setSlabs] = useState<SlabMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSlabs, setTotalSlabs] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual');

  const loadSlabs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading slabs from database...');
      
      const response = await apiService.getSlabs({ 
        page: currentPage, 
        limit: 10 
      });
      
      console.log('Slabs loaded successfully:', response);
      setSlabs(response.slabs);
      setTotalPages(response.totalPages);
      setTotalSlabs(response.total);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Error loading slabs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Cannot connect to server. Please ensure the backend is running on http://localhost:5000');
      } else if (errorMessage.includes('500')) {
        setError('Server error. Please check the database connection.');
      } else {
        setError(`Error loading slabs: ${errorMessage}`);
      }
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadSlabs();
  }, [loadSlabs]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this slab?')) {
      try {
        await apiService.deleteSlab(id);
        alert('Slab deleted successfully');
        loadSlabs(); // Reload the list
      } catch (err) {
        alert('Error deleting slab');
        console.error('Error deleting slab:', err);
      }
    }
  };

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to delete ALL slabs from the database? This action cannot be undone.')) {
      try {
        setIsClearing(true);
        setError(null);
        await apiService.clearAllSlabs();
        alert('All data cleared successfully');
        setCurrentPage(1); // Reset to first page
        loadSlabs(); // Reload the list
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Error clearing database: ${errorMessage}`);
        console.error('Error clearing database:', err);
      } finally {
        setIsClearing(false);
      }
    }
  };

  const testConnection = async () => {
    try {
      setError(null);
      console.log('Testing database connection...');
      
      const healthResponse = await apiService.healthCheck();
      console.log('Health check response:', healthResponse);
      
      const connectionStatus = healthResponse.database || 'Unknown';
      const message = `✅ Connection successful!\n\nServer Status: ${healthResponse.status}\nDatabase: ${connectionStatus}\nVersion: ${healthResponse.version}\nTimestamp: ${new Date(healthResponse.timestamp).toLocaleString()}`;
      
      alert(message);
    } catch (err) {
      console.error('Database connection test failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      let detailedError = '';
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        detailedError = '❌ Cannot connect to backend server.\n\nPlease check:\n• Backend server is running on http://localhost:5000\n• No firewall blocking the connection\n• CORS is properly configured';
      } else if (errorMessage.includes('500')) {
        detailedError = '❌ Server error occurred.\n\nPossible issues:\n• Database connection failed\n• MongoDB not running\n• Invalid database credentials';
      } else {
        detailedError = `❌ Connection failed: ${errorMessage}`;
      }
      
      setError(detailedError);
      alert(detailedError);
    }
  };

  // Group slabs by dispatch ID
  const groupSlabsByDispatch = () => {
    const grouped = slabs.reduce((acc, slab) => {
      const dispatchId = slab.dispatchId || 'UNKNOWN';
      if (!acc[dispatchId]) {
        acc[dispatchId] = {
          dispatchId,
          dispatchTimestamp: slab.dispatchTimestamp,
          slabs: [],
          totalNetArea: 0,
          materialName: slab.materialName,
          lotNumber: slab.lotNumber,
          partyName: slab.partyName,
          supervisorName: slab.supervisorName,
          vehicleNumber: slab.dispatchVehicleNumber
        };
      }
      acc[dispatchId].slabs.push(slab);
      acc[dispatchId].totalNetArea += slab.netArea;
      return acc;
    }, {} as Record<string, {
      dispatchId: string;
      dispatchTimestamp: Date;
      slabs: SlabMeasurement[];
      totalNetArea: number;
      materialName: string;
      lotNumber: string;
      partyName: string;
      supervisorName: string;
      vehicleNumber: string;
    }>);

    return Object.values(grouped).sort((a, b) => 
      new Date(b.dispatchTimestamp).getTime() - new Date(a.dispatchTimestamp).getTime()
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="text-center">Loading slabs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
        <button 
          onClick={loadSlabs}
          className="btn-primary mt-4"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slab Database</h1>
          <p className="text-gray-600">View and manage all slab measurements</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Connection Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
          <Link to="/slab-entry" className="btn-primary">
            Add New Slab
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold">
            Database Operations
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">View:</span>
            <button
              onClick={() => setViewMode(viewMode === 'individual' ? 'grouped' : 'individual')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                viewMode === 'individual' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {viewMode === 'individual' ? '📋 Individual Slabs' : '📦 Grouped by Dispatch'}
            </button>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={loadSlabs}
            className="btn-secondary"
          >
            Refresh
          </button>
          <button 
            onClick={testConnection}
            className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-blue-700"
          >
            Test Connection
          </button>
          {totalSlabs > 0 && (
            <button 
              onClick={clearAllData}
              disabled={isClearing}
              className="bg-red-600 text-white font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isClearing ? 'Clearing...' : 'Clear All Data'}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="text-lg font-semibold mb-4">
          Total Slabs in Database: {totalSlabs}
        </div>
        
        {slabs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-6xl font-bold text-gray-300 mb-4">null</div>
            <div className="text-lg">No data found in database</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {viewMode === 'individual' ? (
                // Individual Slabs View
                <table className="min-w-full table-auto">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Dispatch ID</th>
                      <th className="px-4 py-2 text-left">Slab #</th>
                      <th className="px-4 py-2 text-left">Material</th>
                      <th className="px-4 py-2 text-left">Lot Number</th>
                      <th className="px-4 py-2 text-left">Party</th>
                      <th className="px-4 py-2 text-left">Supervisor</th>
                      <th className="px-4 py-2 text-left">Dimensions</th>
                      <th className="px-4 py-2 text-left">Net Area</th>
                      <th className="px-4 py-2 text-left">Dispatch Time</th>
                      <th className="px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slabs.map((slab) => (
                      <tr key={slab.id} className="border-t">
                        <td className="px-4 py-2">
                          <div className="text-sm font-mono text-blue-600">
                            {slab.dispatchId?.split('-')[1] || 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {slab.dispatchId?.split('-').slice(2).join('-') || ''}
                          </div>
                        </td>
                        <td className="px-4 py-2">{slab.slabNumber}</td>
                        <td className="px-4 py-2">{slab.materialName}</td>
                        <td className="px-4 py-2">{slab.lotNumber}</td>
                        <td className="px-4 py-2">{slab.partyName}</td>
                        <td className="px-4 py-2">{slab.supervisorName}</td>
                        <td className="px-4 py-2">
                          {slab.thickness} × {slab.length} × {slab.height} {slab.measurementUnit}
                        </td>
                        <td className="px-4 py-2">
                          {slab.netArea.toFixed(2)} {slab.measurementUnit}²
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-sm">
                            {slab.dispatchTimestamp ? new Date(slab.dispatchTimestamp).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {slab.dispatchTimestamp ? new Date(slab.dispatchTimestamp).toLocaleTimeString() : ''}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleDelete(slab.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                // Grouped by Dispatch View
                <div className="space-y-4">
                  {groupSlabsByDispatch().map((dispatch) => (
                    <div key={dispatch.dispatchId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-blue-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-blue-900">
                              Dispatch: {dispatch.dispatchId.split('-')[1]}
                            </div>
                            <div className="text-sm text-blue-700">
                              {dispatch.partyName} • {dispatch.materialName} • Lot: {dispatch.lotNumber}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-blue-700">
                              {new Date(dispatch.dispatchTimestamp).toLocaleString()}
                            </div>
                            <div className="text-lg font-semibold text-blue-900">
                              {dispatch.slabs.length} slabs • {dispatch.totalNetArea.toFixed(2)} {dispatch.slabs[0]?.measurementUnit}²
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">Slab #</th>
                              <th className="px-4 py-2 text-left">Dimensions</th>
                              <th className="px-4 py-2 text-left">Gross Area</th>
                              <th className="px-4 py-2 text-left">Deductions</th>
                              <th className="px-4 py-2 text-left">Net Area</th>
                              <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dispatch.slabs.map((slab) => (
                              <tr key={slab.id} className="border-t">
                                <td className="px-4 py-2 font-medium">{slab.slabNumber}</td>
                                <td className="px-4 py-2">
                                  {slab.thickness} × {slab.length} × {slab.height} {slab.measurementUnit}
                                </td>
                                <td className="px-4 py-2">
                                  {slab.grossArea.toFixed(2)} {slab.measurementUnit}²
                                </td>
                                <td className="px-4 py-2">
                                  {slab.totalDeductionArea.toFixed(2)} {slab.measurementUnit}²
                                </td>
                                <td className="px-4 py-2 font-semibold text-green-600">
                                  {slab.netArea.toFixed(2)} {slab.measurementUnit}²
                                </td>
                                <td className="px-4 py-2">
                                  <button
                                    onClick={() => handleDelete(slab.id)}
                                    className="text-red-600 hover:text-red-800 text-sm"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SlabList; 