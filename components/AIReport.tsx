import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SystemState, AlertLevel } from '../types';
import { Bot, Loader2, RefreshCw } from 'lucide-react';

interface AIReportProps {
  currentSystemState: SystemState;
  alertLevel: AlertLevel;
}

const AIReport: React.FC<AIReportProps> = ({ currentSystemState, alertLevel }) => {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateReport = async () => {
    if (!process.env.API_KEY) {
      setReport("API Key is missing. Please configure the environment.");
      return;
    }

    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        You are the AI control unit for an Autonomous Dam System (ADS).
        Analyze the following telemetry snapshot and provide a concise status report and recommendation.
        
        Telemetry:
        - Water Level: ${currentSystemState.waterLevel.toFixed(2)} meters
        - Inflow Rate: ${currentSystemState.inflowRate.toFixed(1)} m3/s
        - Outflow Rate: ${currentSystemState.outflowRate.toFixed(1)} m3/s
        - Gate Opening: ${currentSystemState.gateOpening.toFixed(0)}%
        - Gate Status: ${currentSystemState.gateStatus}
        - Alert Status: ${alertLevel}
        - Raining: ${currentSystemState.isRaining ? 'Yes' : 'No'}
        
        Format your response as a JSON object with two fields: "status_summary" (string, max 20 words) and "recommendation" (string, max 20 words).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      
      setReport(response.text);
    } catch (error) {
      console.error("Gemini Error:", error);
      setReport(JSON.stringify({ status_summary: "AI Connection Failed", recommendation: "Check manual logs." }));
    } finally {
      setLoading(false);
    }
  };

  let parsedReport = { status_summary: "Ready to analyze", recommendation: "Press generate." };
  try {
    if (report) {
      parsedReport = JSON.parse(report);
    }
  } catch (e) {
    // Fallback if parsing fails
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-indigo-400">
          <Bot className="w-5 h-5" />
          ADS AI Insight
        </h3>
        <button 
          onClick={generateReport}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Generate Analysis'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-700/50 p-4 rounded-lg border-l-4 border-indigo-500">
          <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">System Status</span>
          <p className="text-gray-100 font-medium">{parsedReport.status_summary}</p>
        </div>
        <div className="bg-gray-700/50 p-4 rounded-lg border-l-4 border-emerald-500">
          <span className="text-xs uppercase tracking-wider text-gray-400 block mb-1">AI Recommendation</span>
          <p className="text-gray-100 font-medium">{parsedReport.recommendation}</p>
        </div>
      </div>
    </div>
  );
};

export default AIReport;