import React, { useState, useRef, useEffect } from 'react';
import { MeasurementUnit, CornerDeduction, SlabMeasurement } from '../../types';
import { apiService } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';

interface SlabFormData {
  id: string;
  slabNumber: number;
  length: number;
  height: number;
  cornerDeductions: CornerDeduction[];
  grossArea: number;
  totalDeductionArea: number;
  netArea: number;
  timestamp: Date;
}

const SlabEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Common dispatch information
  const [dispatchInfo, setDispatchInfo] = useState({
    materialName: '',
    lotNumber: '',
    dispatchVehicleNumber: '',
    supervisorName: user?.username || '',
    partyName: '',
    measurementUnit: 'inches' as MeasurementUnit,
    thickness: 16 // Default thickness
  });

  // Single slab form data
  const [slab, setSlab] = useState<SlabFormData>({
    id: '',
    slabNumber: 1,
    length: 0,
    height: 0,
    cornerDeductions: [
      { id: '1', length: 0, height: 0, area: 0 }
    ],
    grossArea: 0,
    totalDeductionArea: 0,
    netArea: 0,
    timestamp: new Date()
  });

  // Current dispatch slabs (temporary storage before saving to DB)
  const [currentDispatchSlabs, setCurrentDispatchSlabs] = useState<SlabFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [slabNumberInput, setSlabNumberInput] = useState('1');

  // UI state
  const [thicknessOptions] = useState([16, 18, 20]);
  const [showThicknessSuggestions, setShowThicknessSuggestions] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Material and party options
  const [materials, setMaterials] = useState([
    'Granite Red',
    'Granite Black',
    'Marble White',
    'Marble Black',
    'Quartz Premium'
  ]);

  const [parties, setParties] = useState<string[]>([]);
  const [partyQuery, setPartyQuery] = useState('');
  const [loadingParties, setLoadingParties] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterial, setNewMaterial] = useState('');
  const [showAddParty, setShowAddParty] = useState(false);
  const [newParty, setNewParty] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Load initial data and slabs
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load materials from database
        const materialsData = await apiService.getMaterials();
        setMaterials(materialsData.map((m: { name: string }) => m.name));
        
        // Generate automatic lot number with format YYYYMM-DispatchCode
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const dispatchData = await apiService.getNextDispatchCode(year, month);
        setDispatchInfo(prev => ({
          ...prev,
          lotNumber: dispatchData.nextLotNumber
        }));

        // Initialize empty dispatch slabs
        setCurrentDispatchSlabs([]);
      } catch (error) {
        console.error('Error loading initial data:', error);
        setMaterials([
          'Granite Red',
          'Granite Black', 
          'Marble White',
          'Marble Black',
          'Quartz Premium'
        ]);
      }
    };
    
    loadInitialData();
  }, []);

  // Fetch parties from backend as user types
  useEffect(() => {
    let active = true;
    setLoadingParties(true);
    apiService.getParties(partyQuery)
      .then((data) => {
        if (active) {
          setParties(data.map((p: { name: string }) => p.name));
        }
      })
      .finally(() => {
        if (active) setLoadingParties(false);
      });
    return () => { active = false; };
  }, [partyQuery]);

  // Clear slabs when lot number changes (new dispatch)
  useEffect(() => {
    if (dispatchInfo.lotNumber) {
      setCurrentDispatchSlabs([]);
    }
  }, [dispatchInfo.lotNumber]);

  // Auto-set next slab number when dispatch slabs change
  useEffect(() => {
    if (currentDispatchSlabs.length > 0) {
      const maxSlabNumber = Math.max(...currentDispatchSlabs.map(s => s.slabNumber));
      const nextNumber = maxSlabNumber + 1;
      setSlab(prev => ({ ...prev, slabNumber: nextNumber }));
      setSlabNumberInput((nextNumber || 1).toString());
    } else {
      setSlab(prev => ({ ...prev, slabNumber: 1 }));
      setSlabNumberInput('1');
    }
  }, [currentDispatchSlabs]);

  // No longer needed - using temporary storage

  const handleDispatchInfoChange = (field: string, value: any) => {
    setDispatchInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSlabChange = (field: string, value: number | string) => {
    setSlab(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // Calculate areas with safety checks
      const lengthValue = Number(updated.length) || 0;
      const heightValue = Number(updated.height) || 0;
      
      const lengthInFeet = lengthValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      const heightInFeet = heightValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                        dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      updated.grossArea = Number((lengthInFeet * heightInFeet).toFixed(4)) || 0;
      updated.totalDeductionArea = updated.cornerDeductions.reduce((sum, corner) => sum + (Number(corner.area) || 0), 0);
      updated.netArea = Math.max(0, updated.grossArea - updated.totalDeductionArea);
      
      return updated;
    });
  };

  const handleCornerDeductionChange = (cornerIndex: number, field: keyof Omit<CornerDeduction, 'id' | 'area'>, value: number) => {
    setSlab(prev => {
      const updated = { ...prev };
      updated.cornerDeductions = [...updated.cornerDeductions];
      updated.cornerDeductions[cornerIndex] = {
        ...updated.cornerDeductions[cornerIndex],
        [field]: value
      };

      // Calculate corner area in square feet with safety checks
      const corner = updated.cornerDeductions[cornerIndex];
      const cornerLengthValue = Number(corner.length) || 0;
      const cornerHeightValue = Number(corner.height) || 0;
      
      const lengthInFeet = cornerLengthValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                           dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                           dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      const heightInFeet = cornerHeightValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                           dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 
                                           dispatchInfo.measurementUnit === 'mm' ? 0.00328084 : 1);
      
      corner.area = Number((lengthInFeet * heightInFeet).toFixed(4)) || 0;

      // Recalculate totals
      updated.totalDeductionArea = updated.cornerDeductions.reduce((sum, c) => sum + (Number(c.area) || 0), 0);
      updated.netArea = Math.max(0, (Number(updated.grossArea) || 0) - updated.totalDeductionArea);

      return updated;
    });
  };

  const addCornerDeduction = () => {
    if (slab.cornerDeductions.length < 4) {
      setSlab(prev => ({
        ...prev,
        cornerDeductions: [...prev.cornerDeductions, {
          id: `${prev.cornerDeductions.length + 1}`,
          length: 0,
          height: 0,
          area: 0
        }]
      }));
    }
  };

  const removeCornerDeduction = (index: number) => {
    if (slab.cornerDeductions.length > 1) {
      setSlab(prev => {
        const updated = { ...prev };
        updated.cornerDeductions = updated.cornerDeductions.filter((_, i) => i !== index);
        updated.totalDeductionArea = updated.cornerDeductions.reduce((sum, c) => sum + (Number(c.area) || 0), 0);
        updated.netArea = Math.max(0, (Number(updated.grossArea) || 0) - updated.totalDeductionArea);
        return updated;
      });
    }
  };

  const clearSlab = () => {
    const nextSlabNumber = currentDispatchSlabs.length > 0 
      ? Math.max(...currentDispatchSlabs.map(s => s.slabNumber)) + 1 
      : 1;
    setSlab({
      id: '',
      slabNumber: nextSlabNumber,
      length: 0,
      height: 0,
      cornerDeductions: [
        { id: '1', length: 0, height: 0, area: 0 }
      ],
      grossArea: 0,
      totalDeductionArea: 0,
      netArea: 0,
      timestamp: new Date()
    });
    setSlabNumberInput((nextSlabNumber || 1).toString());
  };

  const copySlab = (slabToCopy: SlabFormData) => {
    setSlab({
      id: '',
      slabNumber: slab.slabNumber,
      length: slabToCopy.length,
      height: slabToCopy.height,
      cornerDeductions: slabToCopy.cornerDeductions.map((corner, index) => ({
        id: `${index + 1}`,
        length: corner.length,
        height: corner.height,
        area: corner.area
      })),
      grossArea: slabToCopy.grossArea,
      totalDeductionArea: slabToCopy.totalDeductionArea,
      netArea: slabToCopy.netArea,
      timestamp: new Date()
    });
  };

  const copyToNext = (slabToCopy: SlabFormData) => {
    const nextSlabNumber = currentDispatchSlabs.length > 0 
      ? Math.max(...currentDispatchSlabs.map(s => s.slabNumber)) + 1 
      : 1;

    setSlab({
      id: '',
      slabNumber: nextSlabNumber,
      length: slabToCopy.length,
      height: slabToCopy.height,
      cornerDeductions: slabToCopy.cornerDeductions.map((corner, index) => ({
        id: `${index + 1}`,
        length: corner.length,
        height: corner.height,
        area: corner.area
      })),
      grossArea: slabToCopy.grossArea,
      totalDeductionArea: slabToCopy.totalDeductionArea,
      netArea: slabToCopy.netArea,
      timestamp: new Date()
    });
    setSlabNumberInput((nextSlabNumber || 1).toString());
    
    // Show feedback to user
    alert(`Copied slab #${slabToCopy.slabNumber} data to slab #${nextSlabNumber}. Please check the form above.`);
    
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyPrevious = () => {
    if (currentDispatchSlabs.length === 0) {
      alert('No previous slabs to copy from');
      return;
    }

    // Get the latest slab (highest slab number)
    const latestSlab = currentDispatchSlabs.reduce((latest, current) => 
      current.slabNumber > latest.slabNumber ? current : latest
    );

    copySlab(latestSlab);
  };

  const addNewMaterial = async () => {
    if (newMaterial.trim() && !materials.includes(newMaterial.trim())) {
      try {
        await apiService.createMaterial(newMaterial.trim());
        setMaterials(prev => [...prev, newMaterial.trim()]);
        setDispatchInfo(prev => ({ ...prev, materialName: newMaterial.trim() }));
        setNewMaterial('');
        setShowAddMaterial(false);
      } catch (error) {
        console.error('Error adding material:', error);
        setMaterials(prev => [...prev, newMaterial.trim()]);
        setDispatchInfo(prev => ({ ...prev, materialName: newMaterial.trim() }));
        setNewMaterial('');
        setShowAddMaterial(false);
      }
    }
  };

  const addNewParty = async () => {
    if (newParty.trim()) {
      try {
        const created = await apiService.createParty(newParty.trim());
        setDispatchInfo(prev => ({ ...prev, partyName: created.name }));
        setNewParty('');
        setShowAddParty(false);
        setPartyQuery('');
      } catch (err) {
        alert((err as Error).message || 'Failed to add party');
      }
    }
  };

  const generateNewLotNumber = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const dispatchData = await apiService.getNextDispatchCode(year, month);
      setDispatchInfo(prev => ({
        ...prev,
        lotNumber: dispatchData.nextLotNumber
      }));
    } catch (error) {
      console.error('Error generating new lot number:', error);
      alert('Error generating new lot number. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!dispatchInfo.materialName || !dispatchInfo.lotNumber || !dispatchInfo.partyName) {
      alert('Please fill in all required dispatch information fields');
      return;
    }

    if (!slab.length || !slab.height) {
      alert('Please enter slab dimensions');
      return;
    }

    // Check for duplicate slab numbers in current dispatch
    const existingSlab = currentDispatchSlabs.find(s => s.slabNumber === slab.slabNumber);
    if (existingSlab) {
      alert(`Slab number ${slab.slabNumber} already exists in this dispatch. Please use a different number.`);
      return;
    }

    try {
      setError(null);

      // Add to temporary storage with unique ID
      const newSlab: SlabFormData = {
        ...slab,
        id: `temp-${Date.now()}-${slab.slabNumber}`,
        timestamp: new Date()
      };

      setCurrentDispatchSlabs(prev => [...prev, newSlab].sort((a, b) => a.slabNumber - b.slabNumber));
      
      // Show success feedback briefly
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      // Clear the form and increment slab number
      clearSlab();

    } catch (error) {
      console.error('Error adding slab:', error);
      setError(error instanceof Error ? error.message : 'Failed to add slab');
    }
  };

  const deleteSlab = (slabId: string) => {
    const slabToDelete = currentDispatchSlabs.find(s => s.id === slabId);
    if (slabToDelete && window.confirm(`Are you sure you want to delete slab #${slabToDelete.slabNumber}?`)) {
      setCurrentDispatchSlabs(prev => prev.filter(s => s.id !== slabId));
      alert(`Slab #${slabToDelete.slabNumber} has been deleted.`);
    }
  };

  // Generate Report - Save all slabs to database and create PDF
  const generateReport = async () => {
    if (currentDispatchSlabs.length === 0) {
      alert('Please add at least one slab before generating report');
      return;
    }

    if (!dispatchInfo.materialName || !dispatchInfo.lotNumber || !dispatchInfo.partyName) {
      alert('Please fill in all required dispatch information fields');
      return;
    }

    // Prompt user to confirm report generation
    const confirmGenerate = window.confirm(
      `Generate dispatch report for ${currentDispatchSlabs.length} slabs?\n\nThis will:\n• Save all slabs to database\n• Generate PDF report\n• Clear current dispatch\n\nProceed?`
    );
    if (!confirmGenerate) return;

    // Confirm vehicle number if empty
    if (!dispatchInfo.dispatchVehicleNumber) {
      const confirmWithoutVehicle = window.confirm(
        'Vehicle number is not specified. Do you want to generate the report without vehicle number?'
      );
      if (!confirmWithoutVehicle) return;
    }

    try {
      setLoading(true);
      setError(null);

      const dispatchId = `DISPATCH-${dispatchInfo.lotNumber}-${Date.now()}`;
      const dispatchTimestamp = new Date();

      // Save all slabs to database
      const savedSlabs: any[] = [];
      for (const tempSlab of currentDispatchSlabs) {
        const slabData = {
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber,
          partyName: dispatchInfo.partyName,
          supervisorName: dispatchInfo.supervisorName,
          thickness: dispatchInfo.thickness,
          measurementUnit: dispatchInfo.measurementUnit,
          dispatchVehicleNumber: dispatchInfo.dispatchVehicleNumber,
          slabNumber: tempSlab.slabNumber,
          length: tempSlab.length,
          height: tempSlab.height,
          cornerDeductions: tempSlab.cornerDeductions,
          grossArea: tempSlab.grossArea,
          totalDeductionArea: tempSlab.totalDeductionArea,
          netArea: tempSlab.netArea,
          dispatchId: dispatchId,
          dispatchTimestamp: dispatchTimestamp
        };

        const savedSlab = await apiService.createSlab(slabData);
        savedSlabs.push(savedSlab);
      }

      // Generate PDF report
      console.log('Generate Report Debug - Saved slabs before PDF:', savedSlabs);
      const pdfResult = await generatePDF(savedSlabs);
      if (!pdfResult) {
        throw new Error('Failed to generate PDF');
      }
      const { fileName, pdfBlob } = pdfResult;

      // Clear the dispatch after successful generation
      setCurrentDispatchSlabs([]);
      clearSlab();
      
      // Enhanced sharing function for mobile PDF sharing
      const sharePDFReport = async (pdfBlob: Blob, fileName: string) => {
        // Check if we can share files (mobile devices with modern browsers)
        if (navigator.share) {
          try {
            // Create File object from PDF blob for native sharing
            const pdfFile = new File([pdfBlob], fileName, { 
              type: 'application/pdf',
              lastModified: Date.now()
            });
            
            // Check if we can share the PDF file
            const shareDataWithFile = {
              files: [pdfFile],
              title: 'Samdani Group - Dispatch Report',
              text: `Dispatch Report - ${dispatchInfo.partyName} - ${dispatchInfo.lotNumber}`
            };
            
            // Try to share the PDF file directly
            if (navigator.canShare && navigator.canShare(shareDataWithFile)) {
              await navigator.share(shareDataWithFile);
              return;
            } else {
              // Fallback: try sharing just the file without text
              await navigator.share({ files: [pdfFile] });
              return;
            }
          } catch (error) {
            console.log('PDF file sharing failed:', error);
            
            // Fallback to text sharing if file sharing fails
            try {
              const shareText = `Samdani Group - Dispatch Report\n\nParty: ${dispatchInfo.partyName}\nLot Number: ${dispatchInfo.lotNumber}\nMaterial: ${dispatchInfo.materialName}\nTotal Slabs: ${savedSlabs.length}\nTotal Net Area: ${savedSlabs.reduce((sum: number, s: any) => sum + (s.netArea || 0), 0).toFixed(2)} ft²\n\nGenerated on: ${new Date().toLocaleDateString()}\n\nNote: PDF file "${fileName}" has been downloaded to your device.`;
              
            await navigator.share({
              title: 'Samdani Group - Dispatch Report',
                text: shareText
              });
              return;
            } catch (textError) {
              if (textError instanceof Error && textError.name !== 'AbortError') {
                console.log('Text sharing also failed:', textError);
              }
            }
          }
        }
        
        // Fallback for browsers without native sharing
        const shareText = `Samdani Group - Dispatch Report\n\nParty: ${dispatchInfo.partyName}\nLot Number: ${dispatchInfo.lotNumber}\nMaterial: ${dispatchInfo.materialName}\nTotal Slabs: ${savedSlabs.length}\nTotal Net Area: ${savedSlabs.reduce((sum: number, s: any) => sum + (s.netArea || 0), 0).toFixed(2)} ft²\n\nGenerated on: ${new Date().toLocaleDateString()}`;
        
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(shareText + `\n\nNote: PDF file "${fileName}" has been downloaded to your device.`);
            alert('✅ Report details copied to clipboard!\n\nPDF file has been downloaded. You can now paste the report information in WhatsApp, Email, or any other app.');
            return;
          } catch (clipboardError) {
            console.log('Clipboard access failed:', clipboardError);
          }
        }
        
        // Final fallback - show text in alert
        alert(`📋 Report Generated Successfully!\n\nPDF file "${fileName}" has been downloaded.\n\n${shareText}\n\nNote: Please manually share the downloaded PDF file from your device's file manager or downloads folder.`);
      };

      // Show success message with enhanced share option
      const shareReport = window.confirm(
        `✅ Report generated successfully!\n\n${savedSlabs.length} slabs saved to database.\nPDF downloaded as: ${fileName}\n\nWould you like to share this PDF file?\n\n📱 Mobile: Share actual PDF file to WhatsApp, Email, and all apps\n💻 Desktop: Copy report information`
      );
      
      if (shareReport) {
        await sharePDFReport(pdfBlob, fileName);
      }

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF function - Professional Business Format
  const generatePDF = async (slabs: any[]): Promise<{ fileName: string; pdfBlob: Blob } | undefined> => {
    // Safety check for slabs array
    if (!slabs || !Array.isArray(slabs) || slabs.length === 0) {
      alert('No valid slabs data to generate PDF');
      return undefined;
    }

    const pdf = new jsPDF('landscape');
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

    // Prepare enhanced table data with corner deductions
    console.log('PDF Debug - Slabs data:', slabs);
    console.log('PDF Debug - Dispatch info:', dispatchInfo);
    
    // Extract and normalize slab data for both table and totals
    const slabsWithAreas = slabs.map(slab => {
      console.log('PDF Debug - Processing slab:', slab);
      
      // Handle different possible property names from API response
      const slabNumber = slab.slabNumber || slab.slab?.slabNumber || 0;
      const length = slab.length || slab.slab?.length || 0;
      const height = slab.height || slab.slab?.height || 0;
      const grossArea = slab.grossArea || slab.slab?.grossArea || 0;
      const totalDeductionArea = slab.totalDeductionArea || slab.slab?.totalDeductionArea || 0;
      const netArea = slab.netArea || slab.slab?.netArea || 0;
      const corners = slab.cornerDeductions || slab.slab?.cornerDeductions || [];
      
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
      return [
        slab.slabNumber.toString(),
        slab.length.toFixed(2),
        slab.height.toFixed(2),
        (dispatchInfo.thickness || 0).toFixed(2),
        slab.grossArea.toFixed(2),
        (slab.corners[0]?.area || 0).toFixed(2),
        (slab.corners[1]?.area || 0).toFixed(2),
        (slab.corners[2]?.area || 0).toFixed(2),
        (slab.corners[3]?.area || 0).toFixed(2),
        slab.totalDeductionArea.toFixed(2),
        slab.netArea.toFixed(2)
      ];
    });
    
    console.log('PDF Debug - Table data:', tableData);
    console.log('PDF Debug - slabsWithAreas for totals:', slabsWithAreas);

    const totalTableWidth = 273;
    const centeredMargin = (pageWidth - totalTableWidth) / 2;

    // Add table using autoTable with enhanced columns
    autoTable(pdf, {
      startY: yPosition,
      head: [[
        'Slab #',
        `L (${dispatchInfo.measurementUnit})`,
        `H (${dispatchInfo.measurementUnit})`,
        `T (${dispatchInfo.measurementUnit})`,
        `Gross (ft²)`,
        `C1 (ft²)`,
        `C2 (ft²)`,
        `C3 (ft²)`,
        `C4 (ft²)`,
        `Deduct (ft²)`,
        `Net (ft²)`
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
    const totalGross = slabsWithAreas.reduce((sum, slab) => sum + (slab.grossArea || 0), 0);
    const totalDeduct = slabsWithAreas.reduce((sum, slab) => sum + (slab.totalDeductionArea || 0), 0);
    const totalNet = slabsWithAreas.reduce((sum, slab) => sum + (slab.netArea || 0), 0);
    
    console.log('PDF Debug - Calculated totals:');
    console.log('totalGross:', totalGross);
    console.log('totalDeduct:', totalDeduct);
    console.log('totalNet:', totalNet);
    console.log('PDF Debug - Individual slab values for totals:');
    slabsWithAreas.forEach((slab, index) => {
      console.log(`Slab ${index + 1} totals contribution:`, {
        grossArea: slab.grossArea,
        totalDeductionArea: slab.totalDeductionArea,
        netArea: slab.netArea
      });
    });

    const totalsXLabel = pageWidth - margin - 180;
    const totalsXValue = pageWidth - margin - 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Total Slabs Dispatched:', totalsXLabel, finalY);
    pdf.text((slabsWithAreas?.length || 0).toString(), totalsXValue, finalY, { align: 'right' });

    pdf.text(`Total Gross Area (ft²):`, totalsXLabel, finalY + 5);
    pdf.text(totalGross.toFixed(2), totalsXValue, finalY + 5, { align: 'right' });

    pdf.text(`Total Deduction Area (ft²):`, totalsXLabel, finalY + 10);
    pdf.text(totalDeduct.toFixed(2), totalsXValue, finalY + 10, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
    pdf.text(`TOTAL NET DISPATCHED AREA (ft²):`, totalsXLabel, finalY + 15);
    pdf.text(totalNet.toFixed(2), totalsXValue, finalY + 15, { align: 'right' });

    // Add notes and signature
    const notesY = finalY + 55;
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
    const fileName = `Dispatch_Note_${dispatchInfo.partyName || 'UnknownParty'}_${dispatchInfo.lotNumber || 'NoLot'}_${formattedDate.replace(/\//g, '-')}.pdf`;
    
    // Save PDF locally
    pdf.save(fileName);
    
    // Return both filename and PDF blob for sharing
    const pdfBlob = pdf.output('blob');
    return { fileName, pdfBlob };
  };

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slab Entry</h1>
          <p className="text-gray-600">Enter single slab measurements</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-secondary"
        >
          Back to Dashboard
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dispatch Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold">Dispatch Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Material Name */}
            <div className="form-group">
              <label className="form-label">Material Name *</label>
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
                  required
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
                  <button type="button" onClick={() => setShowAddMaterial(false)} className="btn-secondary">Cancel</button>
                </div>
              )}
            </div>

            {/* Lot Number */}
            <div className="form-group">
              <label className="form-label">Lot Number (UID) *</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={dispatchInfo.lotNumber}
                  className="input-field bg-gray-100 flex-1"
                  placeholder="Auto-generated (YYYYMM-DispatchCode)"
                  readOnly
                />
                <button
                  type="button"
                  onClick={generateNewLotNumber}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-1"
                  title="Generate new lot number"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Vehicle Number */}
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

            {/* Supervisor Name */}
            <div className="form-group">
              <label className="form-label">Supervisor Name *</label>
              <input
                type="text"
                value={dispatchInfo.supervisorName}
                onChange={(e) => handleDispatchInfoChange('supervisorName', e.target.value)}
                className="input-field bg-gray-100"
                placeholder="Auto-populated"
                readOnly
              />
            </div>

            {/* Party Name */}
            <div className="form-group">
              <label className="form-label">Party Name *</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={dispatchInfo.partyName}
                  onChange={e => {
                    handleDispatchInfoChange('partyName', e.target.value);
                    setPartyQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="input-field w-full"
                  placeholder="Type or select party name"
                  autoComplete="off"
                  required
                />
                {showSuggestions && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 max-h-52 overflow-y-auto">
                    {loadingParties ? (
                      <li className="px-4 py-2 text-gray-500">Loading...</li>
                    ) : parties.length === 0 ? (
                      <li className="px-4 py-2 text-gray-500">No parties found</li>
                    ) : parties.map(party => (
                      <li
                        key={party}
                        className="px-4 py-2 hover:bg-primary-100 cursor-pointer"
                        onMouseDown={() => {
                          handleDispatchInfoChange('partyName', party);
                          setShowSuggestions(false);
                        }}
                      >
                        {party}
                      </li>
                    ))}
                    <li className="border-t border-gray-200">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 hover:bg-primary-100 text-primary-700 font-medium"
                        onMouseDown={() => {
                          setShowAddParty(true);
                          setShowSuggestions(false);
                          setNewParty(dispatchInfo.partyName || '');
                        }}
                      >
                        + Add New Party
                      </button>
                    </li>
                  </ul>
                )}
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

            {/* Thickness */}
            <div className="form-group">
              <label className="form-label">Thickness (mm) *</label>
              <div className="relative">
                <input
                  type="number"
                  value={dispatchInfo.thickness}
                  onChange={(e) => {
                    handleDispatchInfoChange('thickness', parseInt(e.target.value));
                    setShowThicknessSuggestions(true);
                  }}
                  onFocus={() => setShowThicknessSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowThicknessSuggestions(false), 150)}
                  className="input-field"
                  placeholder="Enter thickness"
                  required
                />
                {showThicknessSuggestions && (
                  <ul className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded shadow mt-1 max-h-52 overflow-y-auto">
                    {thicknessOptions.map(option => (
                      <li
                        key={option}
                        className="px-4 py-2 hover:bg-primary-100 cursor-pointer"
                        onMouseDown={() => {
                          handleDispatchInfoChange('thickness', option);
                          setShowThicknessSuggestions(false);
                        }}
                      >
                        {option} mm
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Measurement Unit */}
            <div className="form-group">
              <label className="form-label">Measurement Unit *</label>
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

        {/* Single Slab Entry */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-lg font-semibold">Slab #</label>
                <input
                  type="text"
                  value={slabNumberInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow empty string for editing, or valid numbers
                    if (value === '' || /^\d+$/.test(value)) {
                      setSlabNumberInput(value);
                      if (value !== '') {
                        handleSlabChange('slabNumber', parseInt(value));
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // If empty on blur, set to 1
                    if (e.target.value === '') {
                      setSlabNumberInput('1');
                      handleSlabChange('slabNumber', 1);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="input-field w-16 text-center font-semibold"
                  placeholder="1"
                />
              </div>
              <div className="text-sm font-semibold text-gray-800">
                Net Area: <span className="text-blue-600">{(slab.netArea || 0).toFixed(2)} ft²</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Measurements */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">Basic Measurements (L × H)</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label text-xs">Length ({dispatchInfo.measurementUnit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={slab.length === 0 ? '' : slab.length}
                    onChange={(e) => handleSlabChange('length', parseFloat(e.target.value) || 0)}
                    className="input-field text-sm w-full py-2"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="form-label text-xs">Height ({dispatchInfo.measurementUnit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={slab.height === 0 ? '' : slab.height}
                    onChange={(e) => handleSlabChange('height', parseFloat(e.target.value) || 0)}
                    className="input-field text-sm w-full py-2"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Corner Deductions */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-700">Corner Deductions</h5>
              <div className="flex flex-col space-y-2">
                {slab.cornerDeductions.map((corner, cornerIndex) => (
                  <div key={corner.id} className="border border-gray-200 p-2 rounded flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-600 mb-1">Corner {cornerIndex + 1}</div>
                      <div className="flex space-x-1 mb-1">
                        <input
                          type="number"
                          step="0.01"
                          value={corner.length === 0 ? '' : corner.length}
                          onChange={(e) => handleCornerDeductionChange(cornerIndex, 'length', parseFloat(e.target.value) || 0)}
                          placeholder="Length"
                          className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={corner.height === 0 ? '' : corner.height}
                          onChange={(e) => handleCornerDeductionChange(cornerIndex, 'height', parseFloat(e.target.value) || 0)}
                          placeholder="Height"
                          className="w-1/2 px-1 py-1 text-xs border border-gray-300 rounded"
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        Area: {(corner.area || 0).toFixed(2)} ft²
                      </div>
                    </div>
                    {slab.cornerDeductions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCornerDeduction(cornerIndex)}
                        className="ml-2 text-red-600 hover:text-red-800"
                        title="Remove corner"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={addCornerDeduction}
                  className="btn-secondary text-xs w-full sm:w-auto"
                  disabled={slab.cornerDeductions.length >= 4}
                >
                  Add Corner Deduction
                </button>
              </div>
            </div>
          </div>

          {/* Calculated Results */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
            <div className="text-center">
              <div className="text-xs text-gray-600">Gross Area</div>
              <div className="font-semibold text-blue-600">{(slab.grossArea || 0).toFixed(2)} ft²</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Deductions</div>
              <div className="font-semibold text-orange-600">{(slab.totalDeductionArea || 0).toFixed(2)} ft²</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600">Net Area</div>
              <div className="font-semibold text-green-600">{(slab.netArea || 0).toFixed(2)} ft²</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 border-t pt-4 flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0">
            <div className="flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2">
              <button
                type="button"
                onClick={clearSlab}
                className="btn-secondary w-full xs:w-auto"
              >
                Clear Form
              </button>
              {currentDispatchSlabs.length > 0 && (
                <button
                  type="button"
                  onClick={copyPrevious}
                  className="btn-secondary w-full xs:w-auto"
                  title="Copy from latest slab"
                >
                  Copy Previous
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`btn-primary w-full sm:w-auto ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {loading ? 'Adding...' : saveSuccess ? '✓ Added!' : 'Add to Dispatch'}
            </button>
          </div>
        </div>
      </form>

      {/* Saved Slabs Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Current Dispatch Slabs 
                {dispatchInfo.lotNumber && <span className="text-sm text-gray-600 ml-2">({dispatchInfo.lotNumber})</span>}
              </h3>
              {dispatchInfo.materialName && dispatchInfo.partyName && (
                <div className="text-sm text-gray-600 mt-1">
                  {dispatchInfo.materialName} • {dispatchInfo.partyName} • {dispatchInfo.thickness}mm
                </div>
              )}
            </div>
            <div className="text-sm text-gray-600">
              Total Slabs: {currentDispatchSlabs.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading slabs...</div>
        ) : currentDispatchSlabs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No slabs in this dispatch yet. Add your first slab above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Slab #</th>
                  <th className="px-4 py-2 text-left">Dimensions ({dispatchInfo.measurementUnit})</th>
                  <th className="px-4 py-2 text-left">Gross Area</th>
                  <th className="px-4 py-2 text-left">Deductions</th>
                  <th className="px-4 py-2 text-left">Net Area</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDispatchSlabs.map((savedSlab) => (
                  <tr key={savedSlab.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{savedSlab.slabNumber}</td>
                    <td className="px-4 py-2">
                      {savedSlab.length} × {savedSlab.height}
                    </td>
                    <td className="px-4 py-2 text-blue-600">
                      {(savedSlab.grossArea || 0).toFixed(2)} ft²
                    </td>
                    <td className="px-4 py-2 text-orange-600">
                      {(savedSlab.totalDeductionArea || 0).toFixed(2)} ft²
                    </td>
                    <td className="px-4 py-2 font-semibold text-green-600">
                      {(savedSlab.netArea || 0).toFixed(2)} ft²
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => deleteSlab(savedSlab.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                        title="Delete slab"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Report Button */}
      {currentDispatchSlabs.length > 0 && (
        <div className="card bg-green-50">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Ready to Generate Report</h3>
            <div className="mb-4">
              <div className="text-sm text-green-700">Total Slabs: {currentDispatchSlabs.length}</div>
              <div className="text-sm text-green-700">
                Total Net Area: {currentDispatchSlabs.reduce((sum, s) => sum + (s.netArea || 0), 0).toFixed(2)} ft²
              </div>
            </div>
            <button
              onClick={generateReport}
              disabled={loading}
              className="bg-green-600 text-white font-medium text-lg px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2 mx-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Generating Report...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <span>Generate Report</span>
                </>
              )}
            </button>
            <div className="text-xs text-green-600 mt-2">
              This will save all slabs to database and generate PDF report
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlabEntry; 
