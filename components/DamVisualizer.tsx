import React from 'react';
import { AlertLevel } from '../types';

interface DamVisualizerProps {
  waterLevel: number; 
  downstreamLevel: number;
  targetLevel: number;
  gateOpening: number; 
  alertLevel: AlertLevel;
  status: string;
  inflowRate: number;
  outflowRate: number;
}

const DamVisualizer: React.FC<DamVisualizerProps> = ({ waterLevel, downstreamLevel, targetLevel, gateOpening, alertLevel, status, inflowRate, outflowRate }) => {
  // Constants for visualization mapping
  const MAX_LEVEL_DISPLAY = 12; // meters (scale up to 12m for 10m control)
  const MAX_GATE_HEIGHT_CM = 200; // Matches App.tsx constant
  
  const SVG_HEIGHT = 400;
  const SVG_WIDTH = 800;
  
  // Upstream Ground Level
  const UPSTREAM_GROUND_Y = 350;
  
  // Downstream Ground Level (2 meters lower)
  const PIXELS_PER_METER = 22; // Scaled up to fill view
  const DOWNSTREAM_DROP_M = 2; 
  const DOWNSTREAM_GROUND_Y = UPSTREAM_GROUND_Y + (DOWNSTREAM_DROP_M * PIXELS_PER_METER);

  const DAM_X = 400;
  const DAM_WIDTH = 80;
  
  // Represents physical gate height visually (Scaled to match PIXELS_PER_METER)
  // 200cm = 2m. 2 * 22 = 44px. This ensures 100% opening visual aligns with 2m on ruler.
  const GATE_HEIGHT_PX = (MAX_GATE_HEIGHT_CM / 100) * PIXELS_PER_METER; 
  
  // Calculations
  const waterHeightPx = Math.min(waterLevel, MAX_LEVEL_DISPLAY) * PIXELS_PER_METER;
  const downstreamHeightPx = Math.min(downstreamLevel, MAX_LEVEL_DISPLAY) * PIXELS_PER_METER;
  const targetHeightPx = Math.min(targetLevel, MAX_LEVEL_DISPLAY) * PIXELS_PER_METER;
  
  // Gate animation (Moves UP)
  const gateTravelPx = (gateOpening / 100) * GATE_HEIGHT_PX;
  
  // Water flow thickness
  const currentFlowHeightPx = (gateOpening / 100) * GATE_HEIGHT_PX;
  const currentOpeningCm = (gateOpening / 100) * MAX_GATE_HEIGHT_CM;

  const statusColor = 
    status === 'OPENING' ? '#3b82f6' :
    status === 'CLOSING' ? '#f59e0b' :
    status === 'CLOSED' ? '#ef4444' :
    '#10b981';

  return (
    <div className="w-full h-auto aspect-[2/1] min-h-[300px] bg-gray-900 rounded-xl overflow-hidden border border-gray-700 relative flex items-center justify-center shadow-2xl">
      
      {/* SVG Container */}
      <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        
        {/* --- Definitions --- */}
        <defs>
          <linearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.9" />
          </linearGradient>
          <pattern id="concretePattern" patternUnits="userSpaceOnUse" width="20" height="20">
             <rect width="20" height="20" fill="#44403c" />
             <path d="M0 20 L20 0" stroke="#57534e" strokeWidth="1" opacity="0.5"/>
          </pattern>
        </defs>

        {/* --- Background --- */}
        <rect width="100%" height="100%" fill="url(#skyGradient)" />

        {/* --- Upstream Ground (Left) --- */}
        <path d={`M 0 ${UPSTREAM_GROUND_Y} L ${DAM_X - DAM_WIDTH/2} ${UPSTREAM_GROUND_Y} L ${DAM_X - DAM_WIDTH/2} ${SVG_HEIGHT} L 0 ${SVG_HEIGHT} Z`} fill="#292524" />
        
        {/* --- Downstream Ground (Right - Lower) --- */}
        <path d={`M ${DAM_X + DAM_WIDTH/2} ${DOWNSTREAM_GROUND_Y} L ${SVG_WIDTH} ${DOWNSTREAM_GROUND_Y} L ${SVG_WIDTH} ${SVG_HEIGHT} L ${DAM_X + DAM_WIDTH/2} ${SVG_HEIGHT} Z`} fill="#292524" />

        {/* --- Upstream Water (Left) --- */}
        <path 
          d={`
            M 0 ${UPSTREAM_GROUND_Y} 
            L ${DAM_X - DAM_WIDTH/2} ${UPSTREAM_GROUND_Y} 
            L ${DAM_X - DAM_WIDTH/2} ${UPSTREAM_GROUND_Y - waterHeightPx} 
            L 0 ${UPSTREAM_GROUND_Y - waterHeightPx} 
            Z
          `} 
          fill="url(#waterGradient)"
          className="transition-all duration-500 ease-in-out"
        />
        
        {/* --- Target Level Line --- */}
        <g className="transition-all duration-500 ease-in-out" transform={`translate(0, -${targetHeightPx})`}>
          <line 
            x1="10" 
            y1={UPSTREAM_GROUND_Y} 
            x2={DAM_X - DAM_WIDTH/2 + 20} 
            y2={UPSTREAM_GROUND_Y} 
            stroke="#ef4444" 
            strokeWidth="2" 
            strokeDasharray="5,5" 
            opacity="0.8"
          />
          <text x="20" y={UPSTREAM_GROUND_Y - 5} fill="#ef4444" fontSize="12" fontWeight="bold">Target: {targetLevel.toFixed(1)}m</text>
        </g>

        {/* --- Dam Structure (Center) --- */}
        {/* Main Wall - Extends to bottom to cover drop */}
        <path 
          d={`
            M ${DAM_X - DAM_WIDTH/2} ${UPSTREAM_GROUND_Y}
            L ${DAM_X - DAM_WIDTH/2} 50
            L ${DAM_X + DAM_WIDTH/2} 50
            L ${DAM_X + DAM_WIDTH/2} ${DOWNSTREAM_GROUND_Y}
            L ${DAM_X + DAM_WIDTH/2} ${SVG_HEIGHT}
            L ${DAM_X - DAM_WIDTH/2} ${SVG_HEIGHT}
            Z
          `}
          fill="url(#concretePattern)" 
          stroke="#292524"
        />
        
        {/* Gate Opening (Hole) - Relative to Upstream Ground */}
        <rect 
          x={DAM_X - DAM_WIDTH/2 + 5} 
          y={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX} 
          width={DAM_WIDTH - 10} 
          height={GATE_HEIGHT_PX} 
          fill="#0f172a" 
        />

        {/* --- The Gate (Moving Part) --- */}
        <g transform={`translate(0, -${gateTravelPx})`} className="transition-transform duration-300 ease-linear">
          
          {/* Threaded Rod (Rising Stem) */}
          {/* Main Rod */}
          <line 
            x1={DAM_X} 
            y1={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX} 
            x2={DAM_X} 
            y2={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX - 350} 
            stroke="#94a3b8" 
            strokeWidth="8"
          />
          {/* Thread Pattern */}
          <line 
            x1={DAM_X} 
            y1={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX} 
            x2={DAM_X} 
            y2={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX - 350} 
            stroke="#475569" 
            strokeWidth="6"
            strokeDasharray="2,3"
            opacity="0.5"
          />

          {/* Gate Plate */}
          <rect 
            x={DAM_X - DAM_WIDTH/2 + 5} 
            y={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX - 20} 
            width={DAM_WIDTH - 10} 
            height={GATE_HEIGHT_PX + 20} 
            fill="#6b7280" 
            stroke="#374151"
            strokeWidth="2"
          />
          {/* Industrial Ribs */}
          <line x1={DAM_X - DAM_WIDTH/2 + 10} y1={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX + 5} x2={DAM_X + DAM_WIDTH/2 - 10} y2={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX + 5} stroke="#4b5563" strokeWidth="2" />
          <line x1={DAM_X - DAM_WIDTH/2 + 10} y1={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX + 25} x2={DAM_X + DAM_WIDTH/2 - 10} y2={UPSTREAM_GROUND_Y - GATE_HEIGHT_PX + 25} stroke="#4b5563" strokeWidth="2" />
          
          {/* Branding */}
          <rect x={DAM_X - 25} y={UPSTREAM_GROUND_Y - 35} width="50" height="15" fill="#1f2937" rx="2" />
          <text x={DAM_X} y={UPSTREAM_GROUND_Y - 24} textAnchor="middle" fill="#eab308" fontSize="10" fontWeight="bold" fontFamily="monospace">TOSS</text>
        </g>

        {/* --- Motor Assembly (Static, on top of Dam) --- */}
        <g transform={`translate(${DAM_X}, 50)`}>
             {/* Platform */}
             <rect x="-25" y="-5" width="50" height="10" fill="#334155" stroke="#1e2937" />
             
             {/* Motor Housing */}
             <rect x="-20" y="-45" width="40" height="40" fill="#1e2937" stroke="#475569" rx="2" />
             
             {/* Cooling Fins */}
             {[...Array(5)].map((_, i) => (
               <line key={i} x1="-15" y1={-40 + i*8} x2="15" y2={-40 + i*8} stroke="#334155" strokeWidth="2" />
             ))}

             {/* Manual Handwheel */}
             <g transform="translate(25, -25)">
                <circle cx="0" cy="0" r="12" fill="none" stroke="#dc2626" strokeWidth="3" />
                <line x1="-12" y1="0" x2="12" y2="0" stroke="#dc2626" strokeWidth="2" />
                <line x1="0" y1="-12" x2="0" y2="12" stroke="#dc2626" strokeWidth="2" />
             </g>
             
             {/* Shaft to Wheel */}
             <line x1="20" y1="-25" x2="13" y2="-25" stroke="#64748b" strokeWidth="4" />
        </g>
        
        {/* --- Ultrasonic Sensors --- */}
        {/* Left Sensor (Upstream) */}
        <g transform={`translate(${DAM_X - DAM_WIDTH/2}, 80)`}>
            {/* Arm */}
            <line x1="0" y1="0" x2="-40" y2="0" stroke="#475569" strokeWidth="3" />
            <line x1="-40" y1="0" x2="-40" y2="10" stroke="#475569" strokeWidth="3" />
            
            {/* Sensor Unit */}
            <g transform="translate(-40, 10)">
               <rect x="-8" y="0" width="16" height="24" rx="2" fill="#3b82f6" stroke="#1e40af" />
               <rect x="-5" y="24" width="10" height="6" fill="#1d4ed8" />
               
               {/* Waves */}
               <path d="M -10 35 Q 0 40 10 35" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0">
                  <animate attributeName="d" values="M -8 32 Q 0 35 8 32; M -20 50 Q 0 60 20 50" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
               </path>
               <path d="M -10 35 Q 0 40 10 35" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0">
                  <animate attributeName="d" values="M -8 32 Q 0 35 8 32; M -20 50 Q 0 60 20 50" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
               </path>
            </g>
        </g>

        {/* Right Sensor (Downstream) */}
        <g transform={`translate(${DAM_X + DAM_WIDTH/2}, 80)`}>
            {/* Arm */}
            <line x1="0" y1="0" x2="40" y2="0" stroke="#475569" strokeWidth="3" />
            <line x1="40" y1="0" x2="40" y2="10" stroke="#475569" strokeWidth="3" />
            
            {/* Sensor Unit */}
            <g transform="translate(40, 10)">
               <rect x="-8" y="0" width="16" height="24" rx="2" fill="#3b82f6" stroke="#1e40af" />
               <rect x="-5" y="24" width="10" height="6" fill="#1d4ed8" />
               
               {/* Waves */}
               <path d="M -10 35 Q 0 40 10 35" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0">
                  <animate attributeName="d" values="M -8 32 Q 0 35 8 32; M -20 50 Q 0 60 20 50" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.5s" repeatCount="indefinite" />
               </path>
               <path d="M -10 35 Q 0 40 10 35" stroke="#60a5fa" strokeWidth="1.5" fill="none" opacity="0">
                  <animate attributeName="d" values="M -8 32 Q 0 35 8 32; M -20 50 Q 0 60 20 50" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1.5s" begin="0.5s" repeatCount="indefinite" />
               </path>
            </g>
        </g>

        {/* --- Downstream Water (Right) --- */}
        {/* Base Downstream Level */}
        <path 
          d={`
            M ${DAM_X + DAM_WIDTH/2} ${DOWNSTREAM_GROUND_Y} 
            L ${SVG_WIDTH} ${DOWNSTREAM_GROUND_Y} 
            L ${SVG_WIDTH} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx} 
            L ${DAM_X + DAM_WIDTH/2} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx} 
            Z
          `} 
          fill="url(#waterGradient)"
          className="transition-all duration-500 ease-in-out"
        />

        {/* Dynamic Outflow Stream Connecting Gate to Downstream Pool */}
        {gateOpening > 0 && waterLevel > 0.5 && (
          <path 
            d={`
              M ${DAM_X + DAM_WIDTH/2} ${UPSTREAM_GROUND_Y} 
              L ${DAM_X + DAM_WIDTH/2 + 20} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx} 
              L ${SVG_WIDTH} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx} 
              L ${SVG_WIDTH} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx - currentFlowHeightPx} 
              L ${DAM_X + DAM_WIDTH/2 + 20} ${DOWNSTREAM_GROUND_Y - downstreamHeightPx - currentFlowHeightPx} 
              L ${DAM_X + DAM_WIDTH/2} ${UPSTREAM_GROUND_Y - currentFlowHeightPx} 
              Z
            `} 
            fill="url(#waterGradient)"
            opacity="0.8"
            className="transition-all duration-300"
          />
        )}
        
        {/* --- Downstream Flow Particles --- */}
        {gateOpening > 0 && waterLevel > 0.5 && (
           <g>
             {[...Array(5)].map((_, i) => (
                <circle key={i} cx={DAM_X + DAM_WIDTH/2} cy={UPSTREAM_GROUND_Y - 5} r={2 + Math.random()} fill="white" opacity="0.6">
                    <animate 
                        attributeName="cx" 
                        from={DAM_X + DAM_WIDTH/2} 
                        to={SVG_WIDTH} 
                        dur={`${0.8 + Math.random()}s`} 
                        begin={`${Math.random()}s`}
                        repeatCount="indefinite" 
                    />
                    <animate 
                        attributeName="cy" 
                        values={`${UPSTREAM_GROUND_Y - 5};${DOWNSTREAM_GROUND_Y - 10};${DOWNSTREAM_GROUND_Y - 10}`}
                        keyTimes="0;0.2;1"
                        dur={`${0.8 + Math.random()}s`} 
                        begin={`${Math.random()}s`}
                        repeatCount="indefinite" 
                    />
                    <animate 
                        attributeName="opacity" 
                        values="0.6;0" 
                        dur={`${0.8 + Math.random()}s`} 
                        begin={`${Math.random()}s`}
                        repeatCount="indefinite" 
                    />
                </circle>
             ))}
           </g>
        )}

        {/* --- Gate Level Visual Indicator (CM) --- */}
        {gateOpening > 3 && (
            <g transform={`translate(${DAM_X}, ${UPSTREAM_GROUND_Y})`}>
               {/* Vertical Dimension Line */}
               <line 
                 x1="0" y1="0" 
                 x2="0" y2={-gateTravelPx} 
                 stroke="white" 
                 strokeWidth="1.5" 
                 strokeDasharray="2,2"
                 opacity="0.9"
               />
               
               {/* Top Tick (Gate Bottom) */}
               <line 
                 x1="-10" y1={-gateTravelPx} 
                 x2="10" y2={-gateTravelPx} 
                 stroke="white" 
                 strokeWidth="1.5" 
                 opacity="0.9"
               />
               
               {/* Bottom Tick (Ground) */}
               <line 
                 x1="-10" y1="0" 
                 x2="10" y2="0" 
                 stroke="white" 
                 strokeWidth="1.5" 
                 opacity="0.9"
               />

               {/* Badge */}
               <g transform={`translate(0, ${-gateTravelPx / 2})`}>
                   <rect x="-24" y="-9" width="48" height="18" rx="9" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
                   <text 
                     x="0" 
                     y="4" 
                     textAnchor="middle" 
                     fill="#fff" 
                     fontSize="11" 
                     fontWeight="bold"
                     style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                   >
                     {currentOpeningCm.toFixed(0)}cm
                   </text>
               </g>
            </g>
        )}

        {/* --- Measurement Ruler (Left Bank) --- */}
        <g transform={`translate(${DAM_X - DAM_WIDTH/2 - 10}, 0)`}>
             {/* Ruler Line */}
             <line x1="0" y1={UPSTREAM_GROUND_Y} x2="0" y2={UPSTREAM_GROUND_Y - (12 * PIXELS_PER_METER)} stroke="#64748b" strokeWidth="2" />
             
             {/* Ticks */}
             {[0, 2, 4, 6, 8, 10, 12].map(m => (
               <g key={m}>
                 <line 
                   x1="0" 
                   y1={UPSTREAM_GROUND_Y - m * PIXELS_PER_METER} 
                   x2="-8" 
                   y2={UPSTREAM_GROUND_Y - m * PIXELS_PER_METER} 
                   stroke="#64748b" 
                   strokeWidth="1" 
                 />
                 <text x="-12" y={UPSTREAM_GROUND_Y - m * PIXELS_PER_METER + 4} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="500">{m}m</text>
               </g>
             ))}
        </g>

        {/* --- Location Labels (Custom from Screenshot) --- */}
        <text x="120" y={UPSTREAM_GROUND_Y - 20} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" stroke="#000" strokeWidth="1" style={{textShadow: "0px 2px 4px rgba(0,0,0,0.5)"}}>Miankal Xatirchi</text>
        <text x={SVG_WIDTH - 120} y={DOWNSTREAM_GROUND_Y - 20} textAnchor="middle" fill="white" fontSize="24" fontWeight="bold" stroke="#000" strokeWidth="1" style={{textShadow: "0px 2px 4px rgba(0,0,0,0.5)"}}>Toss kanali</text>

        {/* --- Labels --- */}
        <text x="20" y="200" fill="#94a3b8" fontSize="14" fontWeight="bold" letterSpacing="1">UPSTREAM RESERVOIR</text>
        <text x={SVG_WIDTH - 20} y={DOWNSTREAM_GROUND_Y + 30} textAnchor="end" fill="#57534e" fontSize="14" fontWeight="bold" letterSpacing="1">DOWNSTREAM (-2m)</text>
        
        {/* Section View Label with Target Icon */}
        <g transform={`translate(${DAM_X}, 40)`}>
            <text x="0" y="0" textAnchor="middle" fill="#64748b" fontSize="10" letterSpacing="2">SECTION VIEW</text>
            <g transform="translate(45, -3)">
                <circle cx="0" cy="0" r="5" stroke="#ef4444" strokeWidth="1.5" fill="none" />
                <line x1="-7" y1="0" x2="7" y2="0" stroke="#ef4444" strokeWidth="1.5" />
                <line x1="0" y1="-7" x2="0" y2="7" stroke="#ef4444" strokeWidth="1.5" />
            </g>
        </g>

      </svg>

      {/* --- Overlay Stats Panel (Top Right) --- */}
      <div className="absolute top-4 right-4 bg-gray-900/80 backdrop-blur border-2 border-dashed border-blue-500/30 p-4 rounded-xl shadow-2xl min-w-[180px]">
         <div className="flex items-center justify-between mb-3 border-b border-gray-700/50 pb-2">
            <span className="text-xs uppercase font-bold text-blue-400 tracking-wider">HCC2 HMI Status</span>
            <div className={`w-2 h-2 rounded-full ${status === 'OPEN' || status === 'OPENING' ? 'animate-pulse' : ''}`} style={{ backgroundColor: statusColor }}></div>
         </div>
         
         <div className="space-y-3">
             <div className="flex justify-between items-end">
                <span className="text-xs text-gray-400 font-medium">Gate Position</span>
                <div className="text-right">
                    <span className="text-lg font-mono text-yellow-400 font-bold leading-none">{gateOpening.toFixed(0)}%</span>
                    <span className="text-[10px] font-mono text-yellow-500/70 block">{currentOpeningCm.toFixed(0)}cm</span>
                </div>
             </div>
             
             <div className="flex justify-between items-end">
                <span className="text-xs text-gray-400 font-medium">Inflow</span>
                <div className="text-right">
                    <span className="text-sm font-mono text-blue-400 font-bold leading-none">{inflowRate.toFixed(1)}</span>
                    <span className="text-[10px] font-mono text-gray-500 ml-1">m³/s</span>
                </div>
             </div>

             <div className="flex justify-between items-end">
                <span className="text-xs text-gray-400 font-medium">Outflow</span>
                <div className="text-right">
                    <span className="text-sm font-mono text-purple-400 font-bold leading-none">{outflowRate.toFixed(1)}</span>
                    <span className="text-[10px] font-mono text-gray-500 ml-1">m³/s</span>
                </div>
             </div>
         </div>
      </div>

    </div>
  );
};

export default DamVisualizer;