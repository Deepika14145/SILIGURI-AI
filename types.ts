
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export type Theme = 'light' | 'dark';
export type AppView = 'LANDING' | 'DASHBOARD';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherData {
  temperature: number;
  visibility: number; // in meters
  precipitation: number; // mm
  windSpeed: number; // km/h
  isDay: boolean;
}

export interface GridCell {
  id: string;
  bounds: [Coordinates, Coordinates]; // [SouthWest, NorthEast]
  center: Coordinates;
  
  // Risk Factors (0-100)
  weatherRisk: number;
  terrainComplexity: number;
  mobilityDensity: number;
  historicalActivity: number;
  reportImpact: number; // New: Impact from soldier reports
  
  // Anomaly Data (Unsupervised)
  mobilityBaseline: number;
  zScore: number; // Statistical deviation
  
  // Calculated
  riskScore: number;
  threatLevel: ThreatLevel;
  
  // Metadata
  lastUpdated: number;
  anomalyDetected: boolean;
  
  // Agent Insights
  riskFactors: string[];
  monitorNext: string; // New: Specific action for the soldier
}

export interface Alert {
  id: string;
  timestamp: number;
  cellId: string;
  level: ThreatLevel;
  message: string;
  type: 'INFILTRATION_PREDICTION' | 'MOBILITY_ANOMALY' | 'WEATHER_ALERT' | 'FIELD_REPORT' | 'VOICE_COMMAND';
}

export interface SystemLog {
  id: string;
  timestamp: number;
  component: 'DATA_LAYER' | 'RISK_ENGINE' | 'AI_ANALYSIS' | 'ANOMALY_DETECTOR' | 'AUTONOMOUS_AGENT' | 'FIELD_OPS' | 'COMMAND_AI';
  message: string;
}

export interface AnalysisResult {
  markdown: string;
  timestamp: number;
}

export interface AgentDecision {
  zone_id: string;
  risk_score: number;
  risk_level: string;
  factors: string[];
  monitor_next: string; // New
  alert: boolean;
  timestamp: number;
  confidence: number;
}

export interface FieldReport {
  id: string;
  timestamp: number;
  cellId: string; // The zone this report applies to
  coordinates: Coordinates;
  type: 'SUSPICIOUS_ACTIVITY' | 'GEAR_FOUND' | 'INFILTRATION_SIGNS' | 'OTHER';
  notes?: string;
  image?: string; // Mock base64/url
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: number;
}
