import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileText, Loader2, TrendingUp, Lightbulb, CheckCircle2 } from 'lucide-react';

interface PowerAnalysisProps {
  currentPower: number;
  totalEnergy: number;
  totalCost: number;
  rate: number;
}

interface AnalysisResult {
  efficiency_status: string;
  projected_monthly_cost: string;
  optimization_tip: string;
}

const PowerAnalysis: React.FC<PowerAnalysisProps> = ({ currentPower, totalEnergy, totalCost, rate }) => {
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!process.env.API_KEY) {
      alert("API Key missing");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        You are an industrial energy auditor. Analyze this power consumption data for a Dam Gate Control System:
        - Real-time Load: ${currentPower.toFixed(2)} kW
        - Total Session Energy: ${totalEnergy.toFixed(4)} kWh
        - Total Session Cost: ${totalCost.toFixed(2)} UZS
        - Electricity Rate: ${rate} UZS/kWh
        
        Assume standard industrial usage patterns (intermittent motor activation).
        
        Provide a JSON response with exactly these keys:
        - "efficiency_status": Short assessment (e.g., "Optimal", "High Load", "Inefficient").
        - "projected_monthly_cost": Estimate monthly cost in UZS assuming this average load continues (Calculated value formatted as currency string).
        - "optimization_tip": A specific, actionable technical tip to reduce this cost (max 15 words).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      const text = response.text;
      if (text) {
        setReport(JSON.parse(text));
      }
    } catch (error) {
      console.error("Analysis Failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-700 relative z-10">
       <div className="flex justify-between items-center">
         <div className="flex items-center gap-2">
            <div className="bg-yellow-500/20 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
                <h4 className="text-sm font-semibold text-gray-200">Cost & Efficiency Report</h4>
                <p className="text-[10px] text-gray-500">AI-driven financial analysis</p>
            </div>
         </div>
         
         <button 
            onClick={generateReport}
            disabled={loading}
            className="group flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 active:bg-gray-800 text-gray-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-all border border-gray-600 hover:border-gray-500"
         >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4 group-hover:text-green-400 transition-colors" />}
            {loading ? 'Analyzing...' : 'Generate Report'}
         </button>
       </div>

       {report && (
         <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Status */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Status
                </span>
                <span className="text-sm font-medium text-white">{report.efficiency_status}</span>
            </div>

            {/* Projection */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Monthly Projection
                </span>
                <span className="text-sm font-medium text-green-400">{report.projected_monthly_cost}</span>
            </div>

            {/* Tip */}
            <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Optimization
                </span>
                <span className="text-xs text-gray-300 leading-relaxed">{report.optimization_tip}</span>
            </div>
         </div>
       )}
    </div>
  );
};

export default PowerAnalysis;