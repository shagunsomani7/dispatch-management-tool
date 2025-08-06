import React, { useState, useEffect, useCallback } from 'react';
import { SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';
import { Link, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SlabList = () => {
  const location = useLocation();
  const [slabs, setSlabs] = useState<SlabMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSlabs, setTotalSlabs] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('grouped');

  // Preserve scroll position on mount
  useEffect(() => {
    if (location.state?.preserveScroll) {
      window.scrollTo(0, 0);
    }
  }, [location]);

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
        setError(null);
        await apiService.deleteSlab(id);
        alert('Slab deleted successfully');
        loadSlabs(); // Reload the list
      } catch (err) {
        console.error('Error deleting slab:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        if (errorMessage.includes('403')) {
          setError('You do not have permission to delete slabs. Please log in as an admin.');
        } else if (errorMessage.includes('404')) {
          setError('Slab not found. It may have been already deleted.');
        } else {
          setError(`Error deleting slab: ${errorMessage}`);
        }
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
  const generateDispatchReport = async (dispatch: {
    dispatchId: string;
    dispatchTimestamp: Date;
    slabs: SlabMeasurement[];
    totalNetArea: number;
    materialName: string;
    lotNumber: string;
    partyName: string;
    supervisorName: string;
    vehicleNumber: string;
  }) => {
    try {
      // Fetch ALL slabs for this dispatch from the API to avoid pagination issues
      console.log(`Fetching ALL slabs for dispatch ID: ${dispatch.dispatchId}`);
      const dispatchData = await apiService.getSlabsByDispatchId(dispatch.dispatchId);
      
      console.log(`Found ${dispatchData.totalSlabs} total slabs for dispatch ${dispatch.dispatchId}`);
      
      // Use the complete slab data from API
      const allSlabs = dispatchData.slabs;
      const dispatchInfo = dispatchData.dispatchInfo;

      const pdf = new jsPDF('portrait');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = 10;

      const PRIMARY_COLOR: [number, number, number] = [41, 98, 255];
      const TEXT_COLOR_DARK = '#333333';
      const TEXT_COLOR_LIGHT = '#FFFFFF';
      const BORDER_COLOR: [number, number, number] = [180, 180, 180];
      const HEADER_BG: [number, number, number] = [245, 245, 245];
      const SEPARATOR_COLOR: [number, number, number] = [180, 180, 180];

      // Helper functions
      const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const addSpacing = (lines = 1, lineHeight = 5) => {
        yPosition += lines * lineHeight;
      };

      const addSeparator = () => {
        pdf.setDrawColor(SEPARATOR_COLOR[0], SEPARATOR_COLOR[1], SEPARATOR_COLOR[2]);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        addSpacing(1);
      };

      const currentDate = new Date();
      const formattedDate = formatDate(currentDate);

      // Add Header with simplified layout
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      
      // Simple dispatch note header
      pdf.text('DISPATCH NOTE', pageWidth / 2, yPosition, { align: 'center' });
      addSpacing(1);

      // Date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(TEXT_COLOR_DARK);
      pdf.text(`Date: ${formattedDate}`, pageWidth - margin, yPosition, { align: 'right' });
      addSpacing(2);

      // Add first separator
      addSeparator();

      // Add Party and Dispatch Information in a compact format
      const col1X = margin;
      const col2X = margin + (pageWidth - 2 * margin) / 2 + 20;
      const infoY = yPosition;

      // Measured For section with background
      pdf.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
      pdf.rect(col1X - 5, infoY - 5, (pageWidth - 2 * margin) / 2, 25, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('MEASURED FOR:', col1X, infoY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dispatchInfo.partyName || 'N/A', col1X, infoY + 5);
      yPosition = infoY + 12;

      // Material and Vehicle Info
      pdf.setFont('helvetica', 'bold');
      pdf.text('MATERIAL:', col1X, yPosition);
      pdf.text('VEHICLE NO.:', col2X, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dispatchInfo.materialName || 'N/A', col1X + 70, yPosition);
      pdf.text(dispatchInfo.vehicleNumber || 'N/A', col2X + 70, yPosition);
      addSpacing(1);

      // Lot Number and Supervisor
      pdf.setFont('helvetica', 'bold');
      pdf.text('LOT NUMBER (UID):', col1X, yPosition);
      pdf.text('SUPERVISOR:', col2X, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dispatchInfo.lotNumber || 'N/A', col1X + 70, yPosition);
      pdf.text(dispatchInfo.supervisorName || 'N/A', col2X + 70, yPosition);
      addSpacing(2);

      // Add separator before table
      addSeparator();

      // Prepare enhanced table data with corner deductions
      console.log('PDF Debug - All slabs data:', allSlabs);
      console.log('PDF Debug - Dispatch info:', dispatchInfo);
      
      // Extract and normalize slab data for both table and totals
      const slabsWithAreas = allSlabs.map(slab => {
        console.log('PDF Debug - Processing slab:', slab);
        
        const slabNumber = slab.slabNumber || 0;
        const length = slab.length || 0;
        const height = slab.height || 0;
        const grossArea = slab.grossArea || 0;
        const totalDeductionArea = slab.totalDeductionArea || 0;
        const netArea = slab.netArea || 0;
        const corners = slab.cornerDeductions || [];
        
        console.log('PDF Debug - Extracted values:', {
          slabNumber, length, height, grossArea, totalDeductionArea, netArea, corners
        });
        
        return {
          slabNumber,
          length,
          height,
          grossArea,
          totalDeductionArea,
          netArea,
          corners
        };
      });
      
      const tableData = slabsWithAreas.map(slab => {
        // Format deduction dimensions as L×H, filter out empty corners
        const deductionDimensions = slab.corners
          .filter((corner: any) => corner.length > 0 || corner.height > 0)
          .map((corner: any) => {
            // Format dimensions based on measurement unit
            const lengthStr = dispatchInfo.measurementUnit === 'inches' 
              ? Math.round(corner.length || 0).toString()
              : (corner.length || 0).toFixed(2);
            const heightStr = dispatchInfo.measurementUnit === 'inches' 
              ? Math.round(corner.height || 0).toString()
              : (corner.height || 0).toFixed(2);
            return `${lengthStr}×${heightStr}`;
          })
          .join(', ') || 'None';

        // Format main dimensions based on measurement unit
        const lengthStr = dispatchInfo.measurementUnit === 'inches' 
          ? Math.round(slab.length).toString()
          : slab.length.toFixed(2);
        const heightStr = dispatchInfo.measurementUnit === 'inches' 
          ? Math.round(slab.height).toString()
          : slab.height.toFixed(2);

        return [
          slab.slabNumber.toString(),
          `${lengthStr}×${heightStr}`,
          deductionDimensions,
          slab.netArea.toFixed(2)
        ];
      });
      
      console.log('PDF Debug - Table data:', tableData);
      console.log('PDF Debug - slabsWithAreas for totals:', slabsWithAreas);

      const totalTableWidth = 150; // Adjusted width for portrait mode
      const centeredMargin = (pageWidth - totalTableWidth) / 2;

      // Add table using autoTable with enhanced columns
      autoTable(pdf, {
        startY: yPosition,
        head: [[
          'Slab #',
          `Dimensions (${dispatchInfo.measurementUnit})`,
          `Deductions (${dispatchInfo.measurementUnit})`,
          `Net Area (ft²)`
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: PRIMARY_COLOR,
          textColor: TEXT_COLOR_LIGHT,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          halign: 'right',
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' }, // Slab # - reduced from 25
          1: { cellWidth: 40 }, // Dimensions (L×H) - reduced from 45
          2: { cellWidth: 55 }, // Deductions (L×H format) - reduced from 60
          3: { cellWidth: 35 }  // Net Area - reduced from 40
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245] as [number, number, number]
        },
        margin: { top: yPosition, bottom: 20, left: centeredMargin },
        pageBreak: 'auto',
        showFoot: 'lastPage',
        tableWidth: totalTableWidth,
        styles: {
          overflow: 'linebreak',
          cellPadding: 1.5,
          lineWidth: 0.5,
          lineColor: BORDER_COLOR
        },
        didDrawPage: function(data: any) {
          if (data.pageCount > 1) {
            const pageNumber = data.pageNumber || 1;
            const totalPages = data.pageCount || 1;
            pdf.setFontSize(8);
            pdf.text(
              `Page ${pageNumber} of ${totalPages}`,
              pageWidth - margin,
              pageHeight - 10,
              { align: 'right' }
            );
          }
        }
      });

      // Get the final Y position after the table
      let finalY = (pdf as any).lastAutoTable.finalY + 15;

      // Check if we need to add a new page for totals
      const spaceNeededForTotalsAndNotes = 80; // Space needed for totals + notes + signature
      if (finalY + spaceNeededForTotalsAndNotes > pageHeight - margin) {
        pdf.addPage();
        finalY = margin + 20; // Reset Y position on new page
        
        // Add page header on new page
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
        pdf.text('DISPATCH NOTE - SUMMARY', pageWidth / 2, margin + 10, { align: 'center' });
        finalY += 10;
      }

      // Add totals with simplified layout
      const totalNet = slabsWithAreas.reduce((sum, slab) => sum + (slab.netArea || 0), 0);
      
      console.log('PDF Debug - Calculated totals:');
      console.log('totalNet:', totalNet);
      console.log('finalY position:', finalY);
      console.log('PDF Debug - Individual slab values for totals:');
      slabsWithAreas.forEach((slab, index) => {
        console.log(`Slab ${index + 1} totals contribution:`, {
          netArea: slab.netArea
        });
      });

      const totalsXLabel = pageWidth - margin - 150; // Adjusted for portrait mode
      const totalsXValue = pageWidth - margin - 5;

      // Add a separator line before totals
      pdf.setDrawColor(SEPARATOR_COLOR[0], SEPARATOR_COLOR[1], SEPARATOR_COLOR[2]);
      pdf.line(margin, finalY - 5, pageWidth - margin, finalY - 5);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(TEXT_COLOR_DARK);
      pdf.text('Total Slabs Dispatched:', totalsXLabel, finalY);
      pdf.text((slabsWithAreas?.length || 0).toString(), totalsXValue, finalY, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      pdf.text(`TOTAL NET DISPATCHED AREA (ft²):`, totalsXLabel, finalY + 10);
      pdf.text(totalNet.toFixed(2), totalsXValue, finalY + 10, { align: 'right' });

      // Add notes and signature
      const notesY = finalY + 45; // Reduced spacing since we have fewer totals
      const signatureX = pageWidth - margin - 80;

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('Notes:', margin, notesY);
      pdf.setFont('helvetica', 'normal');
      pdf.text('1. All goods received in good condition.', margin, notesY + 5);
      pdf.text('2. Please verify measurements upon receipt.', margin, notesY + 10);

      // Add signature box
      pdf.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
      pdf.line(signatureX, notesY + 15, pageWidth - margin, notesY + 15);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Authorized Signature', signatureX, notesY + 25);

      // Generate filename
      const timestamp = new Date(dispatchInfo.dispatchTimestamp);
      const fileName = `Dispatch_Note_${dispatchInfo.partyName || 'UnknownParty'}_${dispatchInfo.lotNumber || 'NoLot'}_${timestamp.toISOString().split('T')[0]}.pdf`;
      
      pdf.save(fileName);
      
      console.log(`PDF report generated: ${fileName} with ${dispatchData.totalSlabs} slabs`);
      alert(`PDF report generated successfully with ${dispatchData.totalSlabs} slabs!`);
    } catch (error) {
      console.error('Error generating dispatch report:', error);
      alert('Error generating report. Please try again.');
    }
  };

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

    // Sort dispatches by timestamp (newest first)
    const sortedDispatches = Object.values(grouped).sort((a, b) => 
      new Date(b.dispatchTimestamp).getTime() - new Date(a.dispatchTimestamp).getTime()
    );

    // Sort slabs within each dispatch by slab number (ascending)
    return sortedDispatches.map(dispatch => ({
      ...dispatch,
      slabs: dispatch.slabs.sort((a, b) => a.slabNumber - b.slabNumber)
    }));
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
                      <tr key={slab._id} className="border-t">
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
                            onClick={() => handleDelete(slab._id)}
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
                              Dispatch: {dispatch.dispatchId.replace(/^DISPATCH-/, '')}
                            </div>
                            <div className="text-sm text-blue-700">
                              {dispatch.partyName} • {dispatch.materialName} • Lot: {dispatch.lotNumber}
                            </div>
                            <div className="text-sm text-blue-700 mt-1">
                              Thickness: {dispatch.slabs[0]?.thickness} {dispatch.slabs[0]?.measurementUnit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-blue-700">
                              {new Date(dispatch.dispatchTimestamp).toLocaleString()}
                            </div>
                            <div className="text-lg font-semibold text-blue-900">
                              {dispatch.slabs.length} slabs • {dispatch.totalNetArea.toFixed(2)} ft²
                            </div>
                            <button
                              onClick={() => generateDispatchReport(dispatch)}
                              className="mt-2 bg-green-600 text-white text-sm font-medium py-1 px-3 rounded hover:bg-green-700 transition-colors"
                            >
                              Generate Report
                            </button>
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
                              <tr key={slab._id} className="border-t">
                                <td className="px-4 py-2 font-medium">{slab.slabNumber}</td>
                                <td className="px-4 py-2">
                                  {slab.length} × {slab.height} {slab.measurementUnit}
                                </td>
                                <td className="px-4 py-2">
                                  {slab.grossArea.toFixed(2)} ft²
                                </td>
                                <td className="px-4 py-2">
                                  {slab.totalDeductionArea.toFixed(2)} ft²
                                </td>
                                <td className="px-4 py-2 font-semibold text-green-600">
                                  {slab.netArea.toFixed(2)} ft²
                                </td>
                                <td className="px-4 py-2">
                                  <button
                                    onClick={() => handleDelete(slab._id)}
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