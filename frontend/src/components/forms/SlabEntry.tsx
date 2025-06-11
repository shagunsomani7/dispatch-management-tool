import React, { useState } from 'react';
import { SlabMeasurement, MeasurementUnit, CornerDeduction } from '../../types';
import { apiService } from '../../services/api';

interface SlabFormData {
  id: string;
  slabNumber: number;
  thickness: number;
  length: number;
  height: number;
  cornerDeductions: CornerDeduction[];
  grossArea: number;
  totalDeductionArea: number;
  netArea: number;
}

const SlabEntry = () => {
  // Common dispatch information
  const [dispatchInfo, setDispatchInfo] = useState({
    materialName: '',
    lotNumber: '',
    dispatchVehicleNumber: '',
    supervisorName: '',
    partyName: '',
    measurementUnit: 'mm' as MeasurementUnit
  });

  // Material options with ability to add new
  const [materials, setMaterials] = useState([
    'Granite Red',
    'Granite Black',
    'Marble White',
    'Marble Black',
    'Quartz Premium'
  ]);

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState('');

  // Multiple slabs (minimum 5)
  const [slabs, setSlabs] = useState<SlabFormData[]>(() => 
    Array.from({ length: 5 }, (_, index) => ({
      id: `slab-${index + 1}`,
      slabNumber: index + 1,
      thickness: 0,
      length: 0,
      height: 0,
      cornerDeductions: [
        { id: '1', length: 0, height: 0, area: 0 },
        { id: '2', length: 0, height: 0, area: 0 },
        { id: '3', length: 0, height: 0, area: 0 },
        { id: '4', length: 0, height: 0, area: 0 }
      ],
      grossArea: 0,
      totalDeductionArea: 0,
      netArea: 0
    }))
  );

  const handleDispatchInfoChange = (field: string, value: any) => {
    setDispatchInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addNewMaterial = () => {
    console.log('Add new material clicked');
    if (newMaterial.trim() && !materials.includes(newMaterial.trim())) {
      setMaterials(prev => [...prev, newMaterial.trim()]);
      setDispatchInfo(prev => ({ ...prev, materialName: newMaterial.trim() }));
      setNewMaterial('');
      setShowAddMaterial(false);
    }
  };

  const handleSlabChange = (slabIndex: number, field: string, value: number) => {
    setSlabs(prev => {
      const updated = [...prev];
      updated[slabIndex] = {
        ...updated[slabIndex],
        [field]: value
      };
      
      // Recalculate areas
      const slab = updated[slabIndex];
      slab.grossArea = slab.length * slab.height;
      slab.totalDeductionArea = slab.cornerDeductions.reduce((sum, corner) => sum + corner.area, 0);
      slab.netArea = slab.grossArea - slab.totalDeductionArea;
      
      return updated;
    });
  };

  const handleCornerDeductionChange = (slabIndex: number, cornerIndex: number, field: keyof Omit<CornerDeduction, 'id' | 'area'>, value: number) => {
    setSlabs(prev => {
      const updated = [...prev];
      const corner = { ...updated[slabIndex].cornerDeductions[cornerIndex] };
      corner[field] = value;
      corner.area = corner.length * corner.height;
      
      updated[slabIndex].cornerDeductions[cornerIndex] = corner;
      
      // Recalculate slab areas
      const slab = updated[slabIndex];
      slab.grossArea = slab.length * slab.height;
      slab.totalDeductionArea = slab.cornerDeductions.reduce((sum, c) => sum + c.area, 0);
      slab.netArea = slab.grossArea - slab.totalDeductionArea;
      
      return updated;
    });
  };

  const copyPreviousSlab = (currentIndex: number) => {
    console.log('Copy previous slab clicked for index:', currentIndex);
    if (currentIndex > 0) {
      const previousSlab = slabs[currentIndex - 1];
      setSlabs(prev => {
        const updated = [...prev];
        updated[currentIndex] = {
          ...updated[currentIndex],
          thickness: previousSlab.thickness,
          length: previousSlab.length,
          height: previousSlab.height,
          cornerDeductions: previousSlab.cornerDeductions.map(corner => ({ ...corner }))
        };
        
        // Recalculate areas
        const slab = updated[currentIndex];
        slab.grossArea = slab.length * slab.height;
        slab.totalDeductionArea = slab.cornerDeductions.reduce((sum, corner) => sum + corner.area, 0);
        slab.netArea = slab.grossArea - slab.totalDeductionArea;
        
        return updated;
      });
    }
  };

  const addNewSlab = () => {
    console.log('Add new slab clicked');
    const newSlabNumber = slabs.length + 1;
    setSlabs(prev => [...prev, {
      id: `slab-${newSlabNumber}`,
      slabNumber: newSlabNumber,
      thickness: 0,
      length: 0,
      height: 0,
      cornerDeductions: [
        { id: '1', length: 0, height: 0, area: 0 },
        { id: '2', length: 0, height: 0, area: 0 },
        { id: '3', length: 0, height: 0, area: 0 },
        { id: '4', length: 0, height: 0, area: 0 }
      ],
      grossArea: 0,
      totalDeductionArea: 0,
      netArea: 0
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('Form submitted');
    e.preventDefault();
    
    try {
      // Validate that required fields are filled
      if (!dispatchInfo.materialName || !dispatchInfo.lotNumber || !dispatchInfo.dispatchVehicleNumber || 
          !dispatchInfo.supervisorName || !dispatchInfo.partyName) {
        alert('Please fill in all dispatch information fields');
        return;
      }

      // Filter out slabs with no measurements
      const validSlabs = slabs.filter(slab => 
        slab.thickness > 0 && slab.length > 0 && slab.height > 0
      );

      if (validSlabs.length === 0) {
        alert('Please enter measurements for at least one slab');
        return;
      }

      console.log('Saving slabs to database...');
      
      // Save each slab to the database
      const savedSlabs = [];
      for (let i = 0; i < validSlabs.length; i++) {
        const slab = validSlabs[i];
        
        const slabData = {
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber,
          dispatchVehicleNumber: dispatchInfo.dispatchVehicleNumber,
          supervisorName: dispatchInfo.supervisorName,
          partyName: dispatchInfo.partyName,
          slabNumber: slab.slabNumber,
          thickness: slab.thickness,
          length: slab.length,
          height: slab.height,
          cornerDeductions: slab.cornerDeductions,
          measurementUnit: dispatchInfo.measurementUnit,
          grossArea: slab.grossArea,
          totalDeductionArea: slab.totalDeductionArea,
          netArea: slab.netArea
        };

        const savedSlab = await apiService.createSlab(slabData);
        savedSlabs.push(savedSlab);
        console.log(`Slab ${slab.slabNumber} saved successfully:`, savedSlab);
      }

      alert(`Successfully saved ${savedSlabs.length} slabs to database!`);
      
      // Optional: Reset form or redirect
      // window.location.reload(); // Uncomment if you want to reset the form
      
    } catch (error) {
      console.error('Error saving slabs:', error);
      alert('Error saving slabs to database. Please try again.');
    }
  };

  const getTotalArea = () => {
    return slabs.reduce((total, slab) => total + slab.netArea, 0);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Multi-Slab Entry</h2>
        <div className="flex space-x-3">
          <button onClick={addNewSlab} className="btn-secondary">
            Add New Slab
          </button>
          <button type="submit" form="dispatch-form" className="btn-primary">
            Save All Measurements
          </button>
        </div>
      </div>

      <form id="dispatch-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Common Dispatch Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Dispatch Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Material Name with Add Option */}
            <div className="form-group">
              <label className="form-label">Material Name</label>
              <div className="flex space-x-2">
                <select
                  value={dispatchInfo.materialName}
                  onChange={(e) => {
                    console.log('Material dropdown changed:', e.target.value);
                    if (e.target.value === 'ADD_NEW') {
                      setShowAddMaterial(true);
                    } else {
                      handleDispatchInfoChange('materialName', e.target.value);
                    }
                  }}
                  className="input-field flex-1"
                >
                  <option value="">Select Material</option>
                  {materials.map(material => (
                    <option key={material} value={material}>{material}</option>
                  ))}
                  <option value="ADD_NEW">+ Add New Material</option>
                </select>
              </div>
              
              {showAddMaterial && (
                <div className="mt-2 flex space-x-2">
                  <input
                    type="text"
                    value={newMaterial}
                    onChange={(e) => setNewMaterial(e.target.value)}
                    placeholder="Enter new material name"
                    className="input-field flex-1"
                  />
                  <button type="button" onClick={addNewMaterial} className="btn-primary">Add</button>
                  <button type="button" onClick={() => {
                    console.log('Cancel button clicked');
                    setShowAddMaterial(false);
                  }} className="btn-secondary">Cancel</button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Lot Number (UID)</label>
              <input
                type="text"
                value={dispatchInfo.lotNumber}
                onChange={(e) => handleDispatchInfoChange('lotNumber', e.target.value)}
                className="input-field"
                placeholder="Enter lot number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vehicle Number</label>
              <input
                type="text"
                value={dispatchInfo.dispatchVehicleNumber}
                onChange={(e) => handleDispatchInfoChange('dispatchVehicleNumber', e.target.value)}
                className="input-field"
                placeholder="Enter vehicle number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supervisor Name</label>
              <select
                value={dispatchInfo.supervisorName}
                onChange={(e) => handleDispatchInfoChange('supervisorName', e.target.value)}
                className="input-field"
              >
                <option value="">Select Supervisor</option>
                <option value="John Doe">John Doe</option>
                <option value="Jane Smith">Jane Smith</option>
                <option value="Ahmed Khan">Ahmed Khan</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Party Name</label>
              <select
                value={dispatchInfo.partyName}
                onChange={(e) => handleDispatchInfoChange('partyName', e.target.value)}
                className="input-field"
              >
                <option value="">Select Party</option>
                <option value="Party A">Party A</option>
                <option value="Party B">Party B</option>
                <option value="Party C">Party C</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Measurement Unit</label>
              <select
                value={dispatchInfo.measurementUnit}
                onChange={(e) => handleDispatchInfoChange('measurementUnit', e.target.value as MeasurementUnit)}
                className="input-field"
              >
                <option value="mm">Millimeters (mm)</option>
                <option value="cm">Centimeters (cm)</option>
                <option value="inches">Inches</option>
              </select>
            </div>
          </div>
        </div>

        {/* Multiple Slabs */}
        <div className="space-y-4">
          {slabs.map((slab, slabIndex) => (
            <div key={slab.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Slab #{slab.slabNumber}</h4>
                <div className="flex space-x-2">
                  {slabIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => copyPreviousSlab(slabIndex)}
                      className="btn-secondary text-sm"
                    >
                      Copy Previous
                    </button>
                  )}
                  <div className="text-sm text-gray-600">
                    Net Area: {slab.netArea.toFixed(2)} {dispatchInfo.measurementUnit}²
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Measurements */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Basic Measurements</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label text-xs">Thickness ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.thickness}
                        onChange={(e) => handleSlabChange(slabIndex, 'thickness', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Length ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.length}
                        onChange={(e) => handleSlabChange(slabIndex, 'length', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Height ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.height}
                        onChange={(e) => handleSlabChange(slabIndex, 'height', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Corner Deductions - Single Row */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Corner Deductions</h5>
                  <div className="grid grid-cols-4 gap-2">
                    {slab.cornerDeductions.map((corner, cornerIndex) => (
                      <div key={corner.id} className="border border-gray-200 p-2 rounded">
                        <div className="text-xs font-medium text-gray-600 mb-1">Corner {cornerIndex + 1}</div>
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.01"
                            value={corner.length}
                            onChange={(e) => handleCornerDeductionChange(slabIndex, cornerIndex, 'length', parseFloat(e.target.value) || 0)}
                            placeholder="L"
                            className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={corner.height}
                            onChange={(e) => handleCornerDeductionChange(slabIndex, cornerIndex, 'height', parseFloat(e.target.value) || 0)}
                            placeholder="H"
                            className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                          />
                          <div className="text-xs text-gray-500">
                            Area: {corner.area.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="mt-4 grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Gross Area</div>
                  <div className="font-semibold text-blue-600">{slab.grossArea.toFixed(2)} {dispatchInfo.measurementUnit}²</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Deductions</div>
                  <div className="font-semibold text-orange-600">{slab.totalDeductionArea.toFixed(2)} {dispatchInfo.measurementUnit}²</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Net Area</div>
                  <div className="font-semibold text-green-600">{slab.netArea.toFixed(2)} {dispatchInfo.measurementUnit}²</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card bg-blue-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900">Dispatch Summary</h3>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-blue-700">Total Slabs</div>
                <div className="text-2xl font-bold text-blue-900">{slabs.length}</div>
              </div>
              <div>
                <div className="text-sm text-blue-700">Total Net Area</div>
                <div className="text-2xl font-bold text-blue-900">{getTotalArea().toFixed(2)} {dispatchInfo.measurementUnit}²</div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SlabEntry; 