import React, { useState, useEffect } from 'react';
import { SlabMeasurement } from '../../types';
import apiService from '../../services/api';

interface SlabDetail {
  id: string;
  material: string;
  area: number;
  dimensions: string;
  slabNumber?: number;
}

interface PartyConsignment {
  partyName: string;
  materials: Array<{
    material: string;
    area: number;
    slabs: SlabDetail[];
  }>;
  totalArea: number;
  totalSlabs: number;
}

interface Truck {
  id: string;
  vehicleNumber: string;
  consignments: PartyConsignment[];
  totalMaterials: number;
  totalSlabs: number;
  grossArea: number;
}

const TruckDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [expandedTruck, setExpandedTruck] = useState<Truck | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrucks = async () => {
      setLoading(true);
      setError(null);
      setTrucks([]);
      try {
        // Fetch slabs for a wide date range (last 30 days)
        const today = new Date(selectedDate);
        const startRange = new Date(today);
        startRange.setDate(today.getDate() - 15);
        const endRange = new Date(today);
        endRange.setDate(today.getDate() + 15);
        const { slabs } = await apiService.getSlabs({
          startDate: startRange.toISOString().split('T')[0],
          endDate: endRange.toISOString().split('T')[0],
          limit: 1000
        });
        // Filter slabs by dispatchTimestamp (date only, ignore time)
        const filteredSlabs = slabs.filter((slab: SlabMeasurement) => {
          if (!slab.dispatchTimestamp) return false;
          const dispatchDate = new Date(slab.dispatchTimestamp);
          const selected = new Date(selectedDate);
          return (
            dispatchDate.getFullYear() === selected.getFullYear() &&
            dispatchDate.getMonth() === selected.getMonth() &&
            dispatchDate.getDate() === selected.getDate()
          );
        });
        // Group slabs by vehicle number
        const truckMap = new Map<string, Truck>();
        filteredSlabs.forEach((slab: SlabMeasurement) => {
          const vehicleNumber = slab.dispatchVehicleNumber || 'UNKNOWN';
          if (!truckMap.has(vehicleNumber)) {
            truckMap.set(vehicleNumber, {
              id: vehicleNumber,
              vehicleNumber,
              consignments: [],
              totalMaterials: 0,
              totalSlabs: 0,
              grossArea: 0
            });
          }
        });
        // For each truck, group by party, then by material
        truckMap.forEach((truck, vehicleNumber) => {
          // Get all slabs for this vehicle
          const slabsForTruck = filteredSlabs.filter((s: SlabMeasurement) => (s.dispatchVehicleNumber || 'UNKNOWN') === vehicleNumber);
          // Group by party
          const partyMap = new Map<string, PartyConsignment>();
          slabsForTruck.forEach((slab: SlabMeasurement) => {
            if (!partyMap.has(slab.partyName)) {
              partyMap.set(slab.partyName, {
                partyName: slab.partyName,
                materials: [],
                totalArea: 0,
                totalSlabs: 0
              });
            }
          });
          // For each party, group by material
          partyMap.forEach((party, partyName) => {
            const slabsForParty = slabsForTruck.filter((s: SlabMeasurement) => s.partyName === partyName);
            const materialMap = new Map<string, { material: string; area: number; slabs: SlabDetail[] }>();
            slabsForParty.forEach((slab: SlabMeasurement) => {
              if (!materialMap.has(slab.materialName)) {
                materialMap.set(slab.materialName, {
                  material: slab.materialName,
                  area: 0,
                  slabs: []
                });
              }
              const mat = materialMap.get(slab.materialName)!;
              mat.area += slab.netArea;
              mat.slabs.push({
                id: slab._id || '',
                material: slab.materialName,
                area: slab.netArea,
                dimensions: `${slab.length} x ${slab.height}`,
                slabNumber: slab.slabNumber
              });
            });
            party.materials = Array.from(materialMap.values());
            party.totalArea = party.materials.reduce((sum, m) => sum + m.area, 0);
            party.totalSlabs = party.materials.reduce((sum, m) => sum + m.slabs.length, 0);
          });
          truck.consignments = Array.from(partyMap.values());
          truck.totalMaterials = Array.from(partyMap.values()).reduce((sum, p) => sum + p.materials.length, 0);
          truck.totalSlabs = slabsForTruck.length;
          truck.grossArea = slabsForTruck.reduce((sum, s) => sum + s.netArea, 0);
        });
        setTrucks(Array.from(truckMap.values()));
      } catch (err: any) {
        setError(err.message || 'Failed to load trucks');
      } finally {
        setLoading(false);
      }
    };
    fetchTrucks();
  }, [selectedDate]);

  // Modal component
  const TruckModal: React.FC<{ truck: Truck; onClose: () => void }> = ({ truck, onClose }) => {
    const [openParty, setOpenParty] = useState<string>('');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-0 relative flex flex-col max-h-[90vh]">
          {/* Modal Header (sticky) */}
          <div className="p-6 pb-0 sticky top-0 z-10 bg-white rounded-t-lg shadow-sm">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-xl"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-4">Truck: {truck.vehicleNumber}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Parties</span>
                <span className="text-lg font-semibold">{truck.consignments.length}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Materials</span>
                <span className="text-lg font-semibold">{truck.totalMaterials}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Total Slabs</span>
                <span className="text-lg font-semibold">{truck.totalSlabs}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Gross Area</span>
                <span className="text-lg font-semibold">{truck.grossArea.toFixed(2)} sq ft</span>
              </div>
            </div>
          </div>
          {/* Modal Body (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
            {truck.consignments.map((party) => {
              const isOpen = openParty === party.partyName;
              return (
                <div key={party.partyName} className="bg-gray-50 rounded-lg shadow-sm mb-2">
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 focus:outline-none ${isOpen ? 'bg-blue-50' : 'bg-gray-100'} rounded-t-lg`}
                    onClick={() => setOpenParty(isOpen ? '' : party.partyName)}
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-blue-700 text-lg text-left">{party.partyName}</span>
                    <span className="flex gap-4 text-xs text-gray-600">
                      <span>Total Area: <span className="font-bold">{party.totalArea.toFixed(2)} sq ft</span></span>
                      <span>Slabs: <span className="font-bold">{party.totalSlabs}</span></span>
                      <svg className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-2">
                      {party.materials.map((mat) => (
                        <div key={mat.material} className="mb-4">
                          <div className="font-medium text-gray-700 mb-1">Material: {mat.material} <span className="text-xs text-gray-500">(Gross Area: {mat.area.toFixed(2)} sq ft)</span></div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-xs border rounded-lg">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="px-3 py-2 border-b text-left font-bold">Slab #</th>
                                  <th className="px-3 py-2 border-b text-left font-bold">Gross Area (sq ft)</th>
                                  <th className="px-3 py-2 border-b text-left font-bold">Size (L × H)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[...mat.slabs]
                                  .sort((a, b) => (a.slabNumber ?? 0) - (b.slabNumber ?? 0))
                                  .map((slab, idx) => (
                                    <tr key={slab.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-3 py-2 border-b font-mono">{slab.slabNumber ?? '-'}</td>
                                      <td className="px-3 py-2 border-b">{Number(slab.area).toFixed(2)}</td>
                                      <td className="px-3 py-2 border-b">{slab.dimensions}</td>
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
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Truck Dashboard</h2>
        <div>
          <label className="mr-2 font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading trucks...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trucks.length === 0 ? (
            <div className="col-span-full text-center text-gray-500">No active trucks for selected date.</div>
          ) : (
            trucks.map((truck) => (
              <div
                key={truck.id}
                className="card hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
                onClick={() => setExpandedTruck(truck)}
              >
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-gray-800">{truck.vehicleNumber}</div>
                    <div className="text-2xl">🚚</div>
                  </div>
                  <div className="flex flex-wrap gap-4 mb-2">
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Parties</span>
                      <span className="font-semibold">{truck.consignments.length}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Materials</span>
                      <span className="font-semibold">{truck.totalMaterials}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Total Slabs</span>
                      <span className="font-semibold">{truck.totalSlabs}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-500">Gross Area</span>
                      <span className="font-semibold">{truck.grossArea.toFixed(2)} sq ft</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-2 border-t bg-gray-50">
                  {truck.consignments.map((party) => (
                    <span key={party.partyName} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {party.partyName}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      {expandedTruck && (
        <TruckModal truck={expandedTruck} onClose={() => setExpandedTruck(null)} />
      )}
    </div>
  );
};

export default TruckDashboard; 