export interface SystemState {
  timestamp: number;
  waterLevel: number; // meters (Upstream)
  downstreamLevel: number; // meters (Downstream)
  inflowRate: number; // m3/s
  outflowRate: number; // m3/s
  gateOpening: number; // 0-100 percentage (Actual position)
  targetGateOpening: number; // 0-100 percentage (Desired position)
  gateStatus: 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING' | 'PARTIALLY OPEN';
  isRaining: boolean;
  rainfallIntensity: number; // mm/h
  currentPower: number; // kW
  totalEnergy: number; // kWh
  totalCost: number; // UZS
}

export enum SystemMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL'
}

export enum AlertLevel {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface SimulationConfig {
  targetLevel: number; // The "Radar Control Level" setpoint
  simulationSpeed: number;
}

export interface WateringOrder {
  id: string;
  clientName: string;
  hectares: number;
  targetVolume: number; // m3
  deliveredVolume: number; // m3
  startTime: number;
  endTime?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  powerConsumed: number; // kWh during this order
  waterCost: number; // UZS (Volume * 100)
}