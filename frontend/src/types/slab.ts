export type MeasurementUnit = 'inches' | 'cm';

export interface CornerDeduction {
  id: string;
  length: number;
  height: number;
  area: number;
}

export interface SlabMeasurement {
  id: string;
  dispatchId: string;
  dispatchTimestamp: Date;
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