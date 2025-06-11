import React, { useState } from 'react';
import { ReportFilters } from '../../types';

const Reports = () => {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [selectedReport, setSelectedReport] = useState('daily');

  const reportTypes = [
    { id: 'daily', label: 'Daily Summary', description: 'Today\'s dispatch summary' },
    { id: 'party', label: 'Party-wise', description: 'Reports grouped by party' },
    { id: 'material', label: 'Material-wise', description: 'Reports grouped by material' },
    { id: 'supervisor', label: 'Supervisor Performance', description: 'Supervisor-wise analysis' },
    { id: 'weekly', label: 'Weekly Analysis', description: 'Week-over-week comparison' },
    { id: 'monthly', label: 'Monthly Analysis', description: 'Monthly trends and totals' }
  ];

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateReport = () => {
    console.log('Generating report:', selectedReport, filters);
    // TODO: Implement report generation
  };

  const exportToPDF = () => {
    console.log('Exporting to PDF');
    // TODO: Implement PDF export
  };

  const exportToExcel = () => {
    console.log('Exporting to Excel');
    // TODO: Implement Excel export
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex space-x-3">
          <button onClick={exportToPDF} className="btn-secondary">
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
                    ? 'border-primary-500 bg-primary-50'
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
                <option value="Party A">Party A</option>
                <option value="Party B">Party B</option>
                <option value="Party C">Party C</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Material Name</label>
              <input
                type="text"
                placeholder="Enter material name"
                onChange={(e) => handleFilterChange('materialName', e.target.value || undefined)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supervisor</label>
              <select
                onChange={(e) => handleFilterChange('supervisorName', e.target.value || undefined)}
                className="input-field"
              >
                <option value="">All Supervisors</option>
                <option value="John Doe">John Doe</option>
                <option value="Jane Smith">Jane Smith</option>
                <option value="Ahmed Khan">Ahmed Khan</option>
              </select>
            </div>

            <button onClick={generateReport} className="btn-primary w-full">
              Generate Report
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
              <div className="text-2xl font-bold text-blue-700">245</div>
              <div className="text-xs text-blue-600">This month</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium">Total Area</div>
              <div className="text-2xl font-bold text-green-700">12,450</div>
              <div className="text-xs text-green-600">sq ft this month</div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Avg per Day</div>
              <div className="text-2xl font-bold text-purple-700">8.2</div>
              <div className="text-xs text-purple-600">slabs per day</div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium">Top Party</div>
              <div className="text-lg font-bold text-orange-700">Party A</div>
              <div className="text-xs text-orange-600">45% of total volume</div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Report Preview</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Party Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slabs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supervisor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-01-15
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Party A
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Granite Red
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  12
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  1,245.6 sq ft
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  John Doe
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  2024-01-15
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Party B
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Marble White
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  8
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  890.2 sq ft
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Jane Smith
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports; 