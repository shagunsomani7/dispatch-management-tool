import React, { useState, useEffect } from 'react';
import { ReportFilters, SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportData {
  summary: {
    totalSlabs: number;
    totalArea: number;
    averageAreaPerSlab: number;
  };
  partyBreakdown: Array<{
    _id: string;
    count: number;
    totalArea: number;
  }>;
  materialBreakdown: Array<{
    _id: string;
    count: number;
    totalArea: number;
  }>;
  supervisorPerformance: Array<{
    _id: string;
    count: number;
    totalArea: number;
  }>;
}

interface DailyReportData {
  summary: {
    date: string;
    totalSlabs: number;
    totalArea: number;
    parties: number;
    supervisors: number;
    totalDispatches: number;
  };
  slabs: SlabMeasurement[];
  dispatches: DispatchSummary[];
}

interface DispatchSummary {
  dispatchId: string;
  dispatchTime: string;
  lotNumber: string;
  partyName: string;
  vehicleNumber: string;
  supervisorName: string;
  slabCount: number;
  totalArea: number;
  materialBreakdown: { [material: string]: { count: number; area: number } };
}

const Reports = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedReport, setSelectedReport] = useState('daily');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [dailyReportData, setDailyReportData] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [supervisors, setSupervisors] = useState<string[]>([]);

  const reportTypes = [
    { id: 'daily', label: 'Daily Summary', description: 'Today\'s dispatch summary' },
    { id: 'party', label: 'Party-wise', description: 'Reports grouped by party' },
    { id: 'material', label: 'Material-wise', description: 'Reports grouped by material' },
    { id: 'supervisor', label: 'Supervisor Performance', description: 'Supervisor-wise analysis' },
    { id: 'weekly', label: 'Weekly Analysis', description: 'Week-over-week comparison' },
    { id: 'monthly', label: 'Monthly Analysis', description: 'Monthly trends and totals' }
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
    generateReport(); // Load default report
  }, []);

  // Regenerate report when report type changes
  useEffect(() => {
    if (parties.length > 0) { // Only generate if initial data is loaded
      generateReport();
    }
  }, [selectedReport]);

  const loadInitialData = async () => {
    try {
      const [partiesData, slabsData] = await Promise.all([
        apiService.getParties(''),
        apiService.getSlabs({})
      ]);
      
      setParties(partiesData.map((p: any) => p.name));
      
      // Extract unique materials and supervisors from slabs
      const uniqueMaterials = [...new Set(slabsData.slabs.map((s: SlabMeasurement) => s.materialName))];
      const uniqueSupervisors = [...new Set(slabsData.slabs.map((s: SlabMeasurement) => s.supervisorName))];
      
      setMaterials(uniqueMaterials);
      setSupervisors(uniqueSupervisors);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to group slabs by dispatch and create dispatch summaries
  const groupSlabsByDispatch = (slabs: SlabMeasurement[]): DispatchSummary[] => {
    const dispatchGroups: { [key: string]: SlabMeasurement[] } = {};
    
    // Group slabs by dispatchId
    slabs.forEach(slab => {
      const dispatchKey = slab.dispatchId || `${slab.lotNumber}-${slab.partyName}`;
      if (!dispatchGroups[dispatchKey]) {
        dispatchGroups[dispatchKey] = [];
      }
      dispatchGroups[dispatchKey].push(slab);
    });

    // Create dispatch summaries
    const dispatches: DispatchSummary[] = Object.entries(dispatchGroups).map(([dispatchKey, slabGroup]) => {
      const firstSlab = slabGroup[0];
      const materialBreakdown: { [material: string]: { count: number; area: number } } = {};
      
      // Calculate material breakdown for this dispatch
      slabGroup.forEach(slab => {
        if (!materialBreakdown[slab.materialName]) {
          materialBreakdown[slab.materialName] = { count: 0, area: 0 };
        }
        materialBreakdown[slab.materialName].count++;
        materialBreakdown[slab.materialName].area += slab.netArea;
      });

      return {
        dispatchId: firstSlab.dispatchId || dispatchKey,
        dispatchTime: firstSlab.dispatchTimestamp 
          ? new Date(firstSlab.dispatchTimestamp).toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            })
          : new Date(firstSlab.timestamp).toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
        lotNumber: firstSlab.lotNumber,
        partyName: firstSlab.partyName,
        vehicleNumber: firstSlab.dispatchVehicleNumber || 'Not specified',
        supervisorName: firstSlab.supervisorName,
        slabCount: slabGroup.length,
        totalArea: slabGroup.reduce((sum, slab) => sum + slab.netArea, 0),
        materialBreakdown
      };
    });

    // Sort by dispatch time in descending order (newest first)
    return dispatches.sort((a, b) => {
      const timeA = a.dispatchTime;
      const timeB = b.dispatchTime;
      return timeB.localeCompare(timeA);
    });
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      if (selectedReport === 'daily') {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const startRange = new Date(today);
        startRange.setDate(today.getDate() - 15);
        const endRange = new Date(today);
        endRange.setDate(today.getDate() + 15);
        // Fetch slabs for a wide date range
        const slabsData = await apiService.getSlabs({
          startDate: startRange.toISOString().split('T')[0],
          endDate: endRange.toISOString().split('T')[0],
          limit: 1000
        });
        // Filter slabs by dispatchTimestamp (date only, ignore time)
        const slabsToday = slabsData.slabs.filter((slab: SlabMeasurement) => {
          if (!slab.dispatchTimestamp) return false;
          const dispatchDate = new Date(slab.dispatchTimestamp);
          return (
            dispatchDate.getFullYear() === today.getFullYear() &&
            dispatchDate.getMonth() === today.getMonth() &&
            dispatchDate.getDate() === today.getDate()
          );
        });
        // Process slabs into dispatch summaries
        const dispatches = groupSlabsByDispatch(slabsToday);
        // Update summary to include dispatch count
        const enhancedData = {
          summary: {
            date: todayStr,
            totalSlabs: slabsToday.length,
            totalArea: slabsToday.reduce((sum, s) => sum + s.netArea, 0),
            parties: [...new Set(slabsToday.map(s => s.partyName))].length,
            supervisors: [...new Set(slabsToday.map(s => s.supervisorName))].length,
            totalDispatches: dispatches.length
          },
          slabs: slabsToday,
          dispatches
        };
        setDailyReportData(enhancedData);
        setReportData(null); // Clear analytics data when switching to daily
      } else {
        // Prepare filters based on report type
        let reportFilters = { ...filters };
        
        switch (selectedReport) {
          case 'party':
            // Party-wise report - no additional filters needed, just group by party
            break;
            
          case 'material':
            // Material-wise report - no additional filters needed, just group by material
            break;
            
          case 'supervisor':
            // Supervisor performance report - no additional filters needed, just group by supervisor
            break;
            
          case 'weekly':
            // Weekly report - set date range to last 7 days if not specified
            if (!reportFilters.startDate) {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              reportFilters.startDate = weekAgo;
            }
            if (!reportFilters.endDate) {
              reportFilters.endDate = new Date();
            }
            break;
            
          case 'monthly':
            // Monthly report - set date range to last 30 days if not specified
            if (!reportFilters.startDate) {
              const monthAgo = new Date();
              monthAgo.setDate(monthAgo.getDate() - 30);
              reportFilters.startDate = monthAgo;
            }
            if (!reportFilters.endDate) {
              reportFilters.endDate = new Date();
            }
            break;
        }
        
        const data = await apiService.getAnalytics(reportFilters);
        setReportData(data);
        setDailyReportData(null); // Clear daily data when switching to analytics
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!reportData && !dailyReportData) {
      alert('Please generate a report first');
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SAMDANI GROUP - DISPATCH REPORT', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Report Type: ${reportTypes.find(t => t.id === selectedReport)?.label}`, 20, yPosition);
    yPosition += 10;
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 20;

    if (selectedReport === 'daily' && dailyReportData) {
      // Daily report
      pdf.setFont('helvetica', 'bold');
      pdf.text('Daily Summary', 20, yPosition);
      yPosition += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Date: ${dailyReportData.summary.date}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Dispatches: ${dailyReportData.summary.totalDispatches}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Slabs: ${dailyReportData.summary.totalSlabs}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Area: ${dailyReportData.summary.totalArea.toFixed(2)} sq ft`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Parties: ${dailyReportData.summary.parties}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Supervisors: ${dailyReportData.summary.supervisors}`, 20, yPosition);
      yPosition += 20;

      // Table of dispatches
      if (dailyReportData.dispatches && dailyReportData.dispatches.length > 0) {
        const tableData = dailyReportData.dispatches.map(dispatch => [
          dispatch.dispatchTime,
          dispatch.lotNumber,
          dispatch.partyName,
          dispatch.vehicleNumber,
          dispatch.slabCount.toString(),
          dispatch.totalArea.toFixed(2),
          Object.keys(dispatch.materialBreakdown).join(', ')
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Time', 'Lot #', 'Party', 'Vehicle', 'Slabs', 'Area (sq ft)', 'Materials']],
          body: tableData,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 25 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25 },
            4: { cellWidth: 15 },
            5: { cellWidth: 25 },
            6: { cellWidth: 40 }
          }
        });
      }
    } else if (reportData) {
      // Analytics report
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', 20, yPosition);
      yPosition += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Slabs: ${reportData.summary.totalSlabs}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Total Area: ${reportData.summary.totalArea.toFixed(2)} sq ft`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Average Area per Slab: ${reportData.summary.averageAreaPerSlab.toFixed(2)} sq ft`, 20, yPosition);
      yPosition += 20;

      // Add period info for weekly/monthly reports
      if (selectedReport === 'weekly' || selectedReport === 'monthly') {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Period: ${selectedReport === 'weekly' ? 'Last 7 days' : 'Last 30 days'}`, 20, yPosition);
        yPosition += 8;
        pdf.text(`Average per day: ${(reportData.summary.totalArea / (selectedReport === 'weekly' ? 7 : 30)).toFixed(2)} sq ft`, 20, yPosition);
        yPosition += 15;
      }

      // Party breakdown - show based on report type
      if ((selectedReport === 'party' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.partyBreakdown.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(selectedReport === 'party' ? 'Party-wise Analysis' : 'Party Breakdown', 20, yPosition);
        yPosition += 10;

        const partyTableData = reportData.partyBreakdown.map(party => [
          party._id,
          party.count.toString(),
          party.totalArea.toFixed(2),
          (party.totalArea / party.count).toFixed(2)
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Party Name', 'Slabs', 'Total Area (sq ft)', 'Avg per Slab']],
          body: partyTableData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Material breakdown
      if ((selectedReport === 'material' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.materialBreakdown.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(selectedReport === 'material' ? 'Material-wise Analysis' : 'Material Breakdown', 20, yPosition);
        yPosition += 10;

        const materialTableData = reportData.materialBreakdown.map(material => [
          material._id,
          material.count.toString(),
          material.totalArea.toFixed(2),
          (material.totalArea / material.count).toFixed(2)
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Material Name', 'Slabs', 'Total Area (sq ft)', 'Avg per Slab']],
          body: materialTableData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 15;
      }

      // Supervisor performance
      if ((selectedReport === 'supervisor' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.supervisorPerformance.length > 0) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(selectedReport === 'supervisor' ? 'Supervisor Performance Analysis' : 'Supervisor Performance', 20, yPosition);
        yPosition += 10;

        const supervisorTableData = reportData.supervisorPerformance
          .sort((a, b) => b.totalArea - a.totalArea)
          .map((supervisor, index) => [
            supervisor._id,
            supervisor.count.toString(),
            supervisor.totalArea.toFixed(2),
            (supervisor.totalArea / supervisor.count).toFixed(2),
            index === 0 ? 'Top Performer' : index === 1 ? 'High' : index === 2 ? 'Good' : 'Standard'
          ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [['Supervisor Name', 'Slabs', 'Total Area (sq ft)', 'Avg per Slab', 'Performance']],
          body: supervisorTableData,
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }
    }

    pdf.save(`Report_${selectedReport}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    alert('Excel export functionality will be implemented soon');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex space-x-3">
          <button onClick={exportToPDF} className="btn-secondary" disabled={!reportData && !dailyReportData}>
            Export PDF
          </button>
          <button onClick={exportToExcel} className="btn-secondary">
            Export Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Type Selection */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Report Type</h3>
          </div>
          
          <div className="space-y-3">
            {reportTypes.map((type) => (
              <div
                key={type.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedReport === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedReport(type.id)}
              >
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-600">{type.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                onChange={(e) => handleFilterChange('startDate', e.target.value ? new Date(e.target.value) : undefined)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Date</label>
              <input
                type="date"
                onChange={(e) => handleFilterChange('endDate', e.target.value ? new Date(e.target.value) : undefined)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Party Name</label>
              <select
                onChange={(e) => handleFilterChange('partyName', e.target.value || undefined)}
                className="input-field"
              >
                <option value="">All Parties</option>
                {parties.map(party => (
                  <option key={party} value={party}>{party}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Material Name</label>
              <select
                onChange={(e) => handleFilterChange('materialName', e.target.value || undefined)}
                className="input-field"
              >
                <option value="">All Materials</option>
                {materials.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Supervisor</label>
              <select
                onChange={(e) => handleFilterChange('supervisorName', e.target.value || undefined)}
                className="input-field"
              >
                <option value="">All Supervisors</option>
                {supervisors.map(supervisor => (
                  <option key={supervisor} value={supervisor}>{supervisor}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={generateReport} 
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Quick Stats</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Dispatches</div>
              <div className="text-2xl font-bold text-blue-700">
                {selectedReport === 'daily' 
                  ? dailyReportData?.summary.totalDispatches || 0
                  : reportData?.summary.totalSlabs || 0
                }
              </div>
              <div className="text-xs text-blue-600">
                {selectedReport === 'daily' ? 'Today' : 'Selected period'}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Area</div>
              <div className="text-2xl font-bold text-green-700">
                {selectedReport === 'daily' 
                  ? dailyReportData?.summary.totalArea.toFixed(1) || '0'
                  : reportData?.summary.totalArea.toFixed(1) || '0'
                }
              </div>
              <div className="text-xs text-green-600">sq ft</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Avg per Slab</div>
              <div className="text-2xl font-bold text-purple-700">
                {reportData?.summary.averageAreaPerSlab.toFixed(1) || '0'}
              </div>
              <div className="text-xs text-purple-600">sq ft per slab</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Parties</div>
              <div className="text-lg font-bold text-orange-700">
                {selectedReport === 'daily' 
                  ? dailyReportData?.summary.parties || 0
                  : reportData?.partyBreakdown.length || 0
                }
              </div>
              <div className="text-xs text-orange-600">active parties</div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Report Preview</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading report data...</div>
          </div>
        ) : selectedReport === 'daily' && dailyReportData ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispatch Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lot Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slabs Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Materials
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supervisor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {dailyReportData.dispatches && dailyReportData.dispatches.map((dispatch, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dispatch.dispatchTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispatch.lotNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispatch.partyName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispatch.vehicleNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900 font-semibold">
                      {dispatch.slabCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {dispatch.totalArea.toFixed(2)} sq ft
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(dispatch.materialBreakdown).map(([material, data]) => (
                          <span key={material} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {material} ({data.count})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispatch.supervisorName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Party Breakdown - Show for all except 'material' and 'supervisor' specific reports */}
            {(selectedReport === 'party' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.partyBreakdown.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">
                  {selectedReport === 'party' ? 'Party-wise Analysis' : 'Party Breakdown'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Party Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slabs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg per Slab
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.partyBreakdown.map((party, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {party._id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {party.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {party.totalArea.toFixed(2)} sq ft
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(party.totalArea / party.count).toFixed(2)} sq ft
                </td>
              </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Material Breakdown - Show for material-specific and general reports */}
            {(selectedReport === 'material' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.materialBreakdown.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">
                  {selectedReport === 'material' ? 'Material-wise Analysis' : 'Material Breakdown'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Material Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slabs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg per Slab
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.materialBreakdown.map((material, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {material._id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {material.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {material.totalArea.toFixed(2)} sq ft
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(material.totalArea / material.count).toFixed(2)} sq ft
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Supervisor Performance - Show for supervisor-specific and general reports */}
            {(selectedReport === 'supervisor' || selectedReport === 'weekly' || selectedReport === 'monthly') && reportData.supervisorPerformance.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">
                  {selectedReport === 'supervisor' ? 'Supervisor Performance Analysis' : 'Supervisor Performance'}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supervisor Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Slabs Handled
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Area
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg per Slab
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Performance
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.supervisorPerformance
                        .sort((a, b) => b.totalArea - a.totalArea)
                        .map((supervisor, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {supervisor._id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {supervisor.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {supervisor.totalArea.toFixed(2)} sq ft
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {(supervisor.totalArea / supervisor.count).toFixed(2)} sq ft
                </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              index === 0 ? 'bg-green-100 text-green-800' :
                              index === 1 ? 'bg-blue-100 text-blue-800' :
                              index === 2 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {index === 0 ? 'Top Performer' :
                               index === 1 ? 'High' :
                               index === 2 ? 'Good' : 'Standard'}
                            </span>
                </td>
              </tr>
                      ))}
            </tbody>
          </table>
        </div>
              </div>
            )}

            {/* Show all sections for weekly and monthly reports */}
            {(selectedReport === 'weekly' || selectedReport === 'monthly') && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-lg font-semibold text-blue-800 mb-2">
                  📊 {selectedReport === 'weekly' ? 'Weekly' : 'Monthly'} Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Period:</span>
                    <div className="text-blue-800">
                      {selectedReport === 'weekly' ? 'Last 7 days' : 'Last 30 days'}
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Total Area:</span>
                    <div className="text-blue-800 font-semibold">
                      {reportData.summary.totalArea.toFixed(2)} sq ft
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Avg/Day:</span>
                    <div className="text-blue-800">
                      {(reportData.summary.totalArea / (selectedReport === 'weekly' ? 7 : 30)).toFixed(2)} sq ft
                    </div>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Total Slabs:</span>
                    <div className="text-blue-800 font-semibold">
                      {reportData.summary.totalSlabs}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">Click "Generate Report" to view data</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports; 