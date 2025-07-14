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
    lotNumber: '', // User-entered lot number
    dispatchVehicleNumber: '',
    dispatchWarehouse: '', // Warehouse location
    supervisorName: user?.username || '',
    partyName: '',
    measurementUnit: 'inches' as MeasurementUnit,
    thickness: 16 // Default thickness
  });

  // Auto-generated dispatch number for database (internal use)
  const [dispatchNumber, setDispatchNumber] = useState('');

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
  const [slabNumberDirection, setSlabNumberDirection] = useState<'up' | 'down'>('up');

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

  // Load initial data and generate initial lot number
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load materials from database
        const materialsData = await apiService.getMaterials();
        setMaterials(materialsData.map((m: { name: string }) => m.name));

        // Generate initial dispatch number for database
        const initialDispatchNumber = generateDispatchNumber();
        setDispatchNumber(initialDispatchNumber);

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
        
        // Still generate dispatch number even if materials loading fails
        const initialDispatchNumber = generateDispatchNumber();
        setDispatchNumber(initialDispatchNumber);
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

  // State to track if we're in the middle of a dispatch batch
  const [isDispatchStarted, setIsDispatchStarted] = useState(false);

  // State for inline editing
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<{
    length: number;
    height: number;
  }>({ length: 0, height: 0 });

  // Function to generate dispatch number in format YYYYMM-timestamp (for database)
  const generateDispatchNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const timestamp = Date.now();
    return `${year}${month}-${timestamp}`;
  };

  // Auto-set next slab number when dispatch slabs change or direction changes
  useEffect(() => {
    if (currentDispatchSlabs.length > 0) {
      const slabNumbers = currentDispatchSlabs.map(s => s.slabNumber);
      let nextNumber: number;
      
      if (slabNumberDirection === 'up') {
        const maxSlabNumber = Math.max(...slabNumbers);
        nextNumber = maxSlabNumber + 1;
      } else {
        const minSlabNumber = Math.min(...slabNumbers);
        nextNumber = minSlabNumber - 1;
      }
      
      setSlab(prev => ({ ...prev, slabNumber: nextNumber }));
      setSlabNumberInput(nextNumber.toString());
    } else {
      setSlab(prev => ({ ...prev, slabNumber: 1 }));
      setSlabNumberInput('1');
    }
  }, [currentDispatchSlabs, slabNumberDirection]);

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
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
      
      const heightInFeet = heightValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                        dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
      
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
                                           dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
      
      const heightInFeet = cornerHeightValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                           dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
      
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
    let nextSlabNumber: number;
    if (currentDispatchSlabs.length > 0) {
      const slabNumbers = currentDispatchSlabs.map(s => s.slabNumber);
      if (slabNumberDirection === 'up') {
        nextSlabNumber = Math.max(...slabNumbers) + 1;
      } else {
        nextSlabNumber = Math.min(...slabNumbers) - 1;
      }
    } else {
      nextSlabNumber = 1;
    }
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



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!dispatchInfo.materialName || !dispatchInfo.lotNumber || !dispatchInfo.partyName) {
      alert('Please fill in all required dispatch information fields');
      return;
    }

    if (!dispatchNumber) {
      alert('Dispatch number not generated. Please refresh the page.');
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

      setCurrentDispatchSlabs(prev => [...prev, newSlab]);
      
      // Mark dispatch as started so dispatch info persists
      setIsDispatchStarted(true);
      
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
      const updatedSlabs = currentDispatchSlabs.filter(s => s.id !== slabId);
      setCurrentDispatchSlabs(updatedSlabs);
      
      // If no slabs left, reset dispatch started flag
      if (updatedSlabs.length === 0) {
        setIsDispatchStarted(false);
      }
      
      alert(`Slab #${slabToDelete.slabNumber} has been deleted.`);
    }
  };

  // Functions for inline editing
  const startEditingDimensions = (slab: SlabFormData) => {
    setEditingSlabId(slab.id);
    setEditingValues({
      length: slab.length,
      height: slab.height
    });
  };

  const cancelEditingDimensions = () => {
    setEditingSlabId(null);
    setEditingValues({ length: 0, height: 0 });
  };

  const saveEditingDimensions = () => {
    if (editingSlabId) {
      setCurrentDispatchSlabs(prev => 
        prev.map(slab => {
          if (slab.id === editingSlabId) {
            // Recalculate areas with new dimensions
            const lengthValue = editingValues.length || 0;
            const heightValue = editingValues.height || 0;
            
            // Convert to feet for area calculation
            const lengthInFeet = lengthValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                               dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
            const heightInFeet = heightValue * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                               dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
            
            const grossArea = lengthInFeet * heightInFeet;
            
            // Recalculate corner deduction areas with new measurement unit
            const updatedCornerDeductions = slab.cornerDeductions.map(corner => {
              const cornerLengthInFeet = (corner.length || 0) * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                                 dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
              const cornerHeightInFeet = (corner.height || 0) * (dispatchInfo.measurementUnit === 'inches' ? 1/12 : 
                                                                 dispatchInfo.measurementUnit === 'cm' ? 0.0328084 : 1);
              
              return {
                ...corner,
                area: cornerLengthInFeet * cornerHeightInFeet
              };
            });
            
            const totalDeductionArea = updatedCornerDeductions.reduce((sum, corner) => sum + (corner.area || 0), 0);
            const netArea = Math.max(0, grossArea - totalDeductionArea);
            
            return {
              ...slab,
              length: lengthValue,
              height: heightValue,
              grossArea: Number(grossArea.toFixed(4)),
              totalDeductionArea: Number(totalDeductionArea.toFixed(4)),
              netArea: Number(netArea.toFixed(4)),
              cornerDeductions: updatedCornerDeductions
            };
          }
          return slab;
        })
      );
      
      // Reset editing state
      setEditingSlabId(null);
      setEditingValues({ length: 0, height: 0 });
    }
  };

  const handleEditingValueChange = (field: 'length' | 'height', value: number) => {
    setEditingValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const startNewDispatch = () => {
    setCurrentDispatchSlabs([]);
    setIsDispatchStarted(false);
    // Reset dispatch info and generate new dispatch number
    const newDispatchNumber = generateDispatchNumber();
    setDispatchNumber(newDispatchNumber);
    setDispatchInfo({
      materialName: '',
      lotNumber: '', // User will enter this
      dispatchVehicleNumber: '',
      dispatchWarehouse: '',
      supervisorName: user?.username || '',
      partyName: '',
      measurementUnit: 'inches' as MeasurementUnit,
      thickness: 16
    });
    // Reset slab form
    setSlab({
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
    setSlabNumberInput('1');
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

      // Use the auto-generated dispatch number as the unique dispatch ID
      const dispatchId = dispatchNumber;
      const dispatchTimestamp = new Date();

      // Save all slabs to database
      const savedSlabs: any[] = [];
      for (const tempSlab of currentDispatchSlabs) {
        const slabData = {
          materialName: dispatchInfo.materialName,
          lotNumber: dispatchInfo.lotNumber, // User-entered lot number
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
          dispatchId: dispatchId, // Auto-generated dispatch number
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

      // Clear the dispatch after successful generation and start new dispatch with new lot number
      setCurrentDispatchSlabs([]);
      setIsDispatchStarted(false);
      
      // Generate new dispatch number for next dispatch
      const newDispatchNumber = generateDispatchNumber();
      setDispatchNumber(newDispatchNumber);
      setDispatchInfo(prev => ({
        ...prev,
        materialName: '',
        lotNumber: '', // User will enter this
        dispatchVehicleNumber: '',
        partyName: ''
      }));
      
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

    // Billed To section with background
    pdf.setFillColor(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]);
    pdf.rect(col1X - 5, infoY - 5, (pageWidth - 2 * margin) / 2, 25, 'F');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('BILLED TO:', col1X, infoY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dispatchInfo.partyName || 'N/A', col1X, infoY + 5);
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
      // Format deduction dimensions as L×H, filter out empty corners
      const deductionDimensions = slab.corners
        .filter((corner: any) => corner.length > 0 || corner.height > 0)
        .map((corner: any) => `${corner.length || 0}×${corner.height || 0}`)
        .join(', ') || 'None';

      return [
        slab.slabNumber.toString(),
        `${slab.length.toFixed(2)}×${slab.height.toFixed(2)}`,
        deductionDimensions,
        slab.netArea.toFixed(2)
      ];
    });
    
    console.log('PDF Debug - Table data:', tableData);
    console.log('PDF Debug - slabsWithAreas for totals:', slabsWithAreas);

    const totalTableWidth = 170; // Reduced width for 4 columns
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
        0: { cellWidth: 25, halign: 'center' }, // Slab #
        1: { cellWidth: 45 }, // Dimensions (L×H)
        2: { cellWidth: 60 }, // Deductions (L×H format)
        3: { cellWidth: 40 }  // Net Area
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

    // Add totals with simplified layout
    const totalNet = slabsWithAreas.reduce((sum, slab) => sum + (slab.netArea || 0), 0);
    
    console.log('PDF Debug - Calculated totals:');
    console.log('totalNet:', totalNet);
    console.log('PDF Debug - Individual slab values for totals:');
    slabsWithAreas.forEach((slab, index) => {
      console.log(`Slab ${index + 1} totals contribution:`, {
        netArea: slab.netArea
      });
    });

    const totalsXLabel = pageWidth - margin - 180;
    const totalsXValue = pageWidth - margin - 5;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Total Slabs Dispatched:', totalsXLabel, finalY);
    pdf.text((slabsWithAreas?.length || 0).toString(), totalsXValue, finalY, { align: 'right' });

    pdf.setFont('helvetica', 'bold');
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
        <div className="flex space-x-2">
          {isDispatchStarted && (
            <button
              onClick={startNewDispatch}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              title="Start a new dispatch batch"
            >
              New Dispatch
            </button>
          )}
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Back to Dashboard
          </button>
        </div>
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Dispatch Information</h3>
              {isDispatchStarted && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Dispatch Active</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Party Name - Moved to first position */}
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
                  onFocus={() => !isDispatchStarted && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={`input-field w-full ${isDispatchStarted ? 'bg-gray-100' : ''}`}
                  placeholder="Type or select party name"
                  autoComplete="off"
                  required
                  readOnly={isDispatchStarted}
                />
                {showSuggestions && !isDispatchStarted && (
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
                  className={`input-field flex-1 ${isDispatchStarted ? 'bg-gray-100' : ''}`}
                  required
                  disabled={isDispatchStarted}
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

            {/* Lot Number - User entered */}
            <div className="form-group">
              <label className="form-label">Lot Number *</label>
              <input
                type="text"
                value={dispatchInfo.lotNumber}
                onChange={(e) => handleDispatchInfoChange('lotNumber', e.target.value)}
                className={`input-field ${isDispatchStarted ? 'bg-gray-100' : ''}`}
                placeholder="Enter lot number"
                required
                readOnly={isDispatchStarted}
              />
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

            {/* Dispatch Warehouse */}
            <div className="form-group">
              <label className="form-label">Dispatch Warehouse</label>
              <input
                type="text"
                value={dispatchInfo.dispatchWarehouse}
                onChange={(e) => handleDispatchInfoChange('dispatchWarehouse', e.target.value)}
                className="input-field"
                placeholder="Enter warehouse location"
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
                <option value="inches">Inches</option>
                <option value="cm">Centimeters (cm)</option>
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
                {/* Direction Toggle Button */}
                <button
                  type="button"
                  onClick={() => setSlabNumberDirection(prev => prev === 'up' ? 'down' : 'up')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    slabNumberDirection === 'up' 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                  title={`Click to toggle direction. Currently: ${slabNumberDirection === 'up' ? 'Ascending (1, 2, 3...)' : 'Descending (3, 2, 1...)'}`}
                >
                  {slabNumberDirection === 'up' ? (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
                      </svg>
                      <span>Up</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span>Down</span>
                    </div>
                  )}
                </button>
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
              {dispatchInfo.lotNumber && <span className="text-sm text-gray-600 ml-2">(Lot: {dispatchInfo.lotNumber})</span>}
            </h3>
                          {dispatchInfo.materialName && dispatchInfo.partyName && (
              <div className="text-sm text-gray-600 mt-1">
                {dispatchInfo.materialName} • {dispatchInfo.partyName} • {dispatchInfo.thickness}mm
                {dispatchNumber && <span className="ml-2 text-xs">(Dispatch: {dispatchNumber})</span>}
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
                  <th className="px-4 py-2 text-left">Deductions ({dispatchInfo.measurementUnit})</th>
                  <th className="px-4 py-2 text-left">Net Area</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...currentDispatchSlabs]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((savedSlab) => (
                  <tr key={savedSlab.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{savedSlab.slabNumber}</td>
                    <td className="px-4 py-2">
                      {editingSlabId === savedSlab.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            step="0.01"
                            value={editingValues.length || ''}
                            onChange={(e) => handleEditingValueChange('length', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveEditingDimensions();
                              } else if (e.key === 'Escape') {
                                cancelEditingDimensions();
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Length"
                            autoFocus
                          />
                          <span className="text-gray-500">×</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editingValues.height || ''}
                            onChange={(e) => handleEditingValueChange('height', parseFloat(e.target.value) || 0)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                saveEditingDimensions();
                              } else if (e.key === 'Escape') {
                                cancelEditingDimensions();
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Height"
                          />
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded"
                          onClick={() => startEditingDimensions(savedSlab)}
                          title="Click to edit dimensions"
                        >
                          {savedSlab.length} × {savedSlab.height}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-orange-600">
                      {savedSlab.cornerDeductions && savedSlab.cornerDeductions.length > 0
                        ? savedSlab.cornerDeductions
                            .filter(corner => corner.length > 0 || corner.height > 0)
                            .map((corner, index) => `${corner.length}×${corner.height}`)
                            .join(', ') || 'None'
                        : 'None'
                      }
                    </td>
                    <td className="px-4 py-2 font-semibold text-green-600">
                      {(savedSlab.netArea || 0).toFixed(2)} ft²
                    </td>
                    <td className="px-4 py-2">
                      {editingSlabId === savedSlab.id ? (
                        <div className="flex space-x-1">
                          <button
                            onClick={saveEditingDimensions}
                            className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                            title="Save changes"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditingDimensions}
                            className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600 transition-colors"
                            title="Cancel editing"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => startEditingDimensions(savedSlab)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            title="Edit dimensions"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSlab(savedSlab.id)}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            title="Delete slab"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
