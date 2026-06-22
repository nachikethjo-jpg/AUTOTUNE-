export type Brand = 'Maruti Suzuki' | 'Tata' | 'Mahindra' | 'Hyundai' | 'Honda';

export type FuelType = 'Petrol' | 'Diesel' | 'Petrol + CNG';

export interface Vehicle {
  id: string;
  brand: Brand;
  model: string;
  variant: string;
  engineName: string;
  displacementCc: number;
  ecuModel: string;
  fuelType: FuelType;
  stockHp: number;
  stockTorque: number;
  stage1Hp: number;
  stage1Torque: number;
  isTurbo: boolean;
  defaultBoostBar: number; // For Turbocharged engines, standard boost
  rpmGrid: number[]; // e.g. [800, 1500, 2500, 3500, 4500, 5500, 6500]
  loadGrid: number[]; // Throttle % or MAP e.g. [10, 30, 50, 70, 90, 100]
  
  // Default coordinate values represented as 2D matrices [rpm_index][load_index]
  defaultIgnitionMap: number[][]; // degrees relative to TDC, e.g. -5 to 35
  defaultFuelMap: number[][]; // Lambda ratios, e.g. 0.85 to 1.10
  defaultBoostMap: number[][]; // Bar boost targets, e.g. 0.0 to 1.4
}

export type RemapPreset = 'Stock' | 'Stage1_Sport' | 'Stage1_Eco' | 'CNG_Optimize' | 'PopAndBang';

export interface TuningResult {
  hp: number;
  torque: number;
  fuelEfficiencyDeltaPct: number; // e.g. -5% or +8%
  peakBoostBar: number;
  checksumStatus: 'Pending' | 'Verified' | 'Error';
  ignitionAdvanceMax: number;
}

export interface DTC {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  category: 'Engine/Fuel' | 'Turbo/Boost' | 'Sensors' | 'Transmission' | 'Exhaust/Emission';
  possibleCauses: string[];
}

export interface GeminiTuneRequest {
  brand: string;
  model: string;
  engineName: string;
  ecuModel: string;
  fuelType: string;
  tunerRequest: string;
  stockHp: number;
  stockTorque: number;
}

export interface GeminiTuneResponse {
  recommendation: string;
  safetyWarnings: string[];
  suggestedPeakHp: number;
  suggestedPeakTorque: number;
  expectedGainsSummary: string;
  suggestedOffsetIgnitionDegrees: number;
  suggestedOffsetBoostPct: number;
  checksumHex: string;
}
