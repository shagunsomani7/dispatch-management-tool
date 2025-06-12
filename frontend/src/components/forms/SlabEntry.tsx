import React, { useState, useEffect } from 'react';
import { MeasurementUnit, CornerDeduction, SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';
import { jsPDF } from 'jspdf';

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

  const clearSlab = (slabIndex: number) => {
    console.log('Clear slab clicked for index:', slabIndex);
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
    console.log('Remove slab clicked for index:', slabIndex);
    if (slabs.length > 1) { // Keep at least one slab
      setSlabs(prev => {
        const updated = prev.filter((_, index) => index !== slabIndex);
        // Renumber remaining slabs
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
    console.log('Clear all slabs clicked');
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

      // Generate unique dispatch ID and timestamp
      const dispatchId = `DISPATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const dispatchTimestamp = new Date();
      
      console.log(`Creating new dispatch batch: ${dispatchId}`);
      console.log(`Dispatch timestamp: ${dispatchTimestamp.toISOString()}`);
      console.log('Saving slabs to database...');
      
      // Save each slab to the database with dispatch batch info
      const savedSlabs = [];
      for (let i = 0; i < validSlabs.length; i++) {
        const slab = validSlabs[i];
        
        const slabData = {
          // Dispatch batch information
          dispatchId: dispatchId,
          dispatchTimestamp: dispatchTimestamp,
          
          // Existing dispatch info
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber,
          dispatchVehicleNumber: dispatchInfo.dispatchVehicleNumber,
          supervisorName: dispatchInfo.supervisorName,
          partyName: dispatchInfo.partyName,
          
          // Slab specific data
          slabNumber: slab.slabNumber,
          thickness: slab.thickness,
          length: slab.length,
          height: slab.height,
          cornerDeductions: slab.cornerDeductions.map(corner => ({
            length: corner.length,
            height: corner.height,
            area: corner.area
          })),
          measurementUnit: dispatchInfo.measurementUnit,
          grossArea: slab.grossArea,
          totalDeductionArea: slab.totalDeductionArea,
          netArea: slab.netArea
        } as Omit<SlabMeasurement, 'id' | 'timestamp'>;

        console.log(`Attempting to save slab ${slab.slabNumber} for dispatch ${dispatchId}:`, slabData);
        
        try {
          const savedSlab = await apiService.createSlab(slabData);
          savedSlabs.push(savedSlab);
          console.log(`Slab ${slab.slabNumber} saved successfully:`, savedSlab);
        } catch (slabError) {
          console.error(`Error saving slab ${slab.slabNumber}:`, slabError);
          throw new Error(`Failed to save slab ${slab.slabNumber}: ${slabError instanceof Error ? slabError.message : 'Unknown error'}`);
        }
      }

      // Show success message with dispatch details
      const successMessage = `✅ Dispatch saved successfully!\n\n` +
        `Dispatch ID: ${dispatchId}\n` +
        `Timestamp: ${dispatchTimestamp.toLocaleString()}\n` +
        `Slabs saved: ${savedSlabs.length}\n` +
        `Total net area: ${savedSlabs.reduce((sum, slab) => sum + slab.netArea, 0).toFixed(2)} ${dispatchInfo.measurementUnit}²`;
      
      alert(successMessage);
      
      // Optional: Reset form or redirect
      // window.location.reload(); // Uncomment if you want to reset the form
      
    } catch (error) {
      console.error('Error saving slabs:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Error saving slabs to database. ';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage += 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
        } else if (error.message.includes('400')) {
          errorMessage += 'Validation error: ' + error.message;
        } else if (error.message.includes('500')) {
          errorMessage += 'Server error. Please check the database connection.';
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += 'Unknown error occurred.';
      }
      
      errorMessage += '\n\nPlease check the browser console for more details.';
      
      alert(errorMessage);
    }
  };

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      const healthResponse = await apiService.healthCheck();
      console.log('Health check response:', healthResponse);
      
      const testSlabData = {
        dispatchId: 'TEST-DISPATCH-001',
        dispatchTimestamp: new Date(),
        materialName: 'Test Material',
        lotNumber: 'TEST-001',
        dispatchVehicleNumber: 'TEST-VEH-001',
        supervisorName: 'Test Supervisor',
        partyName: 'Test Party',
        slabNumber: 999,
        thickness: 10,
        length: 100,
        height: 50,
        cornerDeductions: [
          { length: 5, height: 5, area: 25 },
          { length: 0, height: 0, area: 0 },
          { length: 0, height: 0, area: 0 },
          { length: 0, height: 0, area: 0 }
        ],
        measurementUnit: 'mm' as MeasurementUnit,
        grossArea: 5000,
        totalDeductionArea: 25,
        netArea: 4975
      } as Omit<SlabMeasurement, 'id' | 'timestamp'>;
      
      console.log('Attempting to save test slab:', testSlabData);
      const savedSlab = await apiService.createSlab(testSlabData);
      console.log('Test slab saved successfully:', savedSlab);
      
      // Clean up test data
      if (savedSlab.id) {
        await apiService.deleteSlab(savedSlab.id);
        console.log('Test slab cleaned up');
      }
      
      alert('✅ Database connection test successful!\n\nThe database is working correctly.');
    } catch (error) {
      console.error('Database connection test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Database connection test failed:\n\n${errorMessage}\n\nPlease check the console for more details.`);
    }
  };

  const getTotalArea = () => {
    return slabs.reduce((total, slab) => total + slab.netArea, 0);
  };

  // PDF Generation Function - Professional Blue Design with Enhanced Styling
  const generatePDF = () => {
    console.log('Generating PDF...');
    
    // Generate dispatch ID for PDF (same format as database)
    const dispatchId = `DISPATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const dispatchTimestamp = new Date();
    
    const pdf = new jsPDF('landscape');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 25;

    // Helper functions
    const formatDate = (date: Date) => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-GB', { hour12: false });
    };

    // Professional Header with Shadow Effect
    pdf.setFillColor(41, 98, 255); // Professional blue
    pdf.rect(0, 0, pageWidth, 60, 'F');
    
    // Header shadow effect
    pdf.setFillColor(0, 0, 0, 0.1);
    pdf.rect(0, 58, pageWidth, 4, 'F');
    
    // Company name
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SAMDANI GROUP', 30, 35);
    
    // Subtitle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Dispatch Management System', 30, 50);
    
    // Date and time in header
    pdf.setFontSize(12);
    pdf.text(`Generated: ${formatDate(dispatchTimestamp)} ${formatTime(dispatchTimestamp)}`, pageWidth - 30, 35, { align: 'right' });
    pdf.text(`Dispatch ID: ${dispatchId.split('-')[1]}`, pageWidth - 30, 50, { align: 'right' });
    
    yPosition = 80;

    // Information Card with Shadow
    pdf.setFillColor(255, 255, 255);
    pdf.rect(25, yPosition, pageWidth - 50, 70, 'F');
    
    // Card shadow
    pdf.setFillColor(0, 0, 0, 0.1);
    pdf.rect(27, yPosition + 2, pageWidth - 50, 70, 'F');
    
    // Card border
    pdf.setDrawColor(41, 98, 255);
    pdf.setLineWidth(2);
    pdf.rect(25, yPosition, pageWidth - 50, 70);
    
    // Information content
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DISPATCH INFORMATION', 35, yPosition + 20);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    // Left column info
    pdf.text(`Material Name: ${dispatchInfo.materialName || 'Not specified'}`, 35, yPosition + 35);
    pdf.text(`Lot Number: ${dispatchInfo.lotNumber || 'Not specified'}`, 35, yPosition + 47);
    pdf.text(`Vehicle Number: ${dispatchInfo.dispatchVehicleNumber || 'Not specified'}`, 35, yPosition + 59);
    
    // Right column info
    const midPoint = pageWidth / 2 + 20;
    pdf.text(`Party Name: ${dispatchInfo.partyName || 'Not specified'}`, midPoint, yPosition + 35);
    pdf.text(`Supervisor: ${dispatchInfo.supervisorName || 'Not specified'}`, midPoint, yPosition + 47);
    pdf.text(`Measurement Unit: ${dispatchInfo.measurementUnit}`, midPoint, yPosition + 59);
    
    yPosition += 90;

    // Statistics section with enhanced styling
    const validSlabs = slabs.filter(slab => 
      slab.thickness > 0 || slab.length > 0 || slab.height > 0
    );
    
    pdf.setFillColor(240, 248, 255); // Light blue background
    pdf.rect(25, yPosition, pageWidth - 50, 35, 'F');
    pdf.setDrawColor(41, 98, 255);
    pdf.setLineWidth(1);
    pdf.rect(25, yPosition, pageWidth - 50, 35);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 98, 255);
    pdf.text('MEASUREMENT SUMMARY', 35, yPosition + 15);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Total slabs in this measurement: ${validSlabs.length}`, 35, yPosition + 27);
    pdf.text(`Measurement unit: ${dispatchInfo.measurementUnit}`, pageWidth - 35, yPosition + 27, { align: 'right' });
    
    yPosition += 50;

    // Enhanced table header with gradient effect
    pdf.setFillColor(41, 98, 255);
    pdf.rect(25, yPosition, pageWidth - 50, 18, 'F');
    
    // Header shadow
    pdf.setFillColor(0, 0, 0, 0.2);
    pdf.rect(25, yPosition + 16, pageWidth - 50, 2, 'F');
    
    // Column setup with very compact widths - to fit all in one row
    const columns = [
      { header: 'Slab #', width: 25, align: 'center' },
      { header: 'Length', width: 28, align: 'right' },
      { header: 'Height', width: 28, align: 'right' },
      { header: 'Thick', width: 28, align: 'right' },
      { header: 'Gross Area', width: 32, align: 'right' },
      { header: 'C1 Area', width: 24, align: 'right' },
      { header: 'C2 Area', width: 24, align: 'right' },
      { header: 'C3 Area', width: 24, align: 'right' },
      { header: 'C4 Area', width: 24, align: 'right' },
      { header: 'Deducted Area', width: 32, align: 'right' },
      { header: 'Net Area', width: 32, align: 'right' }
    ];
    
    // Calculate column positions
    let currentX = 25;
    const colPositions = columns.map(col => {
      const pos = currentX;
      currentX += col.width;
      return pos;
    });
    
    // Header text with enhanced styling - smaller font for better fit
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    
    columns.forEach((col, index) => {
      if (col.align === 'center') {
        pdf.text(col.header, colPositions[index] + col.width / 2, yPosition + 12, { align: 'center' });
      } else if (col.align === 'right') {
        pdf.text(col.header, colPositions[index] + col.width - 3, yPosition + 12, { align: 'right' });
      } else {
        pdf.text(col.header, colPositions[index] + 3, yPosition + 12);
      }
    });
    
    yPosition += 18;

    // Enhanced table rows with alternating colors and borders - smaller font
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    
    validSlabs.forEach((slab, index) => {
      const rowHeight = 10;
      
      // Check for new page
      if (yPosition > pageHeight - 50) {
        pdf.addPage('landscape');
        yPosition = 30;
        
        // Redraw enhanced header on new page
        pdf.setFillColor(41, 98, 255);
        pdf.rect(25, yPosition, pageWidth - 50, 18, 'F');
        pdf.setFillColor(0, 0, 0, 0.2);
        pdf.rect(25, yPosition + 16, pageWidth - 50, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        
        columns.forEach((col, colIndex) => {
          if (col.align === 'center') {
            pdf.text(col.header, colPositions[colIndex] + col.width / 2, yPosition + 12, { align: 'center' });
          } else if (col.align === 'right') {
            pdf.text(col.header, colPositions[colIndex] + col.width - 3, yPosition + 12, { align: 'right' });
          } else {
            pdf.text(col.header, colPositions[colIndex] + 3, yPosition + 12);
          }
        });
        
        yPosition += 18;
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
      }
      
      // Alternating row colors with subtle gradient
      if (index % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(25, yPosition, pageWidth - 50, rowHeight, 'F');
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(25, yPosition, pageWidth - 50, rowHeight, 'F');
      }
      
      // Enhanced row border
      pdf.setDrawColor(220, 220, 220);
      pdf.rect(25, yPosition, pageWidth - 50, rowHeight);
      
      // Vertical separators with subtle styling
      colPositions.forEach((pos, colIndex) => {
        if (colIndex > 0) {
          pdf.setDrawColor(230, 230, 230);
          pdf.line(pos, yPosition, pos, yPosition + rowHeight);
        }
      });
      
      // Row data with enhanced formatting
      const rowData = [
        slab.slabNumber.toString(),
        slab.length.toFixed(2),
        slab.height.toFixed(2),
        slab.thickness.toFixed(2),
        slab.grossArea.toFixed(2),
        slab.cornerDeductions[0]?.area.toFixed(2) || '0.00',
        slab.cornerDeductions[1]?.area.toFixed(2) || '0.00',
        slab.cornerDeductions[2]?.area.toFixed(2) || '0.00',
        slab.cornerDeductions[3]?.area.toFixed(2) || '0.00',
        slab.totalDeductionArea.toFixed(2),
        slab.netArea.toFixed(2)
      ];
      
      rowData.forEach((data, colIndex) => {
        const col = columns[colIndex];
        if (col.align === 'center') {
          pdf.text(data, colPositions[colIndex] + col.width / 2, yPosition + 7, { align: 'center' });
        } else if (col.align === 'right') {
          pdf.text(data, colPositions[colIndex] + col.width - 2, yPosition + 7, { align: 'right' });
        } else {
          pdf.text(data, colPositions[colIndex] + 2, yPosition + 7);
        }
      });
      
      yPosition += rowHeight;
    });

    // Enhanced summary section
    yPosition += 25;
    
    const totalGross = validSlabs.reduce((sum, slab) => sum + slab.grossArea, 0);
    const totalDeduct = validSlabs.reduce((sum, slab) => sum + slab.totalDeductionArea, 0);
    const totalNet = getTotalArea();
    
    // Summary card with gradient and shadow
    const summaryHeight = 60;
    pdf.setFillColor(240, 248, 255);
    pdf.rect(pageWidth - 220, yPosition, 190, summaryHeight, 'F');
    
    // Shadow effect
    pdf.setFillColor(0, 0, 0, 0.1);
    pdf.rect(pageWidth - 218, yPosition + 2, 190, summaryHeight, 'F');
    
    // Border with blue accent
    pdf.setDrawColor(41, 98, 255);
    pdf.setLineWidth(2);
    pdf.rect(pageWidth - 220, yPosition, 190, summaryHeight);
    
    // Summary content
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 98, 255);
    pdf.text('TOTALS', pageWidth - 210, yPosition + 15);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    const summaryData = [
      ['Total Gross Area:', `${totalGross.toFixed(2)} ${dispatchInfo.measurementUnit}²`],
      ['Total Deductions:', `${totalDeduct.toFixed(2)} ${dispatchInfo.measurementUnit}²`],
      ['Total Net Area:', `${totalNet.toFixed(2)} ${dispatchInfo.measurementUnit}²`]
    ];
    
    summaryData.forEach((row, index) => {
      const summaryY = yPosition + 30 + (index * 10);
      pdf.text(row[0], pageWidth - 210, summaryY);
      pdf.setFont('helvetica', 'bold');
      pdf.text(row[1], pageWidth - 40, summaryY, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
    });

    // Professional footer with enhanced styling
    const footerY = pageHeight - 25;
    pdf.setFillColor(41, 98, 255);
    pdf.rect(0, footerY - 5, pageWidth, 30, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(255, 255, 255);
    pdf.text('Generated by Samdani Group Dispatch Management System', pageWidth / 2, footerY + 5, { align: 'center' });
    pdf.text(`© ${new Date().getFullYear()} Samdani Group. All rights reserved.`, pageWidth / 2, footerY + 15, { align: 'center' });

    // Enhanced filename with better formatting
    const fileName = `Dispatch_Report_${dispatchInfo.lotNumber || 'Default'}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`;
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
            <button 
              type="button"
              onClick={testDatabaseConnection}
              className="bg-blue-600 text-white font-medium text-lg px-8 py-3 rounded-lg cursor-pointer hover:bg-blue-700 min-w-48"
            >
              🔧 Test Database
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