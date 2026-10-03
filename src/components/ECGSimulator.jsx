import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Server, RadioReceiver, ShieldAlert, CheckCircle, AlertTriangle, AlertOctagon, Info, Play, RotateCcw, HeartPulse, Wifi, Signal, HardDrive, Share2, ArrowRight, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { generateECGData } from '../utils/ecgGenerator';
import { processSignal, calculateMetrics } from '../utils/signalProcessing';

export default function ECGSimulator() {
  const [originalData, setOriginalData] = useState([]);
  
  const [noiseLevel, setNoiseLevel] = useState(0); 
  const [latency, setLatency] = useState(100); 
  const [compression, setCompression] = useState(0); 
  const [signalLoss, setSignalLoss] = useState(0); 
  
  const [experimentResults, setExperimentResults] = useState([]);
  const [isExperimentRunning, setIsExperimentRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('comparison'); // 'original', 'received', 'comparison'

  useEffect(() => {
    handleGenerateECG();
  }, []);

  const handleGenerateECG = () => {
    const data = generateECGData(250, 4, 75); 
    setOriginalData(data);
  };

  const handleReset = () => {
    setNoiseLevel(0);
    setLatency(100);
    setCompression(0);
    setSignalLoss(0);
    setExperimentResults([]);
    handleGenerateECG();
  };

  const processedData = useMemo(() => {
    if (originalData.length === 0) return [];
    return processSignal(originalData, { noiseLevel, latency, compression, signalLoss });
  }, [originalData, noiseLevel, latency, compression, signalLoss]);

  const metrics = useMemo(() => {
    if (originalData.length === 0 || processedData.length === 0) return { snr: 0, mse: 0, dataReduction: 0, actualSignalLoss: 0 };
    return calculateMetrics(originalData, processedData);
  }, [originalData, processedData]);

  const getImpactLevel = () => {
    const snr = parseFloat(metrics.snr);
    const loss = parseFloat(metrics.actualSignalLoss);
    
    if (snr > 20 && loss < 5 && noiseLevel < 15) return 'Low';
    if (snr > 10 && loss < 15 && noiseLevel < 30) return 'Moderate';
    return 'High';
  };

  const impactLevel = getImpactLevel();

  const getDiscussionText = () => {
    let text = [];
    if (noiseLevel <= 10 && latency <= 200 && compression <= 20 && signalLoss <= 5) {
       return ["Low impairment is present. The received ECG remains visually similar to the original signal, allowing for clear interpretation."];
    }
    
    if (noiseLevel > 20) text.push("Higher noise introduces visible fluctuations and reduces waveform clarity.");
    if (latency > 400) text.push("Higher network latency increases the delay between ECG acquisition and reception, affecting real-time monitoring.");
    if (compression > 40) text.push("Higher compression reduces data size but removes waveform details, potentially masking subtle morphological changes.");
    if (signalLoss > 15) text.push("Missing ECG segments can hide important waveform information, severely affecting interpretation.");
    
    return text.length > 0 ? text : ["Moderate impairments affect the signal, requiring careful review."];
  };

  const runExperiment = () => {
    setIsExperimentRunning(true);
    setTimeout(() => {
      const tests = [
        { name: "Clean Signal", noise: 0, lat: 50, comp: 0, loss: 0 },
        { name: "Low Noise", noise: 10, lat: 100, comp: 20, loss: 5 },
        { name: "Moderate Disturbance", noise: 25, lat: 300, comp: 50, loss: 15 },
        { name: "Severe Disturbance", noise: 40, lat: 800, comp: 80, loss: 35 }
      ];

      const results = tests.map(test => {
        const pData = processSignal(originalData, { 
          noiseLevel: test.noise, 
          latency: test.lat, 
          compression: test.comp, 
          signalLoss: test.loss 
        });
        const mets = calculateMetrics(originalData, pData);
        
        let impact = 'High';
        const snr = parseFloat(mets.snr);
        const lossVal = parseFloat(mets.actualSignalLoss);
        if (snr > 20 && lossVal < 5 && test.noise < 15) impact = 'Low';
        else if (snr > 10 && lossVal < 15 && test.noise < 30) impact = 'Moderate';

        return { ...test, ...mets, impact };
      });

      setExperimentResults(results);
      setIsExperimentRunning(false);
    }, 800);
  };

  const handleDownloadReport = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Telecardiology ECG Transmission Report', 20, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text('Transmission Settings', 20, 35);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Noise Level: ${noiseLevel}%`, 20, 43);
    doc.text(`Network Latency: ${latency} ms`, 20, 50);
    doc.text(`Data Compression: ${compression}%`, 20, 57);
    doc.text(`Signal Loss: ${signalLoss}%`, 20, 64);
    
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text('Signal Quality Metrics', 20, 80);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signal-to-Noise Ratio (SNR): ${metrics.snr} dB`, 20, 88);
    doc.text(`Mean Squared Error (MSE): ${metrics.mse}`, 20, 95);
    doc.text(`Estimated Data Reduction: ${metrics.dataReduction}%`, 20, 102);
    doc.text(`Missing Data: ${metrics.actualSignalLoss}%`, 20, 109);
    
    doc.setFontSize(14);
    doc.setTextColor(51, 65, 85);
    doc.text('Interpretation Impact', 20, 125);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Overall Impact Level: ${impactLevel.toUpperCase()}`, 20, 133);
    
    const discussionLines = doc.splitTextToSize(getDiscussionText().join(' '), 170);
    doc.text(discussionLines, 20, 142);
    
    if (experimentResults.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('Automated Experiment Results', 20, 20);
      
      let y = 35;
      experimentResults.forEach((res, idx) => {
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85);
        doc.text(`Test ${idx + 1}: ${res.name}`, 20, y);
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Noise: ${res.noise}%, Latency: ${res.lat}ms, Compression: ${res.comp}%, Loss: ${res.loss}%`, 25, y + 6);
        doc.text(`SNR: ${res.snr} dB, Impact: ${res.impact}`, 25, y + 12);
        y += 22;
      });
    }

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('Educational Simulation Only. Not intended for clinical diagnosis.', 20, 285);
    
    doc.save('Telecardiology_Simulation_Report.pdf');
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700/50 text-sm">
          <p className="font-semibold text-slate-300 mb-1">{`Time: ${label.toFixed(2)}s`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></span>
              {`${entry.name}: ${entry.value !== null ? entry.value.toFixed(2) + ' mV' : 'Gap'}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const impactColors = {
    'Low': 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    'Moderate': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'High': 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-800 font-sans selection:bg-blue-200">
      
      {/* 1. TOP NAVIGATION / HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md shadow-blue-600/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none text-lg">TeleCardio Lab</h1>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">ECG Transmission Simulation</span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">Research Mode</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. HERO SECTION */}
        <section className="relative overflow-hidden bg-[#0A192F] rounded-2xl p-8 md:p-12 shadow-xl shadow-blue-900/10 flex flex-col items-center text-center">
          {/* Subtle ECG background decor */}
          <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
             <Activity className="w-96 h-96 text-blue-400" strokeWidth={0.5} />
          </div>
          
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
              LIVE SIMULATION
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
              Telecardiology ECG Transmission Lab
            </h2>
            <p className="text-blue-100/80 text-lg md:text-xl font-light">
              Analyze how network and signal impairments affect remote ECG transmission.
            </p>
            <div className="pt-6 flex justify-center flex-wrap gap-4">
              <button onClick={handleGenerateECG} className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2">
                <HeartPulse className="w-4 h-4" /> Generate ECG
              </button>
              <button onClick={handleDownloadReport} className="bg-white hover:bg-slate-50 text-slate-900 font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-white/10 active:scale-95 flex items-center gap-2">
                <Download className="w-4 h-4" /> Download Report (PDF)
              </button>
              <button onClick={handleReset} className="bg-white/10 hover:bg-white/20 text-white font-medium px-6 py-2.5 rounded-xl border border-white/10 transition-all active:scale-95 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reset Simulation
              </button>
            </div>
          </div>
        </section>

        {/* 3. SYSTEM FLOW VISUALIZATION */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
            
            {/* Animated dashed line connecting steps */}
            <div className="hidden md:block absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 -translate-y-1/2 z-0">
               <div className="h-full bg-blue-500/50 w-full animate-pulse"></div>
            </div>

            <div className="group relative z-10 flex flex-col items-center bg-white px-2 cursor-default">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border-2 border-blue-100 group-hover:border-blue-400 group-hover:shadow-md transition-all">
                <Activity className="w-6 h-6" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-700">PATIENT</span>
              <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">Remote ECG acquisition</div>
            </div>

            <ArrowRight className="md:hidden text-slate-300 w-5 h-5"/>

            <div className="group relative z-10 flex flex-col items-center bg-white px-2 cursor-default">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center border-2 border-slate-100 group-hover:border-slate-400 group-hover:shadow-md transition-all">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-700">PROCESSING</span>
              <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">Signal compression</div>
            </div>

            <ArrowRight className="md:hidden text-slate-300 w-5 h-5"/>

            <div className="group relative z-10 flex flex-col items-center bg-white px-2 cursor-default">
              <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-full flex items-center justify-center border-2 border-slate-100 group-hover:border-slate-400 group-hover:shadow-md transition-all">
                <Wifi className="w-6 h-6" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-700">NETWORK</span>
              <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">Signal transmission & delay</div>
            </div>

            <ArrowRight className="md:hidden text-slate-300 w-5 h-5"/>

            <div className="group relative z-10 flex flex-col items-center bg-white px-2 cursor-default">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center border-2 border-teal-100 group-hover:border-teal-400 group-hover:shadow-md transition-all">
                <RadioReceiver className="w-6 h-6" />
              </div>
              <span className="mt-2 text-xs font-bold text-slate-700">CARDIOLOGIST</span>
              <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">Received ECG analysis</div>
            </div>

          </div>
        </section>

        {/* 4. MAIN SIMULATION DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Controls */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <Server className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-lg text-slate-800">Transmission Controls</h3>
              </div>

              <div className="space-y-6">
                {/* Noise */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Signal className="w-4 h-4 text-amber-500"/> Noise Level
                      </label>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Signal disturbance</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-800">{noiseLevel}%</span>
                      <span className={`block text-[10px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 w-max ml-auto ${noiseLevel < 15 ? 'bg-emerald-100 text-emerald-700' : noiseLevel < 35 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {noiseLevel < 15 ? 'Low' : noiseLevel < 35 ? 'Mod' : 'High'}
                      </span>
                    </div>
                  </div>
                  <input type="range" min="0" max="50" value={noiseLevel} onChange={(e) => setNoiseLevel(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-slate-200 transition-colors"/>
                </div>

                {/* Latency */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-blue-500"/> Network Latency
                      </label>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Transmission delay</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-800">{latency} ms</span>
                      <span className={`block text-[10px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 w-max ml-auto ${latency < 200 ? 'bg-emerald-100 text-emerald-700' : latency < 600 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {latency < 200 ? 'Low' : latency < 600 ? 'Mod' : 'High'}
                      </span>
                    </div>
                  </div>
                  <input type="range" min="0" max="1000" step="10" value={latency} onChange={(e) => setLatency(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-slate-200 transition-colors"/>
                </div>

                {/* Compression */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-purple-500"/> Data Compression
                      </label>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Quality reduction</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-800">{compression}%</span>
                      <span className={`block text-[10px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 w-max ml-auto ${compression < 30 ? 'bg-emerald-100 text-emerald-700' : compression < 70 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {compression < 30 ? 'Low' : compression < 70 ? 'Mod' : 'High'}
                      </span>
                    </div>
                  </div>
                  <input type="range" min="0" max="90" value={compression} onChange={(e) => setCompression(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-slate-200 transition-colors"/>
                </div>

                {/* Signal Loss */}
                <div className="group">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500"/> Signal Loss
                      </label>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide">Dropped packets</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-800">{signalLoss}%</span>
                      <span className={`block text-[10px] font-bold uppercase rounded px-1.5 py-0.5 mt-0.5 w-max ml-auto ${signalLoss < 5 ? 'bg-emerald-100 text-emerald-700' : signalLoss < 20 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {signalLoss < 5 ? 'Low' : signalLoss < 20 ? 'Mod' : 'High'}
                      </span>
                    </div>
                  </div>
                  <input type="range" min="0" max="50" value={signalLoss} onChange={(e) => setSignalLoss(Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-slate-200 transition-colors"/>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Overview Metrics */}
          <div className="lg:col-span-7 xl:col-span-8 grid grid-cols-2 gap-4">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg"><Activity className="w-5 h-5"/></div>
                <span className={`px-2 py-1 rounded-md text-xs font-bold border ${impactColors[impactLevel]}`}>{impactLevel} IMPACT</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Signal Quality (SNR)</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">{metrics.snr}</span>
                  <span className="text-sm font-medium text-slate-500">dB</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-500 ${metrics.snr > 20 ? 'bg-emerald-400' : metrics.snr > 10 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{width: `${Math.min(100, Math.max(0, (metrics.snr / 40) * 100))}%`}}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-teal-50 text-teal-600 p-2 rounded-lg"><CheckCircle className="w-5 h-5"/></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mean Squared Error</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">{metrics.mse}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Variance between original & received</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-50 text-purple-600 p-2 rounded-lg"><HardDrive className="w-5 h-5"/></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Data Reduction</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">{metrics.dataReduction}</span>
                  <span className="text-sm font-medium text-slate-500">%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-purple-400 rounded-full transition-all duration-500" style={{width: `${metrics.dataReduction}%`}}></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between group hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-rose-50 text-rose-600 p-2 rounded-lg"><ShieldAlert className="w-5 h-5"/></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Missing Data</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">{metrics.actualSignalLoss}</span>
                  <span className="text-sm font-medium text-slate-500">%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-rose-400 rounded-full transition-all duration-500" style={{width: `${metrics.actualSignalLoss}%`}}></div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 5. ECG VISUALIZATION (Tabs) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 p-4 md:p-6 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                ECG Transmission Analysis
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">PT-001 • 250 Hz • 4s Window</p>
            </div>
            
            <div className="flex bg-slate-200/60 p-1 rounded-xl w-max">
              <button 
                onClick={() => setActiveTab('original')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'original' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Original</button>
              <button 
                onClick={() => setActiveTab('received')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'received' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Received</button>
              <button 
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'comparison' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >Comparison</button>
            </div>
          </div>

          <div className="p-4 md:p-6 bg-[#0B1121] relative">
             {/* Medical Monitor Grid Background */}
             <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
             }}></div>

             <div className="relative z-10 flex flex-col gap-6">
                
                {/* Status Badges */}
                <div className="flex gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#94a3b8]"></span>
                    <span className="text-xs font-semibold text-slate-300">Original Signal</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]"></span>
                    <span className="text-xs font-semibold text-slate-300">Received Signal</span>
                  </div>
                </div>

                {/* Charts */}
                {activeTab === 'comparison' ? (
                   <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                     <div className="h-64 border border-slate-700/50 rounded-xl bg-slate-900/50 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={originalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                            <YAxis domain={[-1.5, 1.5]} stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                            <Line type="linear" dataKey="voltage" stroke="#94a3b8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs font-bold text-slate-400 mt-2">Original ECG</p>
                     </div>
                     <div className="h-64 border border-slate-700/50 rounded-xl bg-slate-900/50 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} hide />
                            <YAxis domain={[-1.5, 1.5]} stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                            <Line type="linear" dataKey="voltage" stroke="#06b6d4" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
                          </LineChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs font-bold text-cyan-400 mt-2">Received ECG</p>
                     </div>
                   </div>
                ) : (
                  <div className="h-80 border border-slate-700/50 rounded-xl bg-slate-900/50 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activeTab === 'original' ? originalData : processedData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} stroke="#64748b" tick={{fontSize: 10}} tickFormatter={(t) => `${t.toFixed(1)}s`} tickLine={false} axisLine={false} dy={10} />
                        <YAxis domain={[-1.5, 1.5]} stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false}/>
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="linear" name={activeTab === 'original' ? "Original Voltage" : "Received Voltage"} dataKey="voltage" stroke={activeTab === 'original' ? "#94a3b8" : "#06b6d4"} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* 9. INSIGHT PANEL */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
           <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mt-1">
             <Info className="w-6 h-6" />
           </div>
           <div>
             <h3 className="text-lg font-bold text-slate-800 mb-2">Simulation Insight</h3>
             <ul className="space-y-2">
                {getDiscussionText().map((text, idx) => (
                   <li key={idx} className="text-sm font-medium text-slate-600 flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span> {text}
                   </li>
                ))}
             </ul>
           </div>
        </div>

        {/* 8. EXPERIMENT MODE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500"/> Automated Experiment
              </h2>
              <p className="text-sm text-slate-500 mt-1">Run predefined transmission conditions and compare ECG quality.</p>
            </div>
            <button 
              onClick={runExperiment} 
              disabled={isExperimentRunning}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
            >
              {isExperimentRunning ? (
                 <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                 <Play className="w-4 h-4 fill-current"/>
              )}
              {isExperimentRunning ? "Running..." : "Run Experiment"}
            </button>
          </div>
          
          {experimentResults.length > 0 ? (
            <div className="space-y-8">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-5 font-bold">Condition</th>
                      <th className="py-4 px-5 font-bold">Noise</th>
                      <th className="py-4 px-5 font-bold">Latency</th>
                      <th className="py-4 px-5 font-bold">Compression</th>
                      <th className="py-4 px-5 font-bold">Loss</th>
                      <th className="py-4 px-5 font-bold">SNR</th>
                      <th className="py-4 px-5 font-bold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {experimentResults.map((res, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5 font-bold text-slate-800 text-sm">{res.name}</td>
                        <td className="py-4 px-5 text-sm text-slate-600 font-medium">{res.noise}%</td>
                        <td className="py-4 px-5 text-sm text-slate-600 font-medium">{res.lat}ms</td>
                        <td className="py-4 px-5 text-sm text-slate-600 font-medium">{res.comp}%</td>
                        <td className="py-4 px-5 text-sm text-slate-600 font-medium">{res.loss}%</td>
                        <td className="py-4 px-5 text-sm font-bold text-slate-700">{res.snr} <span className="text-[10px] text-slate-400 font-normal">dB</span></td>
                        <td className="py-4 px-5 text-right">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${impactColors[res.impact]}`}>
                            {res.impact}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 7. RESULTS & ANALYTICS CHARTS */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                   <Activity className="w-4 h-4 text-blue-500"/> Simulation Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-4">Signal Quality vs Impairment</p>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={experimentResults} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                            <YAxis tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="snr" fill="#3b82f6" radius={[4, 4, 0, 0]} name="SNR (dB)" />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                   
                   <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-4">Data Loss & Reduction</p>
                     <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={experimentResults} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                            <YAxis tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="actualSignalLoss" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Missing Data (%)" />
                            <Bar dataKey="dataReduction" fill="#a855f7" radius={[4, 4, 0, 0]} name="Data Reduction (%)" />
                          </BarChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-400 rounded-full flex items-center justify-center mb-3">
                 <HardDrive className="w-6 h-6"/>
              </div>
              <p className="text-slate-500 font-medium text-sm">No experiment data yet.</p>
              <p className="text-slate-400 text-xs mt-1">Click "Run Experiment" to execute standard evaluation scenarios.</p>
            </div>
          )}
        </div>

      </main>

      {/* 10. EDUCATIONAL DISCLAIMER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <ShieldAlert className="w-6 h-6 text-slate-300 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 mb-1">Research Simulation</h4>
          <p className="text-xs text-slate-500 max-w-2xl font-medium">
            This system is an educational simulation for analyzing ECG transmission quality. It is not intended for clinical diagnosis or medical decision-making. All ECG signals and transmission impairments are synthetically generated for demonstration purposes.
          </p>
        </div>
      </footer>
    </div>
  );
}
