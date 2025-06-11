import React, { useState, useEffect } from 'react';
import { SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';

const SlabList = () => {
  const [slabs, setSlabs] = useState<SlabMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSlabs, setTotalSlabs] = useState(0);

  useEffect(() => {
    loadSlabs();
  }, [currentPage]);

  const loadSlabs = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSlabs({
        page: currentPage,
        limit: 10
      });
      
      setSlabs(response.slabs);
      setTotalPages(response.totalPages);
      setTotalSlabs(response.total);
      setError(null);
    } catch (err) {
      setError('Failed to load slabs from database');
      console.error('Error loading slabs:', err);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Saved Slabs Database</h1>
        <button 
          onClick={loadSlabs}
          className="btn-secondary"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-lg font-semibold mb-4">
          Total Slabs in Database: {totalSlabs}
        </div>
        
        {slabs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No slabs found in database. Add some measurements to see them here.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Slab #</th>
                    <th className="px-4 py-2 text-left">Material</th>
                    <th className="px-4 py-2 text-left">Lot Number</th>
                    <th className="px-4 py-2 text-left">Party</th>
                    <th className="px-4 py-2 text-left">Supervisor</th>
                    <th className="px-4 py-2 text-left">Dimensions</th>
                    <th className="px-4 py-2 text-left">Net Area</th>
                    <th className="px-4 py-2 text-left">Created</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {slabs.map((slab) => (
                    <tr key={slab.id} className="border-t">
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
                        {new Date(slab.timestamp).toLocaleDateString()}
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