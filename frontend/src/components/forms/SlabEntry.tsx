import React, { useState } from 'react';
import { MeasurementUnit, CornerDeduction } from '../../types';
import { apiService } from '../../services/api';
import jsPDF from 'jspdf';

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
    measurementUnit: 'inches' as MeasurementUnit
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
      
      const slab = updated[slabIndex];
      slab.grossArea = slab.length * slab.height;
      slab.totalDeductionArea = slab.cornerDeductions.reduce((sum, c) => sum + c.area, 0);
      slab.netArea = slab.grossArea - slab.totalDeductionArea;
      
      return updated;
    });
  };

  const copyPreviousSlab = (currentIndex: number) => {
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
        
        const slab = updated[currentIndex];
        slab.grossArea = slab.length * slab.height;
        slab.totalDeductionArea = slab.cornerDeductions.reduce((sum, corner) => sum + corner.area, 0);
        slab.netArea = slab.grossArea - slab.totalDeductionArea;
        
        return updated;
      });
    }
  };

  const clearSlab = (slabIndex: number) => {
    if (window.confirm(`Are you sure you want to clear all measurements for Slab #${slabIndex + 1}?`)) {
      setSlabs(prev => {
        const updated = [...prev];
        updated[slabIndex] = {
          ...updated[slabIndex],
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
        };
        return updated;
      });
    }
  };

  const removeSlab = (slabIndex: number) => {
    if (slabs.length > 1) { 
      setSlabs(prev => {
        const updated = prev.filter((_, index) => index !== slabIndex);
        return updated.map((slab, index) => ({
          ...slab,
          slabNumber: index + 1,
          id: `slab-${index + 1}`
        }));
      });
    } else {
      alert('Cannot remove the last slab. At least one slab is required.');
    }
  };

  const clearAllSlabs = () => {
    if (window.confirm('Are you sure you want to clear all slab measurements? This action cannot be undone.')) {
      setSlabs(prev => prev.map((slab, index) => ({
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
      })));
    }
  };

  const addNewSlab = () => {
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
    e.preventDefault();
    
    try {
      // Validate dispatch info
      if (!dispatchInfo.materialName || !dispatchInfo.lotNumber || !dispatchInfo.dispatchVehicleNumber || 
          !dispatchInfo.supervisorName || !dispatchInfo.partyName) {
        alert('Please fill in all dispatch information fields');
        return;
      }

      // Filter valid slabs
      const validSlabs = slabs.filter(slab => 
        slab.thickness > 0 && slab.length > 0 && slab.height > 0
      );

      if (validSlabs.length === 0) {
        alert('Please enter measurements for at least one slab');
        return;
      }
      
      const savedSlabs = [];
      for (let i = 0; i < validSlabs.length; i++) {
        const slab = validSlabs[i];
        
        // Calculate areas
        const grossArea = slab.length * slab.height;
        const totalDeductionArea = slab.cornerDeductions.reduce((total, corner) => {
          corner.area = corner.length * corner.height;
          return total + corner.area;
        }, 0);
        const netArea = grossArea - totalDeductionArea;

        // Prepare slab data with all required fields
        const slabData = {
          dispatchId: Date.now().toString(),
          dispatchTimestamp: new Date(),
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
          grossArea,
          totalDeductionArea,
          netArea
        };
        
        console.log('Saving slab data:', slabData); // Debug log
        try {
          const savedSlab = await apiService.createSlab(slabData);
          savedSlabs.push(savedSlab);
        } catch (error) {
          console.error('Error saving individual slab:', error);
          if (error instanceof Error) {
            alert(`Error saving slab ${slab.slabNumber}: ${error.message}`);
          } else {
            alert(`Error saving slab ${slab.slabNumber}: Unknown error occurred`);
          }
          throw error; // Re-throw to stop the process
        }
      }
      alert(`Successfully saved ${savedSlabs.length} slabs to database!`);
    } catch (error) {
      console.error('Error saving slabs:', error);
      if (error instanceof Error) {
        alert(`Error saving slabs: ${error.message}`);
      } else {
        alert('Error saving slabs. Please check the console for more details.');
      }
    }
  };

  const getTotalArea = () => {
    return slabs.reduce((total, slab) => total + slab.netArea, 0);
  };

  const generatePDF = () => {
    const pdf = new jsPDF('landscape'); // Using landscape due to wide table
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Margins (in points)
    const margin = 40; // Approx 14mm
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Colors
    const PRIMARY_COLOR = '#2962FF'; // Original Blue
    const TEXT_COLOR_DARK = '#333333';
    const TEXT_COLOR_LIGHT = '#FFFFFF';
    const BORDER_COLOR = '#DDDDDD';
    const ROW_ALT_COLOR = '#F5F5F5'; // Light gray for alternating rows

    // Helper to format date
    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    const currentDate = new Date();
    const formattedDate = formatDate(currentDate);

    // Company Details (Placeholders)
    const companyDetails = {
      name: 'SAMDANI GROUP',
      addressLine1: '123 Industrial Zone, Main Road',
      addressLine2: 'Cityville, ST 12345',
      phone: 'Phone: (555) 123-4567',
      email: 'Email: contact@samdanigroup.com',
    };

    // --- Start Page Content ---

    const addPageHeaderAndFooter = (isFirstPage: boolean = false) => {
        // Reset yPosition for header if not first page (it's already set for first page)
        if(!isFirstPage) yPosition = margin;

        // Page Header
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(PRIMARY_COLOR);
        pdf.text(companyDetails.name, margin, yPosition);

        pdf.setFontSize(14);
        pdf.text('DISPATCH NOTE', pageWidth - margin, yPosition, { align: 'right' as const });
        yPosition += 20;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(TEXT_COLOR_DARK);
        pdf.text(companyDetails.addressLine1, margin, yPosition);
        
        const dispatchNoteNumber = `DN-${Date.now().toString().slice(-6)}`;
        pdf.text(`Dispatch No: ${dispatchNoteNumber}`, pageWidth - margin, yPosition, { align: 'right' as const });
        yPosition += 15;
        
        pdf.text(companyDetails.addressLine2, margin, yPosition);
        pdf.text(`Date: ${formattedDate}`, pageWidth - margin, yPosition, { align: 'right' as const });
        yPosition += 15;

        pdf.text(companyDetails.phone, margin, yPosition);
        yPosition += 15;
        pdf.text(companyDetails.email, margin, yPosition);
        yPosition += 25;

        // Line separator
        pdf.setDrawColor(BORDER_COLOR);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 20;


        // Page Footer (Common for all pages)
        const footerY = pageHeight - margin + 20;
        pdf.setDrawColor(BORDER_COLOR);
        pdf.line(margin, pageHeight - margin, pageWidth - margin, pageHeight - margin);
        pdf.setFontSize(8);
        pdf.setTextColor(TEXT_COLOR_DARK);
        pdf.text('Thank you for your business!', margin, footerY);
        pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin, footerY, { align: 'right' as const });
    };
    
    addPageHeaderAndFooter(true); // Add header for the first page

    // Party and Dispatch Details
    const col1X = margin;
    const col2X = margin + contentWidth / 2 + 20;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BILLED TO:', col1X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.partyName || 'N/A', col1X, yPosition + 15);
    pdf.text('Party Address Line 1 (Placeholder)', col1X, yPosition + 30);
    pdf.text('Party City, State, Zip (Placeholder)', col1X, yPosition + 45);

    pdf.setFont('helvetica', 'bold');
    pdf.text('DISPATCHED FROM:', col2X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(companyDetails.name, col2X, yPosition + 15);
    pdf.text(companyDetails.addressLine1, col2X, yPosition + 30);
     yPosition += 60;

    pdf.setFont('helvetica', 'bold');
    pdf.text('MATERIAL:', col1X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.materialName || 'N/A', col1X + 80, yPosition);

    pdf.setFont('helvetica', 'bold');
    pdf.text('VEHICLE NO.:', col2X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.dispatchVehicleNumber || 'N/A', col2X + 80, yPosition);
    yPosition += 20;

    pdf.setFont('helvetica', 'bold');
    pdf.text('LOT NUMBER (UID):', col1X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.lotNumber || 'N/A', col1X + 80, yPosition);
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('SUPERVISOR:', col2X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.supervisorName || 'N/A', col2X + 80, yPosition);
    yPosition += 20;

    pdf.setFont('helvetica', 'bold');
    pdf.text('MEASUREMENT UNIT:', col1X, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.measurementUnit, col1X + 100, yPosition);
    yPosition += 25;

    // Line separator
    pdf.setDrawColor(BORDER_COLOR);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 20;

    // Slab Table
    // Filter slabs with actual measurements (same as handleSubmit)
    const validSlabs = slabs.filter(slab => 
      slab.thickness > 0 && slab.length > 0 && slab.height > 0
    );

    const tableCols = [
      { header: 'Slab #', width: 25, dataKey: 'slabNumber', align: 'center' },
      { header: `L (${dispatchInfo.measurementUnit})`, width: 28, dataKey: 'length', align: 'right' },
      { header: `H (${dispatchInfo.measurementUnit})`, width: 28, dataKey: 'height', align: 'right' },
      { header: `T (${dispatchInfo.measurementUnit})`, width: 28, dataKey: 'thickness', align: 'right' },
      { header: `Gross (${dispatchInfo.measurementUnit}²)`, width: 32, dataKey: 'grossArea', align: 'right' },
      { header: `C1 (${dispatchInfo.measurementUnit}²)`, width: 24, dataKey: 'c1Area', align: 'right' },
      { header: `C2 (${dispatchInfo.measurementUnit}²)`, width: 24, dataKey: 'c2Area', align: 'right' },
      { header: `C3 (${dispatchInfo.measurementUnit}²)`, width: 24, dataKey: 'c3Area', align: 'right' },
      { header: `C4 (${dispatchInfo.measurementUnit}²)`, width: 24, dataKey: 'c4Area', align: 'right' },
      { header: `Deduct (${dispatchInfo.measurementUnit}²)`, width: 32, dataKey: 'totalDeductionArea', align: 'right' },
      { header: `Net (${dispatchInfo.measurementUnit}²)`, width: 32, dataKey: 'netArea', align: 'right' }
    ];
    
    // Calculate column positions (using `margin` as starting point for table)
    let currentX = margin;
    const colPositions = tableCols.map(col => {
      const pos = currentX;
      currentX += col.width;
      return pos;
    });
    const tableTotalWidth = tableCols.reduce((sum, col) => sum + col.width, 0);

    const drawTableHeader = () => {
      pdf.setFillColor(PRIMARY_COLOR);
      pdf.rect(margin, yPosition, tableTotalWidth, 20, 'F');
      pdf.setTextColor(TEXT_COLOR_LIGHT);
      pdf.setFontSize(8); // Slightly larger header font
      pdf.setFont('helvetica', 'bold');
      
      tableCols.forEach((col, index) => {
        let textX = colPositions[index];
        if (col.align === 'center') textX += col.width / 2;
        else if (col.align === 'right') textX += col.width - 5; // padding
        else textX += 5; // padding
        pdf.text(col.header, textX, yPosition + 14, { 
          align: (col.align || 'left') as 'left' | 'center' | 'right' | 'justify' 
        });
      });
      yPosition += 20;
    };

    drawTableHeader();
    
    pdf.setTextColor(TEXT_COLOR_DARK);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7); // Slightly larger data font
    
    validSlabs.forEach((slab, index) => {
      const rowHeight = 18;
      
      if (yPosition + rowHeight > pageHeight - margin - 30) { // Check for page break (leave space for footer + totals)
        pdf.addPage('landscape');
        addPageHeaderAndFooter(); // Add header and footer to new page
        drawTableHeader(); // Redraw table header
        pdf.setTextColor(TEXT_COLOR_DARK); // Reset text color after header
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(ROW_ALT_COLOR);
        pdf.rect(margin, yPosition, tableTotalWidth, rowHeight, 'F');
      }
      
      const rowData = {
        slabNumber: slab.slabNumber.toString(),
        length: slab.length.toFixed(2),
        height: slab.height.toFixed(2),
        thickness: slab.thickness.toFixed(2),
        grossArea: slab.grossArea.toFixed(2),
        c1Area: slab.cornerDeductions[0]?.area.toFixed(2) || '0.00',
        c2Area: slab.cornerDeductions[1]?.area.toFixed(2) || '0.00',
        c3Area: slab.cornerDeductions[2]?.area.toFixed(2) || '0.00',
        c4Area: slab.cornerDeductions[3]?.area.toFixed(2) || '0.00',
        totalDeductionArea: slab.totalDeductionArea.toFixed(2),
        netArea: slab.netArea.toFixed(2)
      };
      
      tableCols.forEach((col, colIndex) => {
        let textX = colPositions[colIndex];
        const cellValue = rowData[col.dataKey as keyof typeof rowData] || '';
        if (col.align === 'center') textX += col.width / 2;
        else if (col.align === 'right') textX += col.width - 5; // padding
        else textX += 5; // padding
        pdf.text(cellValue, textX, yPosition + rowHeight - 6, { 
          align: (col.align || 'left') as 'left' | 'center' | 'right' | 'justify' 
        });
      });
      
      // Draw cell borders
      pdf.setDrawColor(BORDER_COLOR);
      pdf.rect(margin, yPosition, tableTotalWidth, rowHeight); // Outer rect for row
      colPositions.forEach((pos, idx) => { // Vertical lines
         if (idx > 0) pdf.line(pos, yPosition, pos, yPosition + rowHeight);
      });

      yPosition += rowHeight;
    });

    // Totals Section
    yPosition += 20; // Space before totals
    if (yPosition > pageHeight - margin - 100) { // Check if totals need new page
        pdf.addPage('landscape');
        addPageHeaderAndFooter();
        yPosition = margin + 180; // Approximate y after header/details
    }

    const totalGross = validSlabs.reduce((sum, slab) => sum + slab.grossArea, 0);
    const totalDeduct = validSlabs.reduce((sum, slab) => sum + slab.totalDeductionArea, 0);
    const totalNet = getTotalArea();
    
    const totalsXLabel = pageWidth - margin - 200; // Position for labels
    const totalsXValue = pageWidth - margin - 5;      // Position for values (right aligned)

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Total Slabs Dispatched:', totalsXLabel, yPosition);
    pdf.text(validSlabs.length.toString(), totalsXValue, yPosition, { align: 'right' as const });
    yPosition += 18;

    pdf.text(`Total Gross Area (${dispatchInfo.measurementUnit}²):`, totalsXLabel, yPosition);
    pdf.text(totalGross.toFixed(2), totalsXValue, yPosition, { align: 'right' as const });
    yPosition += 18;
    
    pdf.text(`Total Deduction Area (${dispatchInfo.measurementUnit}²):`, totalsXLabel, yPosition);
    pdf.text(totalDeduct.toFixed(2), totalsXValue, yPosition, { align: 'right' as const });
    yPosition += 18;

    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL NET DISPATCHED AREA (${dispatchInfo.measurementUnit}²):`, totalsXLabel, yPosition);
    pdf.text(totalNet.toFixed(2), totalsXValue, yPosition, { align: 'right' as const });
    yPosition += 30;


    // Notes and Signature
    if (yPosition > pageHeight - margin - 80) { // Check if notes/signature need new page
        pdf.addPage('landscape');
        addPageHeaderAndFooter();
        yPosition = margin + 180;
    }

    const notesX = margin;
    const signatureX = pageWidth - margin - 200;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Notes:', notesX, yPosition);
    pdf.setFont('helvetica', 'normal');
    // You can add a box for notes if needed:
    // pdf.setDrawColor(BORDER_COLOR);
    // pdf.rect(notesX, yPosition + 5, contentWidth / 2 - 20, 50); 
    pdf.text('1. All goods received in good condition.', notesX, yPosition + 15);
    pdf.text('2. Please verify measurements upon receipt.', notesX, yPosition + 30);


    pdf.setDrawColor(TEXT_COLOR_DARK);
    pdf.line(signatureX, yPosition + 40, pageWidth - margin, yPosition + 40); // Signature line
    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Signature', signatureX, yPosition + 55);

    // Final call to ensure footer is on the last page if content is short
    // (Handled by addPageHeaderAndFooter on each page including the first)

    // Save PDF
    const fileName = `Dispatch_Note_${dispatchInfo.partyName || 'UnknownParty'}_${dispatchInfo.lotNumber || 'NoLot'}_${formattedDate.replace(/\//g, '-')}.pdf`;
    pdf.save(fileName);
  };


  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Multi-Slab Entry</h2>
        <div className="flex space-x-3">
          <button onClick={clearAllSlabs} className="bg-red-600 text-white font-medium py-2 px-4 rounded-lg cursor-pointer hover:bg-red-700">
            Clear All
          </button>
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
                <div className="flex space-x-2 items-center">
                  {slabIndex > 0 && (
                    <button
                      type="button"
                      onClick={() => copyPreviousSlab(slabIndex)}
                      className="btn-secondary text-sm"
                    >
                      Copy Previous
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => clearSlab(slabIndex)}
                    className="bg-orange-600 text-white font-medium py-1 px-3 rounded-lg cursor-pointer hover:bg-orange-700 text-sm"
                  >
                    Clear
                  </button>
                  {slabs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlab(slabIndex)}
                      className="bg-red-600 text-white font-medium py-1 px-3 rounded-lg cursor-pointer hover:bg-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                  <div className="text-sm text-gray-600">
                    Net Area: {slab.netArea.toFixed(2)} {dispatchInfo.measurementUnit}²
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Measurements - Rearranged to L-H-T order */}
                <div className="space-y-4">
                  <h5 className="font-medium text-gray-700">Basic Measurements (L × H × T)</h5>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label text-xs">Length ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.length === 0 ? '' : slab.length}
                        onChange={(e) => handleSlabChange(slabIndex, 'length', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Height ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.height === 0 ? '' : slab.height}
                        onChange={(e) => handleSlabChange(slabIndex, 'height', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="form-label text-xs">Thickness ({dispatchInfo.measurementUnit})</label>
                      <input
                        type="number"
                        step="0.01"
                        value={slab.thickness === 0 ? '' : slab.thickness}
                        onChange={(e) => handleSlabChange(slabIndex, 'thickness', parseFloat(e.target.value) || 0)}
                        className="input-field text-sm"
                        placeholder="0.00"
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
                            value={corner.length === 0 ? '' : corner.length}
                            onChange={(e) => handleCornerDeductionChange(slabIndex, cornerIndex, 'length', parseFloat(e.target.value) || 0)}
                            placeholder="L"
                            className="w-full px-1 py-1 text-xs border border-gray-300 rounded"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={corner.height === 0 ? '' : corner.height}
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

        {/* Bottom Action Buttons */}
        <div className="text-center py-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button 
              type="submit" 
              className="btn-primary text-lg px-8 py-3 min-w-48"
            >
              💾 Save to Database
            </button>
            <button 
              type="button"
              onClick={generatePDF}
              className="bg-green-600 text-white font-medium text-lg px-8 py-3 rounded-lg cursor-pointer hover:bg-green-700 min-w-48"
            >
              📄 Download PDF Report
            </button>
          </div>
          <div className="text-sm text-gray-600 max-w-md mx-auto">
            Save all {slabs.length} slab measurements to the cloud database and download a comprehensive PDF report
          </div>
        </div>
      </form>
    </div>
  );
};

export default SlabEntry; 