
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Map as MapIcon, Shield, AlertTriangle, Wind, Activity, BrainCircuit, Terminal, Server, Layout, FileText, X, Radio, Bell, CloudRain, CloudFog, EyeOff, Sun, Cpu, BarChart3, RadioReceiver, Zap, Layers, ScanLine, ArrowLeft, Moon, Menu, ChevronDown, ChevronUp, Code, RefreshCw, Compass, MapPin, Users, Volume2, VolumeX, Smartphone, Wifi, WifiOff, Camera, Send, Plus, Loader2, Image as ImageIcon, MessageSquare, Mic, Lock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, BarChart, Bar, ComposedChart, Legend, ReferenceLine } from 'recharts';
import ReactMarkdown from 'react-markdown';

import ThreatMap from './components/ThreatMap';
import LandingPage from './components/LandingPage';
import { GRID_ROWS, GRID_COLS, CELL_SIZE_KM, MAP_CENTER, REFRESH_RATE_MS } from './constants';
import { GridCell, WeatherData, ThreatLevel, Alert, SystemLog, AnalysisResult, Theme, AppView, AgentDecision, Coordinates, FieldReport, ChatMessage } from './types';
import { fetchRealWeather, fetchMobilityData, getTerrainComplexity, getHistoricalRisk } from './services/dataService';
import { calculateRiskScore, classifyThreat, detectAnomaly, calculateWeatherRisk, getWeatherImpactDescription, calculateZScore } from './services/riskEngine';
import { generateStrategicReport, chatWithCommander } from './services/geminiService';
import { analyzeZone } from './services/autonomousAgent';
import { calculateOptimalPath } from './services/routeService';

const HQ_CELL_ID = '0-0'; // Default Headquarters location

const App: React.FC = () => {
  // --- Navigation & Theme State ---
  const [view, setView] = useState<AppView>('LANDING');
  const [theme, setTheme] = useState<Theme>('light'); 
  
  // --- Network & Offline State ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedAlerts, setQueuedAlerts] = useState<Alert[]>([]);
  const [queuedReports, setQueuedReports] = useState<FieldReport[]>([]);

  // --- Dashboard State ---
  const [grid, setGrid] = useState<GridCell[]>([]);
  const gridRef = useRef<GridCell[]>([]); 

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [agentStream, setAgentStream] = useState<AgentDecision[]>([]);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'AGENT'>('AGENT');
  const [patrolRoute, setPatrolRoute] = useState<Coordinates[]>([]);

  // --- Field Reporting State ---
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [reportImpacts, setReportImpacts] = useState<Record<string, number>>({});
  const [reportPhoto, setReportPhoto] = useState<File | null>(null);

  // --- AI Commander Assistant State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
      { id: 'init', sender: 'AI', text: 'COMMAND AI ONLINE. READY FOR INSTRUCTIONS.', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tick, setTick] = useState(0);
  const [viewMode, setViewMode] = useState<'THREAT' | 'ANOMALY' | 'MOBILITY'>('THREAT');
  
  // Tactical Mode State (Audio/Vibration)
  const [tacticalMode, setTacticalMode] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Toast Notification State
  const [activeToast, setActiveToast] = useState<Alert | null>(null);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);

  // --- Theme Toggle Effect ---
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // --- Offline / Online Listeners ---
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        addLog('DATA_LAYER', 'CONNECTION RESTORED. UPLINK ACTIVE.');
    };
    const handleOffline = () => {
        setIsOnline(false);
        addLog('DATA_LAYER', 'CONNECTION LOST. OFFLINE PROTOCOLS ENGAGED.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Chat Auto Scroll ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatOpen]);

  // --- Sync Logic when Online ---
  useEffect(() => {
    if (isOnline) {
        let syncMsg = '';
        if (queuedAlerts.length > 0) syncMsg += `${queuedAlerts.length} ALERTS `;
        if (queuedReports.length > 0) syncMsg += `${queuedReports.length} REPORTS `;

        if (syncMsg) {
            setSmsStatus(`SYNCING: ${syncMsg}...`);
            setTimeout(() => {
                setSmsStatus('SYNC COMPLETE - INTEL UPLOADED');
                setTimeout(() => setSmsStatus(null), 2000);
                
                if (queuedReports.length > 0) {
                     const newImpacts = { ...reportImpacts };
                     queuedReports.forEach(r => {
                         newImpacts[r.cellId] = (newImpacts[r.cellId] || 0) + 40;
                     });
                     setReportImpacts(newImpacts);
                }

                setQueuedAlerts([]);
                setQueuedReports([]);
                addLog('DATA_LAYER', `DATA SYNCED: ${syncMsg}`);
            }, 2500);
        }
    }
  }, [isOnline, queuedAlerts.length, queuedReports.length]);

  // --- Initialization (Load Cache) ---
  useEffect(() => {
      const cachedWeather = localStorage.getItem('siliguri_weather');
      if (cachedWeather) {
          try {
              const parsed = JSON.parse(cachedWeather);
              setWeather(parsed);
              if (!navigator.onLine) addLog('DATA_LAYER', 'LOADED CACHED WEATHER DATA (OFFLINE MODE).');
          } catch(e) { console.error('Cache load error', e); }
      }

      const cachedGrid = localStorage.getItem('siliguri_grid');
      if (cachedGrid) {
          try {
              const parsed = JSON.parse(cachedGrid);
              setGrid(parsed);
              gridRef.current = parsed;
              if (!navigator.onLine) addLog('DATA_LAYER', 'RESTORED LAST KNOWN RISK MAP (OFFLINE MODE).');
          } catch(e) { console.error('Grid cache load error', e); }
      }
  }, []);

  // --- Tactical Mode Logic ---
  const playAlertSound = useCallback((intensity: 'high' | 'low') => {
    if (!audioCtxRef.current) return;
    try {
        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (intensity === 'high') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
  }, []);

  // --- AI Voice Broadcast Logic ---
  const triggerVoiceCommand = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1; 
    utterance.pitch = 0.9; 
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.speak(utterance);
    addLog('COMMAND_AI', `VOICE BROADCAST: "${text}"`);
    const alert: Alert = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        cellId: 'ALL',
        level: ThreatLevel.CRITICAL,
        message: text,
        type: 'VOICE_COMMAND'
    };
    setActiveToast(alert);
    setTimeout(() => setActiveToast(null), 8000);
  }, []);

  const toggleTacticalMode = () => {
    if (!tacticalMode) {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      playAlertSound('low');
      if (navigator.vibrate) navigator.vibrate(50);
      addLog('DATA_LAYER', 'TACTICAL MODE ENABLED: AUDIO & HAPTICS ACTIVE');
    } else {
      addLog('DATA_LAYER', 'TACTICAL MODE DISABLED');
    }
    setTacticalMode(!tacticalMode);
  };

  // --- Report Submission Logic ---
  const handleSubmitReport = (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const type = (form.elements.namedItem('reportType') as HTMLSelectElement).value;
      const notes = (form.elements.namedItem('reportNotes') as HTMLTextAreaElement).value;
      const location = selectedCell ? selectedCell.center : MAP_CENTER;
      const targetCellId = selectedCell ? selectedCell.id : HQ_CELL_ID;

      const newReport: FieldReport = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          cellId: targetCellId,
          coordinates: location,
          type: type as any,
          notes: notes,
          image: reportPhoto ? 'image_blob_ref' : undefined
      };

      if (isOnline) {
          setReportImpacts(prev => ({
              ...prev,
              [targetCellId]: (prev[targetCellId] || 0) + 40 
          }));
          addLog('FIELD_OPS', `REPORT RECEIVED: ${type} AT SECTOR ${targetCellId}`);
          setSmsStatus('REPORT SENT: INTEL UPDATED');
          setTimeout(() => setSmsStatus(null), 3000);
      } else {
          setQueuedReports(prev => [...prev, newReport]);
          setSmsStatus('OFFLINE: REPORT SAVED TO OUTBOX');
          setTimeout(() => setSmsStatus(null), 3000);
      }
      setReportModalOpen(false);
      setReportPhoto(null);
  };

  // --- Commander Chat Logic ---
  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatProcessing || !weather) return;

      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'USER',
          text: chatInput,
          timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, userMsg]);
      setChatInput('');
      setIsChatProcessing(true);

      const responseText = await chatWithCommander(userMsg.text, grid, weather, alerts);
      const broadcastMatch = responseText.match(/\[BROADCAST:\s*(.*?)\]/i);
      let displayResponse = responseText;

      if (broadcastMatch && broadcastMatch[1]) {
          const broadcastMsg = broadcastMatch[1];
          triggerVoiceCommand(broadcastMsg);
          displayResponse = responseText.replace(broadcastMatch[0], `\n\n**📢 BROADCASTING:** _"${broadcastMsg}"_`);
      }

      const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'AI',
          text: displayResponse,
          timestamp: Date.now()
      };
      setChatHistory(prev => [...prev, aiMsg]);
      setIsChatProcessing(false);
  };

  // --- Main Simulation Loop ---
  useEffect(() => {
    const getWeather = async () => {
        if (navigator.onLine) {
            try {
                const data = await fetchRealWeather(MAP_CENTER);
                setWeather(data);
                localStorage.setItem('siliguri_weather', JSON.stringify(data));
                addLog('DATA_LAYER', `WEATHER UPDATED: ${data.temperature}°C, VIS: ${data.visibility}m`);
            } catch (e) {
                console.warn("Weather fetch failed");
            }
        }
    };
    getWeather();
  }, [isOnline]); 

  useEffect(() => {
    if (!weather) return;
    setReportImpacts(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(key => {
            if (next[key] > 0) {
                next[key] -= 1; 
                changed = true;
            } else {
                delete next[key];
                changed = true;
            }
        });
        return changed ? next : prev;
    });

    const generateGrid = () => {
      const newGrid: GridCell[] = [];
      const cellLatSize = 0.02; 
      const cellLngSize = 0.02;
      const startLat = MAP_CENTER.lat - (GRID_ROWS * cellLatSize) / 2;
      const startLng = MAP_CENTER.lng - (GRID_COLS * cellLngSize) / 2;
      const newDecisions: AgentDecision[] = [];
      const prevGridMap = new Map<string, GridCell>();
      gridRef.current.forEach(c => prevGridMap.set(c.id, c));

      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const id = `${r}-${c}`;
          const lat = startLat + r * cellLatSize;
          const lng = startLng + c * cellLngSize;
          
          const mobility = fetchMobilityData(id, tick, weather.isDay, weather.visibility);
          const terrain = getTerrainComplexity(lat, lng);
          const history = getHistoricalRisk(id);
          const activeReportImpact = reportImpacts[id] || 0; 
          
          const prevCell = prevGridMap.get(id);
          const prevMobility = prevCell ? prevCell.mobilityDensity : mobility;
          const mobilityDelta = Math.abs(mobility - prevMobility);

          const baseline = Math.max(10, history * 1.2); 
          const zScore = calculateZScore(mobility, baseline);
          const isAnomaly = detectAnomaly(zScore);

          const decision = analyzeZone({
            id, weather, mobility, mobilityBaseline: baseline, mobilityDelta, terrain, history
          });

          if (decision.alert) newDecisions.push(decision);
          const weatherRisk = calculateWeatherRisk(weather);
          
          newGrid.push({
            id,
            bounds: [
              { lat, lng }, 
              { lat: lat + cellLatSize, lng: lng + cellLngSize }
            ],
            center: { lat: lat + cellLatSize/2, lng: lng + cellLngSize/2 },
            weatherRisk: weatherRisk,
            terrainComplexity: terrain,
            mobilityDensity: mobility,
            historicalActivity: history,
            reportImpact: activeReportImpact,
            mobilityBaseline: baseline,
            zScore: zScore,
            riskScore: calculateRiskScore(weather, mobility, terrain, history, activeReportImpact),
            threatLevel: decision.risk_level.toUpperCase() as ThreatLevel, 
            lastUpdated: Date.now(),
            anomalyDetected: isAnomaly,
            riskFactors: activeReportImpact > 0 ? [...decision.factors, "VERIFIED FIELD REPORT"] : decision.factors,
            monitorNext: decision.monitor_next 
          });

          if (decision.alert) {
             const isCritical = decision.risk_level === 'Critical';
             const isHigh = decision.risk_level === 'High';
             let alertMessage = "";
             if (decision.factors.includes("Border Patch Movement")) {
                 alertMessage = `SUSPICIOUS MOVEMENT DETECTED AT ZONE ${id}. RISK SCORE: ${decision.risk_score}.`;
             } else {
                 alertMessage = `HIGH RISK THRESHOLD BREACHED (RISK: ${decision.risk_score})`;
             }

             const alertObj: Alert = {
               id: Date.now().toString() + id,
               timestamp: Date.now(),
               cellId: id,
               level: decision.risk_level.toUpperCase() as ThreatLevel,
               message: alertMessage,
               type: isAnomaly ? 'MOBILITY_ANOMALY' : 'INFILTRATION_PREDICTION'
             };
             handleNewAlert(alertObj);
             if (isCritical || isHigh) addLog('AUTONOMOUS_AGENT', `DECISION: ${alertMessage}`);
          }
        }
      }
      
      setGrid(newGrid);
      gridRef.current = newGrid;
      localStorage.setItem('siliguri_grid', JSON.stringify(newGrid));
      setAgentStream(prev => [...newDecisions, ...prev].slice(0, 50));

      if (selectedCell) {
        const updated = newGrid.find(c => c.id === selectedCell.id);
        if (updated) setSelectedCell(updated);
      }
    };
    generateGrid();
    const timer = setTimeout(() => {
        setTick(t => t + 1);
    }, REFRESH_RATE_MS);
    return () => clearTimeout(timer);
  }, [weather, selectedCell?.id, tick, tacticalMode, isOnline, reportImpacts]); 

  // --- Helpers ---
  const addLog = (component: SystemLog['component'], message: string) => {
    setLogs(prev => [{ id: Date.now().toString(), timestamp: Date.now(), component, message }, ...prev].slice(0, 50));
  };

  const handleNewAlert = (alert: Alert) => {
    setAlerts(prev => {
      const exists = prev.find(a => a.cellId === alert.cellId && a.type === alert.type && Date.now() - a.timestamp < 10000);
      if (exists) return prev;
      if (alert.level === ThreatLevel.CRITICAL || alert.level === ThreatLevel.HIGH || alert.message.includes("Suspicious") || alert.message.includes("Rapid")) {
        setActiveToast(alert);
        setTimeout(() => setActiveToast(null), 5000);
        if (tacticalMode) {
             const isCritical = alert.level === ThreatLevel.CRITICAL || alert.type === 'MOBILITY_ANOMALY';
             if (navigator.vibrate) navigator.vibrate(isCritical ? [300, 100, 300, 100, 300] : [200]);
             if (audioCtxRef.current) playAlertSound(isCritical ? 'high' : 'low');
        }
        if (alert.level === ThreatLevel.CRITICAL) {
           if (isOnline) {
             setSmsStatus(`SECURE COMM: "CHECK SECTOR ${alert.cellId}"`);
             setTimeout(() => setSmsStatus(null), 3000);
           } else {
             setQueuedAlerts(q => [...q, alert]);
             setSmsStatus(`OFFLINE: ALERT QUEUED FOR SYNC`);
             setTimeout(() => setSmsStatus(null), 3000);
           }
        }
      }
      return [alert, ...prev].slice(0, 50);
    });
  };

  const handleCellSelect = (cell: GridCell) => {
    setSelectedCell(cell);
    setAnalysis(null); 
    setPatrolRoute([]); 
    if (window.innerWidth < 1024) {
      document.getElementById('dashboard-panel')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const calculateRoute = () => {
    if (!selectedCell) return;
    addLog('AI_ANALYSIS', `CALCULATING TACTICAL ROUTE: HQ (${HQ_CELL_ID}) -> SECTOR ${selectedCell.id}...`);
    const route = calculateOptimalPath(grid, HQ_CELL_ID, selectedCell.id, weather);
    setPatrolRoute(route);
    if (route.length > 0) addLog('AI_ANALYSIS', `ROUTE GENERATED: ${route.length} WAYPOINTS. AVOIDING HIGH-RISK ZONES.`);
    else addLog('AI_ANALYSIS', `ROUTE GENERATION FAILED. NO SAFE PATH.`);
  };

  const runAnalysis = async () => {
    if (!selectedCell || !weather) return;
    if (!isOnline && !process.env.API_KEY) { 
        addLog('AI_ANALYSIS', 'OFFLINE: GENERATING HEURISTIC REPORT.');
        setAnalysis({ 
            markdown: `## OFFLINE TACTICAL REPORT\n\n**WARNING**: CLOUD CONNECTIVITY LOST. LOCAL HEURISTICS ONLY.\n\n**SECTOR ${selectedCell.id} STATUS**:\n- THREAT LEVEL: **${selectedCell.threatLevel}**\n- RISK SCORE: ${selectedCell.riskScore}\n- MOBILITY DENSITY: ${selectedCell.mobilityDensity.toFixed(1)}%\n\n**LOCAL RECOMMENDATION**:\nMAINTAIN VIGILANCE. FOLLOW STANDARD OFFLINE PROTOCOLS.`, 
            timestamp: Date.now() 
        });
        return;
    }
    setIsAnalyzing(true);
    addLog('AI_ANALYSIS', `INITIATING STRATEGIC ASSESSMENT: SECTOR ${selectedCell.id}...`);
    try {
      const markdown = await generateStrategicReport(selectedCell, weather);
      setAnalysis({ markdown, timestamp: Date.now() });
      addLog('AI_ANALYSIS', 'REPORT GENERATED SUCCESSFULLY.');
    } catch (e) {
      addLog('AI_ANALYSIS', 'REPORT GENERATION FAILED.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Charts Logic ---
  const riskTrendData = selectedCell ? (() => {
      const baseRisk = selectedCell.riskScore;
      const wRiskContribution = selectedCell.weatherRisk * 0.25; 
      return Array.from({length: 6}).map((_, i) => {
          const t = 5 - i;
          const label = t === 0 ? 'NOW' : `T-${t}`;
          const noise = Math.random() * 10 - 5;
          const trendWeather = wRiskContribution + (Math.random() * 4 - 2);
          const trendTotal = Math.max(trendWeather, baseRisk + noise);
          return {
              time: label,
              totalRisk: Math.round(trendTotal),
              weatherImpact: Math.round(trendWeather)
          };
      });
  })() : [];

  const fusionData = selectedCell ? [
    { name: 'Weather', val: selectedCell.weatherRisk * 0.25, full: 25, fill: '#38bdf8' },
    { name: 'Mobility', val: selectedCell.mobilityDensity * 0.30, full: 30, fill: '#60a5fa' },
    { name: 'Terrain', val: selectedCell.terrainComplexity * 0.20, full: 20, fill: '#c084fc' },
    { name: 'Reports', val: selectedCell.reportImpact, full: 50, fill: '#ef4444' }, 
  ] : [];

  const logListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logListRef.current) logListRef.current.scrollTop = 0;
  }, [logs, agentStream, activeTab]);

  if (view === 'LANDING') {
      return (
        <LandingPage 
            onNavigate={(mode) => {
                setView('DASHBOARD');
                setViewMode(mode === 'MOBILITY' ? 'MOBILITY' : mode); 
            }} 
            theme={theme}
            toggleTheme={toggleTheme}
        />
      );
  }

  // Dashboard View - MILITARY THEME APPLIED
  return (
    <div className={`flex flex-col lg:flex-row h-screen w-full font-sans overflow-hidden transition-colors duration-500 ${
        theme === 'dark' 
        ? 'bg-army-950 text-army-50' 
        : 'bg-army-50 text-army-900'
    }`}>
      
      {/* Report Modal - Boxy Military Style */}
      {isReportModalOpen && (
          <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`w-full max-w-md border-2 shadow-2xl p-0 ${
                  theme === 'dark' ? 'bg-army-900 border-army-600' : 'bg-white border-army-700'
              }`}>
                  <div className={`p-4 flex justify-between items-center border-b ${theme === 'dark' ? 'bg-army-950 border-army-700' : 'bg-army-100 border-army-300'}`}>
                      <h3 className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
                          <Camera className="text-red-600" /> 
                          Field Intel Report
                      </h3>
                      <button onClick={() => setReportModalOpen(false)} className="hover:text-red-500">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleSubmitReport} className="p-6 space-y-5">
                      <div>
                          <label className="text-xs font-bold uppercase tracking-widest mb-1 block opacity-70">Risk Category</label>
                          <select name="reportType" className={`w-full p-3 border rounded-none outline-none focus:ring-1 focus:ring-army-500 ${
                              theme === 'dark' ? 'bg-army-950 border-army-600' : 'bg-white border-army-400'
                          }`}>
                              <option value="SUSPICIOUS_ACTIVITY">SUSPICIOUS ACTIVITY</option>
                              <option value="INFILTRATION_SIGNS">INFILTRATION SIGNS</option>
                              <option value="GEAR_FOUND">ABANDONED GEAR</option>
                              <option value="OTHER">OTHER ANOMALY</option>
                          </select>
                      </div>

                      <div>
                          <label className="text-xs font-bold uppercase tracking-widest mb-1 block opacity-70">Sector</label>
                          <div className={`w-full p-3 border rounded-none flex items-center gap-3 ${
                              theme === 'dark' ? 'bg-army-950 border-army-600' : 'bg-gray-100 border-army-400'
                          }`}>
                              <MapPin size={18} />
                              <span className="font-mono text-sm font-bold">
                                  {selectedCell ? `SECTOR ${selectedCell.id}` : `HQ VICINITY (GPS)`}
                              </span>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold uppercase tracking-widest mb-1 block opacity-70">Evidence</label>
                          <div className={`border-2 border-dashed rounded-none p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                              theme === 'dark' 
                              ? (reportPhoto ? 'border-army-400 bg-army-800' : 'border-army-700 hover:bg-army-800') 
                              : (reportPhoto ? 'border-army-600 bg-army-100' : 'border-army-300 hover:bg-army-50')
                          }`}>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                id="photo-upload"
                                onChange={(e) => setReportPhoto(e.target.files?.[0] || null)}
                              />
                              <label htmlFor="photo-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                  <Camera className="opacity-50 mb-2" size={24} />
                                  <span className="text-xs font-bold opacity-70 uppercase">{reportPhoto ? reportPhoto.name : "Capture / Upload"}</span>
                              </label>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold uppercase tracking-widest mb-1 block opacity-70">Details</label>
                          <textarea 
                             name="reportNotes"
                             rows={3}
                             placeholder="ENTER OBSERVATIONS..."
                             className={`w-full p-3 border rounded-none outline-none focus:ring-1 focus:ring-army-500 font-mono text-sm ${
                                theme === 'dark' ? 'bg-army-950 border-army-600' : 'bg-white border-army-400'
                             }`}
                          ></textarea>
                      </div>

                      <button type="submit" className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-none flex items-center justify-center gap-2 uppercase tracking-wider shadow-sharp">
                          <Send size={18} /> Transmit Report
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* FABs - Square and Functional */}
      <div className="fixed bottom-6 lg:bottom-10 right-6 lg:right-10 z-[500] flex flex-col gap-4 items-end">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-14 h-14 bg-army-700 hover:bg-army-600 text-gov-gold border-2 border-gov-gold shadow-sharp-lg flex items-center justify-center transition-all`}
            title="Command AI"
            disabled={!isOnline}
          >
              <MessageSquare size={24} />
          </button>

          <button 
            onClick={() => setReportModalOpen(true)}
            className="w-16 h-16 bg-red-700 hover:bg-red-600 text-white border-2 border-red-900 shadow-sharp-lg flex items-center justify-center transition-all group"
            title="Quick Report"
          >
              <Plus size={36} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
      </div>

      {/* Chat Widget - Terminal Style */}
      {isChatOpen && (
          <div className={`fixed bottom-24 right-6 lg:right-32 w-[90%] max-w-[400px] z-[550] border-2 shadow-2xl flex flex-col animate-slide-up h-[450px] ${
             theme === 'dark' ? 'bg-black border-gov-gold' : 'bg-white border-army-700'
          }`}>
              <div className={`p-3 border-b-2 flex items-center justify-between ${
                  theme === 'dark' ? 'bg-army-900 border-gov-gold text-gov-gold' : 'bg-army-800 border-army-700 text-white'
              }`}>
                  <div className="flex items-center gap-2">
                      <BrainCircuit size={18} />
                      <span className="text-sm font-bold uppercase tracking-wider">Secure Command Uplink</span>
                  </div>
                  <button onClick={() => setIsChatOpen(false)}><X size={18}/></button>
              </div>

              <div className={`flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm ${
                  theme === 'dark' ? 'bg-black text-green-500' : 'bg-gray-100 text-army-900'
              }`}>
                  {chatHistory.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[90%] p-3 border ${
                              msg.sender === 'USER' 
                              ? (theme === 'dark' ? 'bg-army-900 border-army-700 text-white' : 'bg-white border-army-400 text-black shadow-sharp')
                              : (theme === 'dark' ? 'bg-transparent border-green-900 text-green-400' : 'bg-army-100 border-army-300 text-army-900')
                          }`}>
                              <span className="block text-[10px] opacity-50 mb-1">{msg.sender === 'USER' ? 'COMMANDER' : 'AI_CORE'} // {new Date(msg.timestamp).toLocaleTimeString()}</span>
                              {msg.sender === 'AI' ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
                          </div>
                      </div>
                  ))}
                  {isChatProcessing && <Loader2 size={20} className="animate-spin opacity-50" />}
                  <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className={`p-3 border-t-2 flex gap-2 ${
                  theme === 'dark' ? 'bg-army-900 border-gov-gold' : 'bg-gray-200 border-army-700'
              }`}>
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="ENTER COMMAND..."
                    className={`flex-1 text-sm px-3 py-2 border rounded-none outline-none focus:ring-1 focus:ring-gov-gold font-mono ${
                        theme === 'dark' ? 'bg-black border-army-600 text-white' : 'bg-white border-army-400 text-black'
                    }`}
                  />
                  <button type="submit" disabled={isChatProcessing || !chatInput.trim()} className="px-4 bg-gov-gold hover:bg-yellow-600 text-black font-bold text-sm uppercase">
                      SEND
                  </button>
              </form>
          </div>
      )}

      {/* Toast Alert - Military Banner */}
      {activeToast && (
        <div className="absolute top-4 lg:top-20 left-1/2 -translate-x-1/2 z-[1000] animate-fade-in-down w-[95%] lg:w-auto max-w-xl">
          <div className={`p-4 border-l-8 flex items-center gap-4 shadow-2xl ${
            activeToast.level === ThreatLevel.CRITICAL || activeToast.type === 'VOICE_COMMAND'
            ? 'bg-red-800 text-white border-red-950' 
            : 'bg-amber-600 text-black border-amber-800'
          }`}>
            <div className="p-2 bg-black/20 rounded-none shrink-0">
                {activeToast.type === 'VOICE_COMMAND' ? <Mic size={28}/> : <AlertTriangle className="animate-pulse w-7 h-7" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold uppercase tracking-widest text-xs opacity-90">{
                  activeToast.type === 'VOICE_COMMAND' ? 'PRIORITY BROADCAST' : 
                  activeToast.type === 'MOBILITY_ANOMALY' ? 'ANOMALY ALERT' : `${activeToast.level} THREAT DETECTED`
              }</div>
              <div className="text-lg font-bold font-mono leading-tight truncate">{activeToast.message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Header - Government Style */}
      <div className="flex-1 flex flex-col h-[40vh] lg:h-full relative">
        <header className={`h-16 shrink-0 border-b-4 flex items-center justify-between px-4 lg:px-6 relative z-[500] ${
            theme === 'dark' ? 'bg-army-950 border-gov-gold' : 'bg-army-800 border-gov-orange'
        }`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setView('LANDING')} className="text-white hover:text-gov-gold transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
               <h1 className="text-xs font-bold text-gray-300 tracking-widest uppercase">Government of India</h1>
               <div className="flex items-center gap-2">
                   <Shield className="w-5 h-5 text-gov-gold" />
                   <span className="text-lg font-bold text-white tracking-wide font-sans">MINISTRY OF DEFENCE <span className="text-gov-orange">|</span> SILIGURI SECTOR</span>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Status Badge */}
             <div className={`hidden md:flex items-center gap-2 px-3 py-1 border text-[10px] font-bold uppercase tracking-wider ${
                 isOnline 
                 ? 'bg-green-900/50 text-green-400 border-green-700'
                 : 'bg-red-900/50 text-red-400 border-red-700'
             }`}>
                 {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                 {isOnline ? 'SYSTEM ONLINE' : 'OFFLINE MODE'}
             </div>

             {/* Mode Switcher */}
             <div className="hidden sm:flex border border-white/20">
                {['THREAT', 'ANOMALY', 'MOBILITY'].map((m) => (
                    <button 
                      key={m}
                      onClick={() => setViewMode(m as any)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${
                        viewMode === m 
                        ? 'bg-gov-gold text-black' 
                        : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {m}
                    </button>
                ))}
             </div>

             <button 
                onClick={toggleTacticalMode}
                className={`p-2 border transition-all ${
                    tacticalMode 
                    ? 'bg-red-900 border-red-500 text-white animate-pulse'
                    : 'bg-transparent border-white/20 text-gray-400 hover:text-white'
                }`}
             >
                {tacticalMode ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>

             <button 
               onClick={toggleTheme}
               className="p-2 text-gov-gold hover:text-white"
             >
               {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </header>

        {/* Map Container */}
        <div className="flex-1 relative z-0">
          <ThreatMap 
            grid={grid} 
            onCellSelect={handleCellSelect} 
            selectedCellId={selectedCell?.id}
            viewMode={viewMode}
            theme={theme}
            patrolRoute={patrolRoute} 
          />
        </div>
      </div>

      {/* Right Panel - Dashboard */}
      <div id="dashboard-panel" className={`flex-shrink-0 w-full lg:w-[450px] flex flex-col border-t-4 lg:border-t-0 lg:border-l-4 relative z-10 transition-colors duration-300 overflow-y-auto ${
          theme === 'dark' 
          ? 'bg-army-950 border-army-800' 
          : 'bg-army-50 border-army-300'
      } h-[60vh] lg:h-full`}>
        
        {/* Dashboard Header */}
        <div className={`p-4 border-b flex items-center justify-between sticky top-0 z-20 ${
            theme === 'dark' ? 'bg-army-900 border-army-700' : 'bg-army-200 border-army-300'
        }`}>
            <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-army-900 dark:text-army-100">
                <Layout size={16} className="text-gov-gold"/> 
                Tactical Analysis
            </h2>
            <div className="flex items-center gap-2">
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-black/10 border border-black/20 text-xs font-mono font-bold">
                     {weather && (
                        <>
                            {weather.visibility < 3000 ? <CloudFog size={14}/> : <Sun size={14}/>}
                            <span>VIS: {weather.visibility/1000}KM</span>
                        </>
                     )}
                 </div>
            </div>
        </div>
        
        <div className="p-4 lg:p-6 space-y-6">
            
            {/* 1. Selected Sector Overview */}
            {selectedCell ? (
                <div className={`p-5 border-2 ${
                    theme === 'dark' 
                    ? 'bg-army-900 border-army-700' 
                    : 'bg-white border-army-300 shadow-sm'
                }`}>
                    <div className="flex justify-between items-start mb-4 border-b border-dashed border-gray-500 pb-2">
                        <div>
                            <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Target Sector</div>
                            <div className="text-2xl font-black font-mono tracking-tight flex items-baseline gap-2">
                                {selectedCell.id}
                                <span className={`text-xs px-2 py-0.5 font-bold -translate-y-1 ${
                                    selectedCell.threatLevel === ThreatLevel.CRITICAL ? 'bg-red-700 text-white' :
                                    selectedCell.threatLevel === ThreatLevel.HIGH ? 'bg-orange-600 text-white' :
                                    selectedCell.threatLevel === ThreatLevel.MEDIUM ? 'bg-amber-500 text-black' :
                                    'bg-green-700 text-white'
                                }`}>{selectedCell.threatLevel}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] uppercase tracking-wider opacity-60 mb-1">Risk Score</div>
                             <div className={`text-3xl font-mono font-bold ${
                                 selectedCell.riskScore > 80 ? 'text-red-600' : 'text-army-600 dark:text-army-400'
                             }`}>{selectedCell.riskScore}</div>
                        </div>
                    </div>

                    {/* Threat Fusion Breakdown */}
                    <div className="space-y-3 mb-4">
                        {fusionData.map((item) => (
                           <div key={item.name} className="flex items-center gap-3 text-xs uppercase font-bold">
                               <div className="w-16 opacity-70">{item.name}</div>
                               <div className="flex-1 h-3 bg-gray-300 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 relative">
                                   <div className="h-full" 
                                        style={{ width: `${(item.val / item.full) * 100}%`, backgroundColor: item.fill }}></div>
                               </div>
                               <div className="w-8 text-right font-mono opacity-80">{Math.round(item.val)}</div>
                           </div>
                        ))}
                    </div>

                    {/* AI Agent Factors */}
                    {selectedCell.riskFactors && selectedCell.riskFactors.length > 0 && (
                        <div className={`text-[10px] p-3 mb-4 border-l-4 ${
                            theme === 'dark' ? 'bg-black/30 border-gov-gold text-gray-300' : 'bg-gray-50 border-army-600 text-gray-700'
                        }`}>
                            <strong className="block mb-1.5 opacity-80 uppercase tracking-wider">Detected Risk Factors:</strong>
                            <ul className="list-square pl-4 space-y-0.5">
                                {selectedCell.riskFactors.map((f, i) => (
                                    <li key={i}>{f}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-4">
                       <button 
                         onClick={runAnalysis}
                         disabled={isAnalyzing}
                         className={`py-3 px-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                             theme === 'dark'
                             ? 'bg-army-800 hover:bg-army-700 border-army-600 text-gov-gold'
                             : 'bg-army-700 hover:bg-army-800 border-army-900 text-white'
                         }`}
                       >
                           {isAnalyzing ? <Activity className="animate-spin" size={14}/> : <BrainCircuit size={14}/>}
                           Req. AI Intel
                       </button>

                       <button 
                         onClick={calculateRoute}
                         className={`py-3 px-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider border transition-all ${
                             theme === 'dark'
                             ? 'bg-green-900 hover:bg-green-800 border-green-700 text-white'
                             : 'bg-green-700 hover:bg-green-800 border-green-900 text-white'
                         }`}
                       >
                           <Compass size={14}/>
                           Route Plan
                       </button>
                    </div>
                </div>
            ) : (
                <div className={`p-8 border-2 border-dashed flex flex-col items-center justify-center text-center gap-3 opacity-50 ${
                    theme === 'dark' ? 'border-army-700 text-army-500' : 'border-army-300 text-army-400'
                }`}>
                    <ScanLine size={48}/>
                    <p className="text-sm font-bold uppercase">Awaiting Sector Selection</p>
                </div>
            )}

            {/* 2. Charts Section */}
            {selectedCell && (
                <div className={`p-5 border-2 ${
                    theme === 'dark' ? 'bg-army-900 border-army-700' : 'bg-white border-army-300 shadow-sm'
                }`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-4 flex items-center gap-2">
                        <BarChart3 size={14}/> Trend Analysis
                    </h3>
                    <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={riskTrendData}>
                                <defs>
                                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#e2e8f0'} />
                                <XAxis dataKey="time" tick={{fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b'}} axisLine={false} tickLine={false} />
                                <YAxis hide domain={[0, 100]} />
                                <Area type="monotone" dataKey="totalRisk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
                                <Line type="monotone" dataKey="weatherImpact" stroke="#38bdf8" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* 3. AI Analysis Report */}
            {analysis && (
                <div className={`border-2 ${
                    theme === 'dark' ? 'bg-army-950 border-gov-gold' : 'bg-white border-army-600'
                }`}>
                    <div className={`px-4 py-2 border-b flex items-center justify-between ${
                        theme === 'dark' ? 'bg-army-900 border-gov-gold text-gov-gold' : 'bg-army-100 border-army-600 text-army-900'
                    }`}>
                        <div className="flex items-center gap-2">
                             <Lock size={14} />
                             <span className="text-xs font-bold uppercase tracking-wider">Strategic Assessment</span>
                        </div>
                        <span className="text-[10px] font-mono">
                            {new Date(analysis.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <div className={`p-4 text-xs leading-relaxed font-mono ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
                    }`}>
                        <ReactMarkdown>{analysis.markdown}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* 4. Live Log Terminal & Agent Stream */}
            <div className={`mt-auto border-2 flex flex-col h-72 ${
                theme === 'dark' ? 'bg-black border-army-700' : 'bg-gray-50 border-army-300'
            }`}>
                 <div className={`px-2 py-0 border-b flex items-center justify-between ${
                     theme === 'dark' ? 'border-army-700' : 'border-army-300'
                 }`}>
                     <div className="flex">
                        <button 
                            onClick={() => setActiveTab('AGENT')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-r ${
                                activeTab === 'AGENT' 
                                ? (theme === 'dark' ? 'bg-army-900 text-gov-gold' : 'bg-white text-army-900')
                                : 'text-gray-500 hover:text-gray-400'
                            }`}
                        >
                            <Cpu size={12} className="inline mr-1" /> Live Agent
                        </button>
                        <button 
                            onClick={() => setActiveTab('LOGS')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-r ${
                                activeTab === 'LOGS' 
                                ? (theme === 'dark' ? 'bg-army-900 text-gray-200' : 'bg-white text-army-900')
                                : 'text-gray-500 hover:text-gray-400'
                            }`}
                        >
                            <Terminal size={12} className="inline mr-1" /> System Logs
                        </button>
                     </div>
                 </div>
                 
                 <div ref={logListRef} className="p-0 overflow-y-auto font-mono text-[10px] flex-1">
                     {activeTab === 'LOGS' ? (
                         <div className="p-3 space-y-1">
                             {logs.map(log => (
                                 <div key={log.id} className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity border-b border-dashed border-gray-700/30 pb-1">
                                     <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                                     <span className={`${
                                         log.component === 'RISK_ENGINE' ? 'text-amber-600' :
                                         log.component === 'AI_ANALYSIS' ? 'text-blue-500' :
                                         log.component === 'ANOMALY_DETECTOR' ? 'text-cyan-600' :
                                         log.component === 'AUTONOMOUS_AGENT' ? 'text-green-600' :
                                         log.component === 'FIELD_OPS' ? 'text-red-600' :
                                         log.component === 'COMMAND_AI' ? 'text-purple-500' :
                                         'text-gray-500'
                                     } font-bold uppercase`}>{log.component}:</span>
                                     <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}>{log.message}</span>
                                 </div>
                             ))}
                         </div>
                     ) : (
                         <div className="p-3 space-y-2">
                             {agentStream.length > 0 ? agentStream.map((d, i) => (
                                <div key={d.timestamp + d.zone_id + i} className={`p-2 border-l-2 font-mono text-[10px] ${
                                    theme === 'dark' 
                                    ? (d.alert ? 'bg-red-900/20 border-red-500 text-red-200' : 'bg-army-900/30 border-army-600 text-army-200') 
                                    : (d.alert ? 'bg-red-50 border-red-500 text-red-900' : 'bg-gray-50 border-army-400 text-gray-800')
                                }`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold">
                                            SEC:{d.zone_id} | RISK:{d.risk_score}
                                        </div>
                                        <div className="opacity-50 text-[9px]">{new Date(d.timestamp).toLocaleTimeString()}</div>
                                    </div>
                                    <div className="opacity-80">> {d.monitor_next}</div>
                                </div>
                             )) : (
                                 <div className="p-4 text-center opacity-40">
                                     NO ACTIVE AGENT TELEMETRY...
                                 </div>
                             )}
                         </div>
                     )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default App;
