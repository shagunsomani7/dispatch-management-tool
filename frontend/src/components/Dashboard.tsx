import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlabMeasurement } from '../types';
import { apiService } from '../services/api';
import { useAuth } from '../App';

interface DashboardStats {
  todayStats: {
    totalSlabs: number;
    totalArea: number;
    parties: number;
    supervisors: number;
  };
  recentSlabs: SlabMeasurement[];
  topParties: Array<{
    name: string;
    slabCount: number;
    totalArea: number;
  }>;
  supervisorActivity: Array<{
    name: string;
    slabCount: number;
    lastActivity: Date;
  }>;
}

interface RecentActivity {
  id: string;
  type: 'dispatch_created' | 'report_generated' | 'vehicle_dispatched';
  message: string;
  timestamp: Date;
  status: 'success' | 'info' | 'warning';
  dispatchId: string;
  slabCount: number;
  partyName: string;
  totalArea: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's data and recent slabs in parallel
      const [dailyReport, recentSlabs] = await Promise.all([
        apiService.getDailyReport(today),
        apiService.getSlabs({ limit: 50 }) // Get more slabs to group by dispatch
      ]);

      // Process supervisor activity
      const supervisorMap = new Map();
      recentSlabs.slabs.forEach(slab => {
        const existing = supervisorMap.get(slab.supervisorName) || {
          name: slab.supervisorName,
          slabCount: 0,
          lastActivity: new Date(slab.timestamp)
        };
        existing.slabCount++;
        if (new Date(slab.timestamp) > existing.lastActivity) {
          existing.lastActivity = new Date(slab.timestamp);
        }
        supervisorMap.set(slab.supervisorName, existing);
      });

      // Process party statistics
      const partyMap = new Map();
      recentSlabs.slabs.forEach(slab => {
        const existing = partyMap.get(slab.partyName) || {
          name: slab.partyName,
          slabCount: 0,
          totalArea: 0
        };
        existing.slabCount++;
        existing.totalArea += slab.netArea;
        partyMap.set(slab.partyName, existing);
      });

      setStats({
        todayStats: dailyReport.summary,
        recentSlabs: recentSlabs.slabs.slice(0, 5),
        topParties: Array.from(partyMap.values())
          .sort((a, b) => b.totalArea - a.totalArea)
          .slice(0, 3),
        supervisorActivity: Array.from(supervisorMap.values())
          .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
          .slice(0, 5)
      });

      // Group slabs by dispatch and generate dispatch-wise activity
      const dispatchMap = new Map();
      recentSlabs.slabs.forEach(slab => {
        const existing = dispatchMap.get(slab.dispatchId) || {
          dispatchId: slab.dispatchId,
          slabs: [],
          partyName: slab.partyName,
          supervisorName: slab.supervisorName,
          vehicleNumber: slab.dispatchVehicleNumber,
          materialName: slab.materialName,
          lotNumber: slab.lotNumber,
          timestamp: new Date(slab.dispatchTimestamp || slab.timestamp),
          totalArea: 0,
          slabCount: 0
        };
        
        existing.slabs.push(slab);
        existing.totalArea += slab.netArea;
        existing.slabCount++;
        
        // Use the earliest timestamp for the dispatch
        const slabTime = new Date(slab.dispatchTimestamp || slab.timestamp);
        if (slabTime < existing.timestamp) {
          existing.timestamp = slabTime;
        }
        
        dispatchMap.set(slab.dispatchId, existing);
      });

      // Convert to activity items and sort by timestamp
      const activities: RecentActivity[] = Array.from(dispatchMap.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map((dispatch) => ({
          id: dispatch.dispatchId,
          type: 'dispatch_created' as const,
          message: `Dispatch for ${dispatch.partyName} - ${dispatch.slabCount} slabs (${dispatch.totalArea.toFixed(1)} sq ft)`,
          timestamp: dispatch.timestamp,
          status: 'success' as const,
          dispatchId: dispatch.dispatchId,
          slabCount: dispatch.slabCount,
          partyName: dispatch.partyName,
          totalArea: dispatch.totalArea
        }));

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'new_entry':
        navigate('/entry');
        break;
      case 'today_report':
        navigate('/reports');
        break;
      case 'view_all':
        navigate('/slabs');
        break;
      default:
        break;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'dispatch_created':
        return 'bg-green-500';
      case 'report_generated':
        return 'bg-blue-500';
      case 'vehicle_dispatched':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const timeDiff = Date.now() - timestamp.getTime();
    const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutesAgo = Math.floor(timeDiff / (1000 * 60));
    
    if (hoursAgo > 0) {
      return `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;
    } else if (minutesAgo > 0) {
      return `${minutesAgo} min ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString()}
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={loadDashboardData}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-600">Welcome back, {user?.username}!</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
          <button
            onClick={loadDashboardData}
            className="text-sm text-blue-600 hover:text-blue-800"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleQuickAction('view_all')}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Today's Dispatches</h3>
              <p className="text-3xl font-bold text-blue-600">{stats?.todayStats.totalSlabs || 0}</p>
              <p className="text-sm text-gray-500">
                {stats?.todayStats.totalSlabs && stats.todayStats.totalSlabs > 0 
                  ? `Active today` 
                  : 'No dispatches yet'
                }
              </p>
            </div>
            <div className="text-blue-500 text-3xl">📋</div>
          </div>
        </div>
        
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Total Area</h3>
              <p className="text-3xl font-bold text-green-600">
                {stats?.todayStats.totalArea.toFixed(1) || '0'}
              </p>
              <p className="text-sm text-gray-500">sq ft today</p>
            </div>
            <div className="text-green-500 text-3xl">📐</div>
          </div>
        </div>
        
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Active Parties</h3>
              <p className="text-3xl font-bold text-purple-600">{stats?.todayStats.parties || 0}</p>
              <p className="text-sm text-gray-500">parties today</p>
            </div>
            <div className="text-purple-500 text-3xl">🏢</div>
          </div>
        </div>
        
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <button 
              onClick={() => navigate('/slabs')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-2 h-2 ${getActivityIcon(activity.type)} rounded-full flex-shrink-0`}></div>
                <span className="text-sm flex-1">{activity.message}</span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-500">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button 
              onClick={() => handleQuickAction('new_entry')}
              className="w-full btn-primary text-left flex items-center space-x-3 p-4"
            >
              <span className="text-xl">➕</span>
              <div>
                <div className="font-medium">Start New Dispatch Entry</div>
                <div className="text-sm opacity-75">Begin measuring new slabs</div>
              </div>
            </button>
            <button 
              onClick={() => handleQuickAction('today_report')}
              className="w-full btn-secondary text-left flex items-center space-x-3 p-4"
            >
              <span className="text-xl">📄</span>
              <div>
                <div className="font-medium">Generate Today's Report</div>
                <div className="text-sm opacity-75">Create daily summary</div>
              </div>
            </button>
            <button 
              onClick={() => handleQuickAction('view_all')}
              className="w-full btn-secondary text-left flex items-center space-x-3 p-4"
            >
              <span className="text-xl">🗄️</span>
              <div>
                <div className="font-medium">View All Measurements</div>
                <div className="text-sm opacity-75">Browse slab database</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {stats && stats.topParties.length > 0 && (
        <div className="grid grid-cols-1 gap-6">
          {/* Top Parties */}
          {stats.topParties.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Parties by Volume</h3>
              <div className="space-y-3">
                {stats.topParties.map((party, index) => (
                  <div key={party.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="text-lg font-bold text-gray-400">#{index + 1}</div>
                      <div>
                        <div className="font-medium text-gray-900">{party.name}</div>
                        <div className="text-sm text-gray-500">{party.slabCount} slabs</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-600">{party.totalArea.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">sq ft</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
};

export default Dashboard; 