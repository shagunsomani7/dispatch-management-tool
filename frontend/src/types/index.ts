export interface SlabMeasurement {
  id: string;
  materialName: string;
  lotNumber: string;
  dispatchVehicleNumber: string;
  supervisorName: string;
  partyName: string;
  slabNumber: number;
  thickness: number;
  length: number;
  height: number;
  cornerDeductions: CornerDeduction[];
  measurementUnit: MeasurementUnit;
  grossArea: number;
  totalDeductionArea: number;
  netArea: number;
  timestamp: Date;
}

export interface CornerDeduction {
  id: string;
  length: number;
  height: number;
  area: number;
}

export type MeasurementUnit = 'inches' | 'cm' | 'mm';

export interface DispatchBatch {
  id: string;
  batchNumber: string;
  partyName: string;
  lotNumber: string;
  vehicleNumber: string;
  supervisorName: string;
  slabs: SlabMeasurement[];
  totalSlabs: number;
  totalNetArea: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupervisorOption {
  id: string;
  name: string;
  designation: string;
}

export interface PartyOption {
  id: string;
  name: string;
  code: string;
  contactInfo?: string;
}

export interface FormErrors {
  [key: string]: string;
}

export interface CalculationResult {
  grossArea: number;
  totalDeductionArea: number;
  netArea: number;
  unit: MeasurementUnit;
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  partyName?: string;
  materialName?: string;
  supervisorName?: string;
  thickness?: number;
} 