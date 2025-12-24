import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Droplets, ShieldAlert, Zap, Sliders, Waves, PlayCircle, PauseCircle, CloudRain, Settings, ArrowUpCircle, ArrowDownCircle, StopCircle, Banknote, Gauge, Power } from 'lucide-react';

import DamVisualizer from './components/DamVisualizer';
import AIReport from './components/AIReport';
import PowerAnalysis from './components/PowerAnalysis';
import CottonOrder from './components/CottonOrder';
import { SystemState, SystemMode, AlertLevel, SimulationConfig, WateringOrder } from './types';

// Constants for Simulation Physics
const MAX_WATER_LEVEL = 12.0; // meters (Scaled for 10m control)
const CRITICAL_THRESHOLD = 9.5; // meters
const WARNING_THRESHOLD = 8.0; // meters
const RESERVOIR_AREA = 1000; // arbitrary unit for volume calc
const GATE_SPEED = 2.0; // % per tick
const MAX_GATE_HEIGHT_CM = 200; // Max gate height in cm (2.0 meters)

// Motor & Power Constants
// Updated for Dual Motor Configuration
const MOTOR_POWER_ACTIVE = 10.0; // kW (2x 5kW motors)
const MOTOR_POWER_STANDBY = 0.2; // kW (2x standby)
const ELEC_RATE_UZS = 1000; // UZS per kWh (Updated Rate)

const App: React.FC = () => {
  // --- State Management ---
  const [mode, setMode] = useState<SystemMode>(SystemMode.AUTO);
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  
  // Configuration Inputs
  const [config, setConfig] = useState<SimulationConfig>({
    targetLevel: 5.0, // UPDATED: Default to 5.0m per request
    simulationSpeed: 200, // Speed up ticks for smoother animation
  });

  // Current System Telemetry
  const [systemState, setSystemState] = useState<SystemState>({
    timestamp: Date.now(),
    waterLevel: 5.0, 
    downstreamLevel: 0.8, // Initial downstream level
    inflowRate: 36.0, // Updated to 36.0
    outflowRate: 0.0,
    gateOpening: 0,
    targetGateOpening: 0,
    gateStatus: 'CLOSED',
    isRaining: false,
    rainfallIntensity: 0,
    currentPower: MOTOR_POWER_STANDBY,
    totalEnergy: 0,
    totalCost: 0,
  });

  // Active Watering Order State
  const [activeOrder, setActiveOrder] = useState<WateringOrder | null>(null);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<WateringOrder | null>(null);

  // Ref to track activeOrder inside the simulation tick without resetting interval
  const activeOrderRef = useRef<WateringOrder | null>(null);
  useEffect(() => {
    activeOrderRef.current = activeOrder;
  }, [activeOrder]);

  // Order Completion Check
  useEffect(() => {
    if (activeOrder && activeOrder.deliveredVolume >= activeOrder.targetVolume && activeOrder.status === 'ACTIVE') {
       const completed = { ...activeOrder, status: 'COMPLETED' as const, endTime: Date.now() };
       setLastCompletedOrder(completed);
       setActiveOrder(null);
    }
  }, [activeOrder]);

  // Mock Data for Monthly Cost (aggregated every 10 days)
  const [monthlyCostData] = useState(() => {
    const periods = ['Days 1-10', 'Days 11-20', 'Days 21-30'];
    
    return periods.map(period => {
      // Simulate 10 days of accumulation
      // Daily avg usage ~300kWh -> 10 days ~3000kWh
      let accumulatedUsage = 0;
      for(let i=0; i<10; i++) {
        accumulatedUsage += (200 + Math.random() * 200);
      }
      
      return {
        period,
        usage: parseFloat(accumulatedUsage.toFixed(1)),
        cost: Math.round(accumulatedUsage * ELEC_RATE_UZS)
      };
    });
  });

  // Refs for interval management
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Manual Control Handlers ---
  const startManualMove = (direction: 'OPEN' | 'CLOSE') => {
    if (mode !== SystemMode.MANUAL) return;
    
    // Clear any existing timer
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);

    // Initial move
    setSystemState(prev => {
        let newTarget = prev.targetGateOpening;
        if (direction === 'OPEN') newTarget = Math.min(100, newTarget + 1);
        else newTarget = Math.max(0, newTarget - 1);
        return { ...prev, targetGateOpening: newTarget };
    });

    // Continuous move
    holdTimerRef.current = setInterval(() => {
       setSystemState(prev => {
          let newTarget = prev.targetGateOpening;
          if (direction === 'OPEN') newTarget = Math.min(100, newTarget + 2); // Faster when holding
          else newTarget = Math.max(0, newTarget - 2);
          return { ...prev, targetGateOpening: newTarget };
       });
    }, 100);
  };

  const stopManualMove = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };


  // --- Order Management Handlers ---
  const handleStartOrder = (clientName: string, hectares: number) => {
    const targetVol = hectares * 1000; // 1000 m3/ha avg
    setActiveOrder({
        id: Date.now().toString(),
        clientName,
        hectares,
        targetVolume: targetVol,
        deliveredVolume: 0,
        startTime: Date.now(),
        status: 'ACTIVE',
        powerConsumed: 0,
        waterCost: 0
    });
  };

  const handleCancelOrder = () => {
      setActiveOrder(null);
  };

  // --- Simulation Logic ---
  const tickSimulation = useCallback(() => {
    setSystemState(prev => {
      // 1. Calculate Inflow
      const baseInflow = 36.0; // Updated to 36.0
      const rainEffect = prev.isRaining ? (prev.rainfallIntensity * 0.3) : 0;
      const noise = (Math.random() - 0.5) * 2;
      const currentInflow = Math.max(0, baseInflow + rainEffect + noise);

      // 2. Control Logic
      let nextTargetGate = prev.targetGateOpening;

      if (activeOrderRef.current) {
          // Force Open for Cotton Order
          nextTargetGate = 100;
      } else if (mode === SystemMode.AUTO) {
          // PID-like logic
          const error = prev.waterLevel - config.targetLevel;
          if (error > 0.2) {
              nextTargetGate = Math.min(100, prev.gateOpening + (error * 5));
          } else if (error < -0.2) {
              nextTargetGate = Math.max(0, prev.gateOpening - 2);
          } else {
              nextTargetGate = prev.gateOpening; 
          }
      } 

      // 3. Physics: Move Gate towards Target
      let nextGateOpening = prev.gateOpening;
      let status: SystemState['gateStatus'] = prev.gateStatus;
      let isMoving = false;

      if (Math.abs(nextGateOpening - nextTargetGate) < GATE_SPEED) {
          nextGateOpening = nextTargetGate;
      } else if (nextGateOpening < nextTargetGate) {
          nextGateOpening += GATE_SPEED;
          isMoving = true;
      } else {
          nextGateOpening -= GATE_SPEED;
          isMoving = true;
      }
      
      // Determine Status
      if (nextGateOpening > prev.gateOpening) status = 'OPENING';
      else if (nextGateOpening < prev.gateOpening) status = 'CLOSING';
      else if (nextGateOpening === 0) status = 'CLOSED';
      else if (nextGateOpening === 100) status = 'OPEN';
      else status = 'PARTIALLY OPEN';

      // 4. Power Consumption Logic
      // Time delta in hours for Energy calc (kWh)
      // simulationSpeed is in ms
      const dtSeconds = config.simulationSpeed / 1000;
      const dtHours = dtSeconds / 3600;
      const currentPower = isMoving ? MOTOR_POWER_ACTIVE : MOTOR_POWER_STANDBY;
      const energyConsumed = currentPower * dtHours;
      const newTotalEnergy = prev.totalEnergy + energyConsumed;
      const newTotalCost = newTotalEnergy * ELEC_RATE_UZS;

      // 5. Calculate Outflow (Precise Integration for Large Rectangular Orifice)
      // Formula: Q = 2/3 * Cd * b * sqrt(2g) * (h2^(3/2) - h1^(3/2))
      // h2 = depth to bottom of orifice (Water Level, since gate is at bottom)
      // h1 = depth to top of orifice (Water Level - Gate Opening Height)
      
      const Cd = 0.6;
      const b = 3.0; // Gate width in meters (Standard)
      const g = 9.81;
      const MAX_GATE_HEIGHT_M = MAX_GATE_HEIGHT_CM / 100; // Use the constant
      
      // Calculate current gate opening height in meters (e.g., 50% = 1.0m)
      const currentGateHeightM = (nextGateOpening / 100) * MAX_GATE_HEIGHT_M;
      
      // h2: Depth to bottom (water level from surface to bottom)
      const h2 = prev.waterLevel;
      
      // h1: Depth to top of the opening (water level from surface to top of gate opening)
      // If water level < opening height, h1 is 0 (flow is effectively weir-like at surface)
      const h1 = Math.max(0, prev.waterLevel - currentGateHeightM);
      
      let currentOutflow = 0;
      if (prev.waterLevel > 0.01 && currentGateHeightM > 0.01) {
        const term1 = Math.pow(h2, 1.5);
        const term2 = Math.pow(h1, 1.5);
        currentOutflow = (2/3) * Cd * b * Math.sqrt(2 * g) * (term1 - term2);
      }

      // 6. Update Water Level
      const netFlow = currentInflow - currentOutflow;
      const dH = (netFlow / RESERVOIR_AREA) * dtSeconds; 
      let newLevel = Math.min(MAX_WATER_LEVEL, Math.max(0, prev.waterLevel + dH));

      // 7. Calculate Downstream Level
      // Simple hydraulic approximation: Base level 0.5m + impact of flow
      // We assume the channel fills up as flow increases
      const targetDownstream = 0.5 + (currentOutflow * 0.04); 
      // Smooth transition for visual stability
      const newDownstream = prev.downstreamLevel + (targetDownstream - prev.downstreamLevel) * 0.1;

      // 8. Update Active Order Progress
      if (activeOrderRef.current) {
        const volumeIncrement = currentOutflow * dtSeconds;
        const powerIncrement = currentPower * (dtSeconds / 3600);
        
        setActiveOrder(curr => {
           if (!curr) return null;
           return {
               ...curr,
               deliveredVolume: curr.deliveredVolume + volumeIncrement,
               powerConsumed: curr.powerConsumed + powerIncrement
           };
        });
      }

      return {
        ...prev,
        timestamp: Date.now(),
        inflowRate: currentInflow,
        outflowRate: currentOutflow,
        waterLevel: newLevel,
        downstreamLevel: newDownstream,
        gateOpening: nextGateOpening,
        targetGateOpening: nextTargetGate,
        gateStatus: status,
        currentPower: currentPower,
        totalEnergy: newTotalEnergy,
        totalCost: newTotalCost
      };
    });
  }, [config.targetLevel, config.simulationSpeed, mode]); // activeOrder is now accessed via ref

  // Interval Effect
  useEffect(() => {
    if (isSimulating) {
      intervalRef.current = setInterval(tickSimulation, config.simulationSpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSimulating, config.simulationSpeed, tickSimulation]);

  return (
    <div className="min-h-screen bg-gray-950 p-6 font-sans text-gray-100 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 bg-gray-900/50 p-4 rounded-2xl border border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg">
             <Waves className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">ADS Dashboard</h1>
            <p className="text-xs text-gray-400 font-medium">Autonomous Dam System | Team 001</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2 border ${
             systemState.waterLevel >= CRITICAL_THRESHOLD ? 'bg-red-900/30 border-red-500/50 text-red-400' : 
             systemState.waterLevel >= WARNING_THRESHOLD ? 'bg-amber-900/30 border-amber-500/50 text-amber-400' : 
             'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'
          }`}>
             {systemState.waterLevel >= CRITICAL_THRESHOLD ? <ShieldAlert className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
             {systemState.waterLevel >= CRITICAL_THRESHOLD ? 'CRITICAL' : systemState.waterLevel >= WARNING_THRESHOLD ? 'WARNING' : 'NORMAL'}
          </div>

          <div 
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              mode === SystemMode.MANUAL 
              ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' 
              : 'bg-gray-800 border-gray-700 text-gray-500'
            }`}
          >
            <Sliders className="w-3 h-3" />
            MANUAL MODE
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (4 cols) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* DIGITAL TWIN CARD */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 shadow-2xl relative overflow-hidden group">
             {/* Header for Twin */}
             <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Digital Twin</span>
             </div>
             <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] text-emerald-500/80 font-mono">Connected (Modbus TCP)</span>
             </div>

             <DamVisualizer 
                waterLevel={systemState.waterLevel} 
                downstreamLevel={systemState.downstreamLevel}
                targetLevel={config.targetLevel}
                gateOpening={systemState.gateOpening}
                alertLevel={systemState.waterLevel >= CRITICAL_THRESHOLD ? AlertLevel.CRITICAL : systemState.waterLevel >= WARNING_THRESHOLD ? AlertLevel.WARNING : AlertLevel.NORMAL}
                status={systemState.gateStatus}
                inflowRate={systemState.inflowRate}
                outflowRate={systemState.outflowRate}
             />
          </div>

          {/* CONTROL STATION */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-lg">
             <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4">
                <Sliders className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">Control Station</h3>
             </div>

             {/* Radar Control Level Slider */}
             <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                   <label className="text-xs font-bold text-gray-400 flex items-center gap-2">
                      <Settings className="w-3 h-3" /> Radar Control Level (Target)
                   </label>
                   <span className="text-indigo-400 font-mono font-bold">{config.targetLevel.toFixed(1)}m</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="10" step="0.1"
                  value={config.targetLevel}
                  onChange={(e) => setConfig({...config, targetLevel: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-mono">
                   <span>0m</span>
                   <span>5m</span>
                   <span>10m</span>
                </div>
             </div>

             {/* Manual Control Panel */}
             <div className="overflow-hidden rounded-xl border border-gray-700">
                {/* Header/Toggle Row */}
                <div className="bg-gray-900/50 p-4 flex items-center justify-between border-b border-gray-700">
                   <div className="flex items-center gap-2">
                      <Power className={`w-4 h-4 ${mode === SystemMode.MANUAL ? 'text-white' : 'text-gray-500'}`} />
                      <span className="text-sm font-bold text-gray-200">Manual Control</span>
                   </div>
                   
                   {/* Custom Toggle Switch */}
                   <button 
                      onClick={() => setMode(mode === SystemMode.AUTO ? SystemMode.MANUAL : SystemMode.AUTO)}
                      className="relative focus:outline-none"
                   >
                      <div className={`w-10 h-5 rounded-full transition-colors duration-300 ${mode === SystemMode.MANUAL ? 'bg-amber-500' : 'bg-gray-700'}`}></div>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${mode === SystemMode.MANUAL ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      
                      {/* Badge Text next to switch if needed, currently omitted for cleaner look */}
                   </button>
                   {mode === SystemMode.MANUAL && <span className="text-[10px] font-bold text-amber-500 ml-2">ON</span>}
                </div>

                {/* Control Buttons Area */}
                <div className={`p-4 bg-gray-900/30 transition-all duration-300 ${mode === SystemMode.MANUAL ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onMouseDown={() => startManualMove('OPEN')}
                        onMouseUp={stopManualMove}
                        onMouseLeave={stopManualMove}
                        disabled={mode !== SystemMode.MANUAL}
                        className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white py-6 rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20 group disabled:cursor-not-allowed"
                      >
                         <ArrowUpCircle className="w-8 h-8 group-active:scale-95 transition-transform" />
                         <span className="text-xs font-black tracking-widest uppercase">OPEN</span>
                      </button>
                      <button 
                        onMouseDown={() => startManualMove('CLOSE')}
                        onMouseUp={stopManualMove}
                        onMouseLeave={stopManualMove}
                        disabled={mode !== SystemMode.MANUAL}
                        className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white py-6 rounded-xl flex flex-col items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20 group disabled:cursor-not-allowed"
                      >
                         <ArrowDownCircle className="w-8 h-8 group-active:scale-95 transition-transform" />
                         <span className="text-xs font-black tracking-widest uppercase">CLOSE</span>
                      </button>
                   </div>
                   <p className="text-center text-[10px] text-gray-500 mt-4">
                     Push and hold buttons to operate gate to any position.
                   </p>
                </div>
             </div>
          </div>
          
          {/* Cotton Order Panel - Moved to Left Column */}
          <div className="bg-gray-800 border border-gray-700 p-2 rounded-2xl shadow-2xl">
              <CottonOrder 
                activeOrder={activeOrder}
                onStartOrder={handleStartOrder}
                onCancelOrder={handleCancelOrder}
                lastCompletedOrder={lastCompletedOrder}
                elecRate={ELEC_RATE_UZS}
              />
          </div>

        </div>

        {/* RIGHT COLUMN (8 cols) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
           
           {/* Top Stats Row */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Water Level */}
              <div className="bg-gray-800 border border-gray-700 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Waves className="w-16 h-16 text-cyan-500" />
                 </div>
                 <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Water Level</h3>
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{systemState.waterLevel.toFixed(2)}</span>
                    <span className="text-sm text-gray-500 font-medium">m</span>
                 </div>
                 <div className="mt-2 text-xs text-indigo-400 font-medium flex items-center gap-1">
                    <ArrowUpCircle className="w-3 h-3" /> Target: {config.targetLevel}m
                 </div>
              </div>

              {/* Inflow */}
              <div className="bg-gray-800 border border-gray-700 p-5 rounded-2xl shadow-lg">
                 <div className="flex justify-between items-center">
                    <div>
                       <h3 className="text-xs font-bold text-gray-400 uppercase">Inflow Rate</h3>
                       <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-white">{systemState.inflowRate.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">m³/s</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Outflow */}
              <div className="bg-gray-800 border border-gray-700 p-5 rounded-2xl shadow-lg">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                       <h3 className="text-xs font-bold text-gray-400 uppercase">Outflow Rate</h3>
                       <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-bold text-white">{systemState.outflowRate.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">m³/s</span>
                       </div>
                    </div>
                    <Activity className="w-5 h-5 text-purple-500" />
                 </div>
              </div>

               {/* Gate Status */}
               <div className="bg-gray-800 border border-gray-700 p-5 rounded-2xl shadow-lg">
                 <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase">Gate Status</h3>
                    <ShieldAlert className={`w-4 h-4 ${systemState.gateStatus === 'OPEN' ? 'text-red-500' : 'text-green-500'}`} />
                 </div>
                 <div className="text-xl font-black text-white uppercase tracking-wider">
                    {systemState.gateStatus}
                 </div>
              </div>
           </div>

           {/* AI Insight */}
           <AIReport currentSystemState={systemState} alertLevel={systemState.waterLevel >= CRITICAL_THRESHOLD ? AlertLevel.CRITICAL : systemState.waterLevel >= WARNING_THRESHOLD ? AlertLevel.WARNING : AlertLevel.NORMAL} />

           {/* Power Monitor */}
           <div className="bg-gray-800 border border-gray-700 p-6 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                 <Zap className="w-5 h-5 text-yellow-400" />
                 <h3 className="text-sm font-bold text-gray-200">Power Consumption Monitor</h3>
                 <span className="ml-auto text-[10px] bg-gray-700 px-2 py-1 rounded text-gray-400">2x 5.0 KW Ind. Motors (Dual Drive)</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Real-time Load */}
                 <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Real-time Load</span>
                    <div className="flex items-baseline gap-1">
                       <span className="text-2xl font-bold text-white">{systemState.currentPower.toFixed(1)}</span>
                       <span className="text-xs text-gray-400">kW</span>
                    </div>
                    <div className="w-full bg-gray-700 h-1.5 mt-3 rounded-full overflow-hidden">
                       <div className="bg-yellow-400 h-full transition-all duration-300" style={{ width: `${(systemState.currentPower / (MOTOR_POWER_ACTIVE * 1.5)) * 100}%` }}></div>
                    </div>
                 </div>

                 {/* Total Usage */}
                 <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Total Usage</span>
                    <div className="flex items-center gap-2 mt-1">
                       <Gauge className="w-5 h-5 text-indigo-400" />
                       <span className="text-xl font-bold text-white">{systemState.totalEnergy.toFixed(4)}</span>
                       <span className="text-xs text-gray-400">kWh</span>
                    </div>
                 </div>

                 {/* Cost */}
                 <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 relative overflow-hidden">
                     <div className="absolute right-0 top-0 p-2 opacity-10">
                         <Banknote className="w-12 h-12 text-green-500" />
                     </div>
                    <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Est. Cost (UZS)</span>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-green-500 font-bold text-lg">
                           <span className="text-sm mr-1">🇺🇿</span>
                           {systemState.totalCost.toFixed(1)} 
                       </span>
                       <span className="text-xs text-gray-400">sum</span>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-2 text-right">Rate: {ELEC_RATE_UZS} UZS/kWh</p>
                 </div>
              </div>

              <PowerAnalysis 
                currentPower={systemState.currentPower} 
                totalEnergy={systemState.totalEnergy} 
                totalCost={systemState.totalCost}
                rate={ELEC_RATE_UZS}
              />
           </div>
           
           {/* Bottom Row Charts - Now Only Monthly */}
           <div className="grid grid-cols-1 gap-6">
              <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl shadow-lg h-64">
                 <h3 className="text-xs font-bold text-gray-400 mb-4">Monthly Power Consumption (10-day Aggregation)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                      <XAxis dataKey="period" stroke="#9ca3af" fontSize={10} />
                      <YAxis stroke="#9ca3af" fontSize={10} />
                      <Tooltip 
                        cursor={{fill: '#374151', opacity: 0.2}}
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', fontSize: '12px' }} 
                        formatter={(value: number) => [`${value} kWh`, 'Usage']}
                      />
                      <Bar dataKey="usage" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

      </div>

    </div>
  );
};

export default App;