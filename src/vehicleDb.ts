import { Vehicle, DTC } from './types';

// Let's create realistic default grids
// RPM points: 800 (idle), 1500 (low), 2500 (mid-low), 3500 (mid-torque), 4500 (power band), 5500 (climax), 6500 (redline)
export const RPM_GRID = [800, 1500, 2500, 3500, 4500, 5500, 6500];

// Engine load lines representing intake pressure/throttle coordinate (10% idle up to 100% wide open throttle)
export const LOAD_GRID = [10, 30, 50, 70, 90, 100];

// Helper to generate empty/zero matrix
const makeZeroMatrix = (rows: number, cols: number) => Array(rows).fill(0).map(() => Array(cols).fill(0.0));

// Generator for a typical petrol ignition map (smooth advance from idle ~10 to high RPM ~30-34, slightly retarded at high load)
const generatePetrolIgnitionMap = (): number[][] => {
  const result: number[][] = [];
  for (let r = 0; r < RPM_GRID.length; r++) {
    const rpm = RPM_GRID[r];
    const row: number[] = [];
    for (let c = 0; c < LOAD_GRID.length; c++) {
      const load = LOAD_GRID[c];
      // Basic simulation of ignition advance mapping
      let val = 10; // base idle timing
      // advance with RPM
      val += (rpm - 800) * 0.004; 
      // retard with load to prevent knock
      val -= (load - 10) * 0.12;
      row.push(Math.round(val * 10) / 10);
    }
    result.push(row);
  }
  return result;
};

// Generator for a typical fuel target Lambda map (cruise is closed-loop λ=1.00, power/full load is rich λ=0.85-0.90)
const generatePetrolFuelMap = (): number[][] => {
  const result: number[][] = [];
  for (let r = 0; r < RPM_GRID.length; r++) {
    const row: number[] = [];
    for (let c = 0; c < LOAD_GRID.length; c++) {
      const load = LOAD_GRID[c];
      let val = 1.00; // closed-loop target
      if (load >= 70) {
        val = 0.92;
      }
      if (load >= 90) {
        val = 0.88;
      }
      if (load === 100 && RPM_GRID[r] >= 4500) {
        val = 0.85; // enriched for cylinder cooling/full power
      }
      row.push(Math.round(val * 100) / 100);
    }
    result.push(row);
  }
  return result;
};

// Generator for target boost map in Bar (NA is always 0.0, Turbo reaches 0.4 - 1.3 Bar target)
const generateTurboBoostMap = (peakBoost: number): number[][] => {
  const result: number[][] = [];
  for (let r = 0; r < RPM_GRID.length; r++) {
    const rpm = RPM_GRID[r];
    const row: number[] = [];
    for (let c = 0; c < LOAD_GRID.length; c++) {
      const load = LOAD_GRID[c];
      let val = 0.0;
      if (load > 30) {
        // spool up starting around 1500-2500 rpm
        if (rpm >= 1500 && rpm <= 4500) {
          const loadFactor = (load - 30) / 70; // 0 to 1
          val = peakBoost * loadFactor;
        } else if (rpm > 4500) {
          // taper down slightly at high RPM redline due to flow constraints
          const loadFactor = (load - 30) / 70;
          val = (peakBoost * 0.8) * loadFactor;
        }
      }
      row.push(Math.round(val * 100) / 100);
    }
    result.push(row);
  }
  return result;
};

export const INDIAN_VEHICLES: Vehicle[] = [
  {
    id: 'maruti_swift_k12',
    brand: 'Maruti Suzuki',
    model: 'Swift / Baleno',
    variant: '1.2L K12M VVT',
    engineName: 'K-Series K12M DualJet',
    displacementCc: 1197,
    ecuModel: 'Bosch ME17.9.64',
    fuelType: 'Petrol + CNG',
    stockHp: 89,
    stockTorque: 113,
    stage1Hp: 98,
    stage1Torque: 125,
    isTurbo: false,
    defaultBoostBar: 0.0,
    rpmGrid: RPM_GRID,
    loadGrid: LOAD_GRID,
    defaultIgnitionMap: generatePetrolIgnitionMap(),
    defaultFuelMap: generatePetrolFuelMap(),
    defaultBoostMap: makeZeroMatrix(RPM_GRID.length, LOAD_GRID.length)
  },
  {
    id: 'tata_nexon_revotron',
    brand: 'Tata',
    model: 'Nexon / Altroz iTurbo',
    variant: '1.2L Revotron Turbo',
    engineName: 'Revotron 1.2T Gen 1',
    displacementCc: 1199,
    ecuModel: 'Bosch MED17.9.62',
    fuelType: 'Petrol',
    stockHp: 118,
    stockTorque: 170,
    stage1Hp: 138,
    stage1Torque: 215,
    isTurbo: true,
    defaultBoostBar: 1.1,
    rpmGrid: RPM_GRID,
    loadGrid: LOAD_GRID,
    defaultIgnitionMap: generatePetrolIgnitionMap(),
    defaultFuelMap: generatePetrolFuelMap(),
    defaultBoostMap: generateTurboBoostMap(1.1)
  },
  {
    id: 'mahindra_thar_mhawk',
    brand: 'Mahindra',
    model: 'Thar / Scorpio-N',
    variant: '2.2L mHawk Diesel',
    engineName: 'mHawk 130 CRDe',
    displacementCc: 2184,
    ecuModel: 'Bosch EDC17C55',
    fuelType: 'Diesel',
    stockHp: 130,
    stockTorque: 300,
    stage1Hp: 165,
    stage1Torque: 380,
    isTurbo: true,
    defaultBoostBar: 1.4,
    rpmGrid: RPM_GRID,
    loadGrid: LOAD_GRID,
    // Diesel ignition (re-purposed as Start of Injection (SOI) advance)
    defaultIgnitionMap: Array(RPM_GRID.length).fill(0).map((_, rIdx) => {
      const rpm = RPM_GRID[rIdx];
      return LOAD_GRID.map(load => {
        // Diesel SOI typical values e.g. 2 to 18 degrees injection advance
        let val = 2 + (rpm - 800) * 0.002 + (load - 10) * 0.05;
        return Math.round(val * 10) / 10;
      });
    }),
    // Diesel fuel Lambda target (typically runs lean, Lambda 1.15 to 2.50)
    defaultFuelMap: Array(RPM_GRID.length).fill(0).map(() => {
      return LOAD_GRID.map(load => {
        let val = 2.4 - (load - 10) * 0.012; // richer on high load
        return Math.round(val * 100) / 100;
      });
    }),
    defaultBoostMap: generateTurboBoostMap(1.4)
  },
  {
    id: 'hyundai_i20_crdi',
    brand: 'Hyundai',
    model: 'i20 / Creta CRDi',
    variant: '1.5L U2 CRDi',
    engineName: 'U2 1.5L CRDi Diesel VGT',
    displacementCc: 1493,
    ecuModel: 'Delphi DCM6.2V',
    fuelType: 'Diesel',
    stockHp: 99,
    stockTorque: 240,
    stage1Hp: 125,
    stage1Torque: 295,
    isTurbo: true,
    defaultBoostBar: 1.25,
    rpmGrid: RPM_GRID,
    loadGrid: LOAD_GRID,
    defaultIgnitionMap: Array(RPM_GRID.length).fill(0).map((_, rIdx) => {
      const rpm = RPM_GRID[rIdx];
      return LOAD_GRID.map(load => {
        let val = 1.5 + (rpm - 800) * 0.0022 + (load - 10) * 0.045;
        return Math.round(val * 10) / 10;
      });
    }),
    defaultFuelMap: Array(RPM_GRID.length).fill(0).map(() => {
      return LOAD_GRID.map(load => {
        let val = 2.2 - (load - 10) * 0.01;
        return Math.round(val * 100) / 100;
      });
    }),
    defaultBoostMap: generateTurboBoostMap(1.25)
  },
  {
    id: 'honda_city_ivtec',
    brand: 'Honda',
    model: 'City / WR-V',
    variant: '1.5L i-VTEC i-DSI',
    engineName: 'i-VTEC L15B NA',
    displacementCc: 1497,
    ecuModel: 'Keihin 37820-56',
    fuelType: 'Petrol',
    stockHp: 119,
    stockTorque: 145,
    stage1Hp: 131,
    stage1Torque: 162,
    isTurbo: false,
    defaultBoostBar: 0.0,
    rpmGrid: RPM_GRID,
    loadGrid: LOAD_GRID,
    defaultIgnitionMap: generatePetrolIgnitionMap().map(row => row.map(v => Math.round((v + 2) * 10) / 10)), // highly progressive VTEC profile
    defaultFuelMap: generatePetrolFuelMap(),
    defaultBoostMap: makeZeroMatrix(RPM_GRID.length, LOAD_GRID.length)
  }
];

export const DEMO_DTCS: DTC[] = [
  {
    code: 'P0234',
    description: 'Turbocharger Engine Overboost Condition (Indian Diesel Limit exceeded)',
    severity: 'high',
    category: 'Turbo/Boost',
    possibleCauses: ['Remapped boost limit set too high or wastegate actuator stuck', 'MAP sensor faulty', 'Faulty boost control solenoid (N75)']
  },
  {
    code: 'P0171',
    description: 'System Too Lean (Bank 1) - Low Injection Target',
    severity: 'high',
    category: 'Engine/Fuel',
    possibleCauses: ['Air-Fuel Lambda target in remap map is too high at full load', 'Dirty MAF sensor', 'Vacuum leak or clogged fuel injectors']
  },
  {
    code: 'P0300',
    description: 'Random/Multiple Cylinder Misfire Detected',
    severity: 'high',
    category: 'Sensors',
    possibleCauses: ['Ignition timing advanced too far under load (Knocking)', 'Bad spark plugs / coils', 'Fuel injection volume too low']
  },
  {
    code: 'P0420',
    description: 'Catalytic Converter Efficiency Below Threshold (Common with popping & banging map)',
    severity: 'medium',
    category: 'Exhaust/Emission',
    possibleCauses: ['Aggressive deceleration fuel override / timing retardation', 'Decat exhaustion installed', 'O2 sensor front/rear mismatch']
  },
  {
    code: 'P0101',
    description: 'Mass Air Flow (MAF) Sensor Circuit Range/Performance',
    severity: 'medium',
    category: 'Sensors',
    possibleCauses: ['Incompatible throttle body calibration', 'Air intake pipe leak', 'Faulty MAF pin connection']
  },
  {
    code: 'P0087',
    description: 'Fuel Rail/System Pressure - Too Low (mHawk/CRDi Common peak load fault)',
    severity: 'high',
    category: 'Engine/Fuel',
    possibleCauses: ['Remapped rail pressure tables demand excessive diesel flow', 'Clogged fuel filter', 'Worn out high-pressure fuel pump (HPFP)']
  }
];
