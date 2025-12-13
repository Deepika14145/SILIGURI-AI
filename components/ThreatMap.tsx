
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup, useMap, Polyline, Marker, Tooltip } from 'react-leaflet';
import { GridCell, ThreatLevel, Theme, Coordinates } from '../types';
import { MAP_CENTER } from '../constants';
import { Activity, AlertTriangle, Eye, ShieldAlert, Target } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface ThreatMapProps {
  grid: GridCell[];
  onCellSelect: (cell: GridCell) => void;
  selectedCellId?: string;
  viewMode: 'THREAT' | 'ANOMALY' | 'MOBILITY';
  theme: Theme;
  patrolRoute: Coordinates[]; 
}

const getThreatColor = (level: ThreatLevel) => {
  switch (level) {
    case ThreatLevel.CRITICAL: return '#7f1d1d'; // Dark Red
    case ThreatLevel.HIGH: return '#c2410c'; // Dark Orange
    case ThreatLevel.MEDIUM: return '#b45309'; // Dark Amber
    case ThreatLevel.LOW: return '#15803d'; // Dark Green
    default: return '#3b82f6';
  }
};

const getAnomalyColor = (zScore: number) => {
    if (zScore > 3.0) return '#a21caf'; // Purple
    if (zScore > 2.0) return '#0e7490'; // Cyan
    if (zScore > 1.0) return '#1d4ed8'; // Blue
    return '#64748b'; // Slate
};

const getMobilityColor = (density: number) => {
    if (density > 80) return '#581c87'; 
    if (density > 60) return '#991b1b'; 
    if (density > 40) return '#ea580c'; 
    if (density > 20) return '#1e40af'; 
    return '#475569'; 
};

const MapController = () => {
  const map = useMap();
  useEffect(() => {
    map.setView([MAP_CENTER.lat, MAP_CENTER.lng], 12);
  }, [map]);
  return null;
};

const ThreatMap: React.FC<ThreatMapProps> = ({ grid, onCellSelect, selectedCellId, viewMode, theme, patrolRoute }) => {
  const tileUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  return (
    <div className={`h-full w-full relative z-0 transition-colors duration-300 ${
        theme === 'dark' ? 'bg-black' : 'bg-army-100'
    }`}>
      <MapContainer 
        center={[MAP_CENTER.lat, MAP_CENTER.lng]} 
        zoom={12} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <MapController />
        <TileLayer
          attribution='&copy; OpenStreetMap &copy; CARTO'
          url={tileUrl}
        />

        {grid.map((cell) => {
            const isSelected = selectedCellId === cell.id;
            let color, fillOpacity;
            
            if (viewMode === 'THREAT') {
                color = getThreatColor(cell.threatLevel);
                fillOpacity = isSelected ? 0.5 : 0.35;
            } else if (viewMode === 'ANOMALY') {
                color = getAnomalyColor(cell.zScore);
                fillOpacity = cell.zScore > 1.5 ? 0.6 : 0.2;
            } else {
                color = getMobilityColor(cell.mobilityDensity);
                fillOpacity = Math.max(0.2, cell.mobilityDensity / 120); 
            }

            return (
              <Rectangle
                key={cell.id}
                bounds={[
                  [cell.bounds[0].lat, cell.bounds[0].lng],
                  [cell.bounds[1].lat, cell.bounds[1].lng]
                ]}
                pathOptions={{
                  color: isSelected ? (theme === 'dark' ? '#FFD700' : '#000000') : '#333333',
                  weight: isSelected ? 3 : 1,
                  fillOpacity: fillOpacity,
                  fillColor: color,
                  className: (viewMode === 'THREAT' && cell.threatLevel === ThreatLevel.CRITICAL) 
                    ? 'critical-zone-pulse' 
                    : ''
                }}
                eventHandlers={{
                  click: () => onCellSelect(cell),
                }}
              >
                <Popup className="bg-transparent border-none shadow-none min-w-[260px]">
                  {/* Tactical HUD Popup Design - Military Style */}
                  <div className={`border-2 flex flex-col font-mono ${theme === 'dark' ? 'bg-army-900 border-gov-gold text-white' : 'bg-white border-army-800 text-black'}`}>
                    
                    {/* Header */}
                    <div className={`flex justify-between items-center p-2 border-b-2 ${theme === 'dark' ? 'bg-black border-gov-gold' : 'bg-army-100 border-army-800'}`}>
                         <span className="font-bold text-sm">SEC-{cell.id}</span>
                         <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                             cell.threatLevel === ThreatLevel.CRITICAL ? 'bg-red-700 text-white border-white' :
                             cell.threatLevel === ThreatLevel.HIGH ? 'bg-orange-600 text-white border-white' :
                             'bg-army-600 text-white border-white'
                         }`}>
                             {cell.threatLevel}
                         </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 p-3">
                        <div className="flex flex-col items-center">
                            <div className={`text-4xl font-black leading-none ${
                                cell.riskScore > 80 ? 'text-red-600' : 'text-army-500'
                            }`}>
                                {cell.riskScore}
                            </div>
                            <div className="text-[8px] uppercase font-bold mt-1">Risk Index</div>
                        </div>

                        <div className="w-px h-10 bg-gray-500"></div>

                        <div className="flex flex-col justify-center">
                             <div className="text-[8px] uppercase font-bold mb-1 opacity-70">Primary Factors</div>
                             <div className="text-xs font-bold leading-tight">
                                 {cell.riskFactors.slice(0, 2).map((f, i) => (
                                     <div key={i} className="flex items-center gap-1">
                                         <AlertTriangle size={10} className="text-amber-500"/> {f}
                                     </div>
                                 ))}
                                 {cell.riskFactors.length === 0 && <span>NOMINAL</span>}
                             </div>
                        </div>
                    </div>

                    {/* Action */}
                    <div className={`p-2 border-t-2 text-xs flex gap-2 ${
                        theme === 'dark' ? 'bg-army-950 border-gov-gold text-gov-gold' : 'bg-army-50 border-army-800 text-army-900'
                    }`}>
                        <Target size={16} className="shrink-0 mt-0.5" />
                        <div>
                            <div className="font-bold uppercase text-[9px]">Orders:</div>
                            <div className="font-medium">{cell.monitorNext || "MAINTAIN WATCH"}</div>
                        </div>
                    </div>

                  </div>
                </Popup>
              </Rectangle>
            );
        })}

        {/* Patrol Route */}
        {patrolRoute.length > 0 && (
          <>
             <Polyline 
               positions={patrolRoute.map(p => [p.lat, p.lng])}
               pathOptions={{ 
                 color: '#16a34a', // Green
                 weight: 4,
                 dashArray: '10, 10',
                 opacity: 1,
               }}
             />
             <Marker position={[patrolRoute[0].lat, patrolRoute[0].lng]}>
                 <Tooltip permanent direction="top" className="font-bold text-xs">BASE</Tooltip>
             </Marker>
             <Marker position={[patrolRoute[patrolRoute.length-1].lat, patrolRoute[patrolRoute.length-1].lng]}>
                <Tooltip permanent direction="top" className="font-bold text-xs">OBJ</Tooltip>
             </Marker>
          </>
        )}

      </MapContainer>
      
      {/* Legend Box */}
      <div className={`hidden sm:block absolute bottom-6 left-6 z-[400] p-4 border-2 shadow-2xl text-xs font-mono ${
          theme === 'dark' 
          ? 'bg-army-950 text-white border-gov-gold' 
          : 'bg-white text-black border-army-800'
      }`}>
        <h4 className="font-bold mb-3 uppercase tracking-wider border-b pb-1 border-gray-500">
            {viewMode} INDEX
        </h4>
        <div className="space-y-2">
            <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#7f1d1d] border border-white"></div> 
            <span>CRITICAL</span>
            </div>
            <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#c2410c] border border-white"></div> 
            <span>HIGH</span>
            </div>
            <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#15803d] border border-white"></div> 
            <span>LOW/MED</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
