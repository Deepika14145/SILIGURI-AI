
import React from 'react';
import { Shield, Zap, ScanLine, BrainCircuit, Activity, ArrowRight, Sun, Moon, Database, Lock, Fingerprint } from 'lucide-react';
import { Theme } from '../types';

interface LandingPageProps {
  onNavigate: (view: 'THREAT' | 'ANOMALY') => void;
  theme: Theme;
  toggleTheme: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, theme, toggleTheme }) => {
  return (
    <div className={`h-[100dvh] w-full flex flex-col transition-colors duration-500 overflow-hidden ${
        theme === 'dark' ? 'bg-army-950 text-army-100' : 'bg-army-50 text-army-900'
    }`}>
      
      {/* Top Bar */}
      <nav className={`w-full px-8 py-4 flex justify-between items-center border-b-4 shrink-0 ${
          theme === 'dark' ? 'bg-army-900 border-gov-gold' : 'bg-white border-gov-orange'
      }`}>
        <div className="flex items-center gap-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
            alt="Emblem" 
            className="h-12 w-auto opacity-90 invert-0"
            style={{ filter: theme === 'dark' ? 'invert(1) sepia(1) saturate(5) hue-rotate(5deg)' : 'none' }} 
          />
          <div>
            <h1 className="text-sm font-bold tracking-widest uppercase text-gov-orange">Ministry of Defence</h1>
            <h2 className="text-xl font-black tracking-tight uppercase font-sans">Siliguri Defense Command</h2>
          </div>
        </div>
        
        <button 
          onClick={toggleTheme}
          className={`p-2 border transition-all ${
              theme === 'dark' 
              ? 'bg-army-800 hover:bg-army-700 text-gov-gold border-army-600' 
              : 'bg-army-100 hover:bg-army-200 text-army-800 border-army-300'
          }`}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative w-full">
        
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

        <div className={`max-w-4xl w-full border-2 p-10 shadow-sharp-lg z-10 flex flex-col items-center text-center ${
            theme === 'dark' ? 'bg-army-900 border-army-600' : 'bg-white border-army-300'
        }`}>
            
            <div className={`inline-flex items-center gap-2 px-4 py-1 mb-8 border font-mono text-xs font-bold tracking-widest uppercase ${
                theme === 'dark' 
                ? 'bg-red-900/20 text-red-500 border-red-900' 
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
                <Lock size={12} /> Restricted Access // Auth Required
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-tight">
                Integrated Threat <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gov-orange to-gov-green">Surveillance Grid</span>
            </h1>
            
            <p className={`text-lg max-w-2xl mx-auto mb-10 font-mono ${
                theme === 'dark' ? 'text-army-300' : 'text-army-700'
            }`}>
                Secure Uplink for Siliguri Corridor Monitoring. AI-Driven Predictive Analytics, Satellite Fusion, and Real-Time Soldier Telemetry.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
                <button 
                   onClick={() => onNavigate('THREAT')}
                   className="flex-1 py-4 bg-army-700 hover:bg-army-600 text-white font-bold uppercase tracking-wider shadow-sharp border-2 border-army-900 flex items-center justify-center gap-3 transition-transform active:translate-y-1"
                >
                    <Fingerprint size={20} /> Verify & Enter
                </button>
                <button className={`flex-1 py-4 font-bold uppercase tracking-wider border-2 flex items-center justify-center gap-3 transition-colors ${
                    theme === 'dark' 
                    ? 'border-army-500 text-army-300 hover:bg-army-800' 
                    : 'border-army-400 text-army-800 hover:bg-army-50'
                }`}>
                    <Database size={20} /> System Status
                </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 w-full border-t border-dashed pt-8 border-gray-500/30">
                <div className="text-center">
                    <div className="text-2xl font-black text-gov-green mb-1">98.4%</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-60">Uptime</div>
                </div>
                <div className="text-center border-l border-r border-dashed border-gray-500/30">
                    <div className="text-2xl font-black text-gov-orange mb-1">SECURE</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-60">Network</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-black text-gov-blue mb-1">active</div>
                    <div className="text-[10px] uppercase tracking-widest opacity-60">AI Core</div>
                </div>
            </div>
        </div>

        <footer className={`mt-auto py-6 text-[10px] font-mono opacity-50 uppercase tracking-[0.2em] fixed bottom-0 ${theme === 'dark' ? 'text-army-500' : 'text-army-600'}`}>
             Property of Government of India // Unauthorized Access is Punishable
        </footer>

      </main>
    </div>
  );
};

export default LandingPage;
