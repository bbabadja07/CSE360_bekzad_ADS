import React, { useState } from 'react';
import { jsPDF } from "jspdf";
import { FileDown, CheckCircle, X, Loader2, FileText, Bell } from 'lucide-react';
import { WateringOrder } from '../types';

interface CottonOrderProps {
  activeOrder: WateringOrder | null;
  onStartOrder: (clientName: string, hectares: number) => void;
  onCancelOrder: () => void;
  lastCompletedOrder: WateringOrder | null;
  elecRate: number;
}

const CottonOrder: React.FC<CottonOrderProps> = ({ 
  activeOrder, 
  onStartOrder, 
  onCancelOrder, 
  lastCompletedOrder,
  elecRate
}) => {
  const [showModal, setShowModal] = useState(false);
  const [clientName, setClientName] = useState("Javlon Dehqon");
  const [hectares, setHectares] = useState(50);
  
  // Rate Constants
  const WATER_RATE_PER_HA = 1000; // m3/ha (Average of 900-1200)
  const WATER_COST_PER_M3 = 100; // UZS

  const handleStart = () => {
    onStartOrder(clientName, hectares);
    setShowModal(false);
  };

  const generatePDF = (order: WateringOrder) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(31, 41, 55); // Gray 800
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("Watering Completion Report", 105, 25, { align: "center" });
    
    // Client Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Client Details", 20, 60);
    doc.setLineWidth(0.5);
    doc.line(20, 62, 190, 62);
    
    doc.setFontSize(12);
    doc.text(`Client Name: ${order.clientName}`, 20, 75);
    doc.text(`Land Area: ${order.hectares} Hectares`, 20, 85);
    doc.text(`Crop Type: Cotton`, 20, 95);
    doc.text(`Date: ${new Date(order.endTime || Date.now()).toLocaleDateString()}`, 120, 75);

    // Usage Statistics
    doc.setFontSize(14);
    doc.text("Consumption & Cost Analysis", 20, 115);
    doc.line(20, 117, 190, 117);

    doc.setFontSize(12);
    
    // Water
    doc.text(`Total Water Delivered:`, 20, 130);
    doc.text(`${order.deliveredVolume.toFixed(2)} m³`, 120, 130);
    
    // Duration
    const durationHrs = ((order.endTime || Date.now()) - order.startTime) / (1000 * 3600);
    doc.text(`Duration:`, 20, 140);
    doc.text(`${durationHrs.toFixed(2)} Hours`, 120, 140);
    
    // Power
    doc.text(`Power Consumption:`, 20, 150);
    doc.text(`${order.powerConsumed.toFixed(4)} kWh`, 120, 150);

    // Financials
    doc.setFillColor(240, 253, 244); // Light green bg
    doc.rect(20, 165, 170, 50, 'F');
    doc.setTextColor(21, 128, 61); // Green 700
    doc.setFontSize(16);
    doc.text("Financial Summary", 30, 180);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const waterCost = order.deliveredVolume * WATER_COST_PER_M3;
    const powerCost = order.powerConsumed * elecRate;
    const totalCost = waterCost + powerCost;

    doc.text(`Water Cost (${WATER_COST_PER_M3} UZS/m³):`, 30, 195);
    doc.text(`${waterCost.toLocaleString()} UZS`, 130, 195, { align: "right" });
    
    doc.text(`Power Cost (${elecRate} UZS/kWh):`, 30, 205);
    doc.text(`${powerCost.toLocaleString()} UZS`, 130, 205, { align: "right" });
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL DUE:`, 30, 225); // corrected Y coordinate to be inside the box
    doc.text(`${totalCost.toLocaleString()} UZS`, 130, 225, { align: "right" });

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text("ADS - Autonomous Dam System | Team 001", 105, 280, { align: "center" });

    doc.save(`ADS_Report_${order.clientName.replace(/\s/g, '_')}_${Date.now()}.pdf`);
  };

  const generateJavlonReport = () => {
    // Generate a mock report for Javlon Dehqon
    const mockOrder: WateringOrder = {
        id: 'javlon-report-001',
        clientName: 'Javlon Dehqon',
        hectares: 50,
        targetVolume: 50000, 
        deliveredVolume: 50000,
        startTime: Date.now() - 7200000, // 2 hours ago
        endTime: Date.now(),
        status: 'COMPLETED',
        powerConsumed: 20.4, 
        waterCost: 5000000 
    };
    generatePDF(mockOrder);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 h-20">
          {/* Main Trigger Button */}
          <button 
            onClick={() => setShowModal(true)}
            disabled={!!activeOrder}
            className={`flex-1 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-lg ${
                activeOrder 
                ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-gray-600' 
                : 'bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 hover:shadow-emerald-500/20'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider font-bold">{activeOrder ? 'IN PROGRESS' : 'COTTON WATERING'}</span>
          </button>

          {/* Javlon Report Button */}
          <button 
             onClick={generateJavlonReport}
             className="px-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-400 hover:text-white transition-all shadow-lg flex flex-col items-center justify-center gap-1 w-24"
             title="Export Report for Javlon Dehqon"
          >
             <FileText className="w-5 h-5" />
             <span className="text-[10px] uppercase font-bold leading-tight text-center">Export<br/>Report</span>
          </button>
      </div>

      {/* Active Order Status Card */}
      {activeOrder && (
        <div className="mt-2 bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="text-emerald-400 text-sm font-bold flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Watering: {activeOrder.clientName}
                    </h4>
                    <p className="text-xs text-emerald-500/70">{activeOrder.hectares} ha • Target: {(activeOrder.targetVolume).toLocaleString()} m³</p>
                </div>
                <button onClick={onCancelOrder} className="text-gray-400 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden mb-2">
                <div 
                    className="h-full bg-emerald-500 transition-all duration-300 relative"
                    style={{ width: `${Math.min(100, (activeOrder.deliveredVolume / activeOrder.targetVolume) * 100)}%` }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
            </div>
            
            <div className="flex justify-between text-xs font-mono">
                <span className="text-white">{activeOrder.deliveredVolume.toFixed(1)} m³</span>
                <span className="text-emerald-400">{((activeOrder.deliveredVolume / activeOrder.targetVolume) * 100).toFixed(1)}%</span>
            </div>
        </div>
      )}

      {/* Last Completed Report Download Button */}
      {lastCompletedOrder && !activeOrder && (
          <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center justify-between animate-in fade-in">
              <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Order Complete
                  </div>
                  <div className="text-xs text-gray-500">
                      {lastCompletedOrder.clientName} • {lastCompletedOrder.hectares} ha
                  </div>
              </div>
              <button 
                onClick={() => generatePDF(lastCompletedOrder)}
                className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all"
              >
                  <FileDown className="w-4 h-4" />
                  PDF Report
              </button>
          </div>
      )}

      {/* Input Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button 
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-600 p-3 rounded-xl">
                        <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Cotton Field Order</h3>
                        <p className="text-sm text-gray-400">Configure manual watering parameters</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Client Name</label>
                        <input 
                            type="text" 
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Land Area (Hectares)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                value={hectares}
                                onChange={(e) => setHectares(Number(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                            <span className="text-gray-500 font-bold">ha</span>
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Volume Required:</span>
                            <span className="text-white font-mono">{(hectares * WATER_RATE_PER_HA).toLocaleString()} m³</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Est. Water Cost:</span>
                            <span className="text-emerald-400 font-mono font-bold">{(hectares * WATER_RATE_PER_HA * WATER_COST_PER_M3).toLocaleString()} UZS</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 italic">
                            * Based on 1,000 m³/ha requirement @ 100 UZS/m³
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button 
                        onClick={() => setShowModal(false)}
                        className="flex-1 py-3 rounded-lg font-bold text-gray-300 hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleStart}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        Start Order
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CottonOrder;