import React, { useState } from 'react';
import { MeasurementUnit, CornerDeduction } from '../../types';
import { apiService } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

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

  // Party options with ability to add new
  const [parties, setParties] = useState([
    'Party A',
    'Party B',
    'Party C'
  ]);

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState('');
  const [showAddParty, setShowAddParty] = useState(false);
  const [newParty, setNewParty] = useState('');

  // Multiple slabs (minimum 5)
  const [slabs, setSlabs] = useState<SlabFormData[]>(() => 
    Array.from({ length: 5 }, (_, index) => ({
      id: `slab-${index + 1}`,
      slabNumber: index + 1,
      thickness: 0,
      length: 0,
      height: 0,
      cornerDeductions: [
        { id: '1', length: 0, height: 0, area: 0 }
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

  const addNewParty = () => {
    if (newParty.trim() && !parties.includes(newParty.trim())) {
      setParties(prev => [...prev, newParty.trim()]);
      setDispatchInfo(prev => ({ ...prev, partyName: newParty.trim() }));
      setNewParty('');
      setShowAddParty(false);
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
      // Convert to feet for area calculation
      const lengthInFeet = slab.length * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      const heightInFeet = slab.height * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      slab.grossArea = lengthInFeet * heightInFeet;
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
      
      // Convert to feet for area calculation
      const cornerLengthInFeet = corner.length * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                                dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      const cornerHeightInFeet = corner.height * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                                dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      corner.area = cornerLengthInFeet * cornerHeightInFeet;
      
      updated[slabIndex].cornerDeductions[cornerIndex] = corner;
      
      const slab = updated[slabIndex];
      const lengthInFeet = slab.length * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      const heightInFeet = slab.height * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      slab.grossArea = lengthInFeet * heightInFeet;
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
        // Recalculate areas in ft²
        const lengthInFeet = slab.length * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                          dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                          dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
        const heightInFeet = slab.height * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                          dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                          dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
        slab.grossArea = lengthInFeet * heightInFeet;
        // Recalculate deduction areas in ft²
        slab.cornerDeductions = slab.cornerDeductions.map(corner => {
          const cornerLengthInFeet = corner.length * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                    dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                                    dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
          const cornerHeightInFeet = corner.height * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                    dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                                    dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
          return {
            ...corner,
            area: cornerLengthInFeet * cornerHeightInFeet
          };
        });
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
            { id: '1', length: 0, height: 0, area: 0 }
          ],
          grossArea: 0,
          totalDeductionArea: 0,
          netArea: 0
        };
        return updated;
      });
    }
  };

  const fillDefaultSlab = (slabIndex: number) => {
    if (window.confirm(`Are you sure you want to fill all values with default for Slab #${slabIndex + 1}?`)) {
      setSlabs(prev => {
        const updated = [...prev];
        updated[slabIndex] = {
          ...updated[slabIndex],
          thickness: 1,
          length: 1,
          height: 1,
          cornerDeductions: [
            { id: '1', length: 1, height: 1, area: 1 }
          ],
          grossArea: 1,
          totalDeductionArea: 1,
          netArea: 0
        };
        return updated;
      });
    }
  };

  const removeSlab = (slabIndex: number) => {
    if (slabs.length > 1) { 
      setSlabs(prev => prev.filter((_, index) => index !== slabIndex));
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
          { id: '1', length: 0, height: 0, area: 0 }
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
        { id: '1', length: 0, height: 0, area: 0 }
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
      
      // Generate a single dispatchId for all slabs
      const dispatchId = `DISP-${Date.now()}-${dispatchInfo.lotNumber}`;
      const dispatchTimestamp = new Date();
      
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
          dispatchId,
          dispatchTimestamp,
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber,
          dispatchVehicleNumber: dispatchInfo.dispatchVehicleNumber,
          supervisorName: dispatchInfo.supervisorName,
          partyName: dispatchInfo.partyName,
          slabNumber: slab.slabNumber,
          thickness: slab.thickness,
          length: slab.length,
          height: slab.height,
          cornerDeductions: slab.cornerDeductions.map(({ length, height, area }) => ({
            length,
            height,
            area
          })),
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
      // Navigate to slabs database page after successful save
      navigate('/slabs', { state: { preserveScroll: true } });
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
  
  const generatePDF = async () => {
    try {
      // First save to database
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
      
      // Generate a single dispatchId for all slabs
      const dispatchId = `DISP-${Date.now()}-${dispatchInfo.lotNumber}`;
      const dispatchTimestamp = new Date();
      
      // Save each slab
      const savedSlabs = [];
      for (let i = 0; i < validSlabs.length; i++) {
        const slab = validSlabs[i];
        const slabData = {
          dispatchId,
          dispatchTimestamp,
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber,
          dispatchVehicleNumber: dispatchInfo.dispatchVehicleNumber,
          supervisorName: dispatchInfo.supervisorName,
          partyName: dispatchInfo.partyName,
          slabNumber: slab.slabNumber,
          thickness: slab.thickness,
          length: slab.length,
          height: slab.height,
          cornerDeductions: slab.cornerDeductions.map(({ length, height, area }) => ({
            length,
            height,
            area
          })),
          measurementUnit: dispatchInfo.measurementUnit,
          grossArea: slab.grossArea,
          totalDeductionArea: slab.totalDeductionArea,
          netArea: slab.netArea
        };
        
        const savedSlab = await apiService.createSlab(slabData);
        savedSlabs.push(savedSlab);
      }

      // After successful save, generate PDF
      const pdf = new jsPDF('landscape');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15; // Reduced margin for single page
      let yPosition = 10; // Start closer to top

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

      // Company Details
      const companyDetails = {
        name: 'SAMDANI GROUP',
        addressLine1: '123 Industrial Zone, Main Road',
        addressLine2: 'Cityville, ST 12345',
        phone: 'Phone: (555) 123-4567',
        email: 'Email: contact@samdanigroup.com',
      };

      // Add Header with compact layout
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
      
      // Company name and dispatch note on same line
      pdf.text(companyDetails.name, margin, yPosition);
      pdf.setFontSize(12);
      pdf.text('DISPATCH NOTE', pageWidth - margin, yPosition, { align: 'right' });
      addSpacing(1);

      // Company details in two columns with minimal spacing
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(TEXT_COLOR_DARK);
      
      // Left column - Company details
      pdf.text(companyDetails.addressLine1, margin, yPosition);
      pdf.text(companyDetails.addressLine2, margin, yPosition + 4);
      pdf.text(companyDetails.phone, margin, yPosition + 8);
      pdf.text(companyDetails.email, margin, yPosition + 12);

      // Right column - Dispatch details
      const dispatchNoteNumber = `DN-${Date.now().toString().slice(-6)}`;
      pdf.text(`Dispatch No: ${dispatchNoteNumber}`, pageWidth - margin, yPosition, { align: 'right' });
      pdf.text(`Date: ${formattedDate}`, pageWidth - margin, yPosition + 4, { align: 'right' });
      addSpacing(3);

      // Add first separator
      addSeparator();

      // Add Party and Dispatch Information in a compact format
      const col1X = margin;
      const col2X = margin + (pageWidth - 2 * margin) / 2 + 20;
      const infoY = yPosition;

      // Billed To and Dispatched From section with background
      pdf.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
      pdf.rect(col1X - 5, infoY - 5, (pageWidth - 2 * margin) / 2, 25, 'F');
      pdf.rect(col2X - 5, infoY - 5, (pageWidth - 2 * margin) / 2, 25, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('BILLED TO:', col1X, infoY);
      pdf.text('DISPATCHED FROM:', col2X, infoY);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dispatchInfo.partyName || 'N/A', col1X, infoY + 5);
      pdf.text(companyDetails.name, col2X, infoY + 5);
      yPosition = infoY + 12;

      // Material and Vehicle Info
      pdf.setFont('helvetica', 'bold');
      pdf.text('MATERIAL:', col1X, yPosition);
      pdf.text('VEHICLE NO.:', col2X, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dispatchInfo.materialName || 'N/A', col1X + 70, yPosition);
      pdf.text(dispatchInfo.dispatchVehicleNumber || 'N/A', col2X + 70, yPosition);
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

      // Prepare table data
      const tableData = validSlabs.map(slab => [
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
      ]);

      const totalTableWidth = 273; // sum of all cellWidths
      const centeredMargin = (pageWidth - totalTableWidth) / 2;

      // Add table using autoTable with compact configuration
      autoTable(pdf, {
        startY: yPosition,
        head: [[
          'Slab #',
          `L (${dispatchInfo.measurementUnit})`,
          `H (${dispatchInfo.measurementUnit})`,
          `T (${dispatchInfo.measurementUnit})`,
          `Gross (${dispatchInfo.measurementUnit}²)`,
          `C1 (${dispatchInfo.measurementUnit}²)`,
          `C2 (${dispatchInfo.measurementUnit}²)`,
          `C3 (${dispatchInfo.measurementUnit}²)`,
          `C4 (${dispatchInfo.measurementUnit}²)`,
          `Deduct (${dispatchInfo.measurementUnit}²)`,
          `Net (${dispatchInfo.measurementUnit}²)`
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
          0: { cellWidth: 18, halign: 'center' },
          1: { cellWidth: 20 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 20 },
          8: { cellWidth: 20 },
          9: { cellWidth: 25 },
          10: { cellWidth: 25 }
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
          // Add page number only if multiple pages
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
      const finalY = (pdf as any).lastAutoTable.finalY + 15;

      // Add totals with compact layout
      const totalGross = validSlabs.reduce((sum, slab) => sum + slab.grossArea, 0);
      const totalDeduct = validSlabs.reduce((sum, slab) => sum + slab.totalDeductionArea, 0);
      const totalNet = getTotalArea();

      const totalsXLabel = pageWidth - margin - 180;
      const totalsXValue = pageWidth - margin - 5;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Total Slabs Dispatched:', totalsXLabel, finalY);
      pdf.text(validSlabs.length.toString(), totalsXValue, finalY, { align: 'right' });

      pdf.text(`Total Gross Area (${dispatchInfo.measurementUnit}²):`, totalsXLabel, finalY + 5);
      pdf.text(totalGross.toFixed(2), totalsXValue, finalY + 5, { align: 'right' });

      pdf.text(`Total Deduction Area (${dispatchInfo.measurementUnit}²):`, totalsXLabel, finalY + 10);
      pdf.text(totalDeduct.toFixed(2), totalsXValue, finalY + 10, { align: 'right' });

      pdf.setFont('helvetica', 'bold');
      pdf.text(`TOTAL NET DISPATCHED AREA (${dispatchInfo.measurementUnit}²):`, totalsXLabel, finalY + 15);
      pdf.text(totalNet.toFixed(2), totalsXValue, finalY + 15, { align: 'right' });

      // Add notes and signature in a compact format with increased spacing
      const notesY = finalY + 55;
      const signatureX = pageWidth - margin - 80;

      // Add notes without background
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

      // Save PDF with formatted filename
      const fileName = `Dispatch_Note_${dispatchInfo.partyName || 'UnknownParty'}_${dispatchInfo.lotNumber || 'NoLot'}_${formattedDate.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      alert(`Successfully saved ${savedSlabs.length} slabs to database and generated PDF report!`);
      // Navigate to slabs database page after successful save and PDF generation
      navigate('/slabs', { state: { preserveScroll: true } });
    } catch (error) {
      console.error('Error saving slabs or generating PDF:', error);
      alert('Error saving slabs or generating PDF. Please check the console for more details.');
    }
  };

  const addCornerDeduction = (slabIndex: number) => {
    if (slabs[slabIndex].cornerDeductions.length >= 4) return;
    if (window.confirm('Do you really want to add a corner deduction?')) {
      setSlabs(prev => {
        const updated = [...prev];
        const nextId = (updated[slabIndex].cornerDeductions.length + 1).toString();
        updated[slabIndex] = {
          ...updated[slabIndex],
          cornerDeductions: [
            ...updated[slabIndex].cornerDeductions,
            { id: nextId, length: 0, height: 0, area: 0 }
          ]
        };
        return updated;
      });
    }
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
              <div className="flex space-x-2">
                <select
                  value={dispatchInfo.partyName}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      setShowAddParty(true);
                    } else {
                      handleDispatchInfoChange('partyName', e.target.value);
                    }
                  }}
                  className="input-field flex-1"
                >
                  <option value="">Select Party</option>
                  {parties.map(party => (
                    <option key={party} value={party}>{party}</option>
                  ))}
                  <option value="ADD_NEW">+ Add New Party</option>
                </select>
              </div>
              
              {showAddParty && (
                <div className="mt-2 flex space-x-2">
                  <input
                    type="text"
                    value={newParty}
                    onChange={(e) => setNewParty(e.target.value)}
                    placeholder="Enter new party name"
                    className="input-field flex-1"
                  />
                  <button type="button" onClick={addNewParty} className="btn-primary">Add</button>
                  <button type="button" onClick={() => {
                    setShowAddParty(false);
                    setNewParty('');
                  }} className="btn-secondary">Cancel</button>
                </div>
              )}
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
                  <button
                    type="button"
                    onClick={() => fillDefaultSlab(slabIndex)}
                    className="bg-gray-500 text-white font-medium py-1 px-3 rounded-lg cursor-pointer hover:bg-gray-700 text-sm"
                  >
                    Fill Default
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
                    Net Area: {slab.netArea.toFixed(2)} ft²
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
                          <div className="flex space-x-1 mb-1">
                            <input
                              type="number"
                              step="0.01"
                              value={corner.length === 0 ? '' : corner.length}
                              onChange={(e) => handleCornerDeductionChange(slabIndex, cornerIndex, 'length', parseFloat(e.target.value) || 0)}
                              placeholder="L"
                              className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={corner.height === 0 ? '' : corner.height}
                              onChange={(e) => handleCornerDeductionChange(slabIndex, cornerIndex, 'height', parseFloat(e.target.value) || 0)}
                              placeholder="H"
                              className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded"
                            />
                          </div>
                          <div className="text-xs text-gray-500">
                            Area: {corner.area.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => addCornerDeduction(slabIndex)}
                      className="btn-secondary text-xs"
                      disabled={slab.cornerDeductions.length >= 4}
                    >
                      Add Corner
                    </button>
                  </div>
                </div>
              </div>

              {/* Calculated Results */}
              <div className="mt-4 grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Gross Area</div>
                  <div className="font-semibold text-blue-600">{slab.grossArea.toFixed(2)} ft²</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Deductions</div>
                  <div className="font-semibold text-orange-600">{slab.totalDeductionArea.toFixed(2)} ft²</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Net Area</div>
                  <div className="font-semibold text-green-600">{slab.netArea.toFixed(2)} ft²</div>
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
                <div className="text-2xl font-bold text-blue-900">{getTotalArea().toFixed(2)} ft²</div>
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