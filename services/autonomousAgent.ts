
import { WeatherData, ThreatLevel, AgentDecision } from '../types';
import { calculateRiskScore, classifyThreat, detectAnomaly, calculateZScore, calculateWeatherRisk } from './riskEngine';
import { THRESHOLD_MEDIUM } from '../constants';

export interface AgentInput {
  id: string;
  weather: WeatherData;
  mobility: number;
  mobilityBaseline: number;
  mobilityDelta: number; // Change from previous tick
  terrain: number;
  history: number;
}

/**
 * Autonomous AI Agent Logic
 * 
 * Role: Virtual Intelligence Officer
 * Mission: Monitor streams, detect anomalies, predict infiltration.
 * 
 * Decision Rules:
 * 1. Calculate weighted risk score based on fused data.
 * 2. Detect statistical anomalies in mobility patterns.
 * 3. Trigger alert if Risk > Threshold OR (Medium Risk + Anomaly).
 * 4. Generate human-readable factor list for explainability.
 * 5. Generate "What to monitor next" (Tactical Advice).
 */
export const analyzeZone = (input: AgentInput): AgentDecision => {
  // 1. Compute Base Metrics using the Risk Engine
  const riskScore = calculateRiskScore(input.weather, input.mobility, input.terrain, input.history);
  const threatLevelEnum = classifyThreat(riskScore);
  const zScore = calculateZScore(input.mobility, input.mobilityBaseline);
  const isAnomaly = detectAnomaly(zScore);
  
  // 2. Identify Specific Risk Factors (Explainability)
  const factors: string[] = [];
  let priorityContext = 'NORMAL';

  // Weather Context
  if (input.weather.visibility < 1000) { factors.push("Critical Low Visibility"); priorityContext = 'VISIBILITY'; }
  else if (input.weather.visibility < 3000) { factors.push("Low Visibility"); priorityContext = 'VISIBILITY'; }
  
  if (!input.weather.isDay) factors.push("Night Ops Conditions");
  if (input.weather.windSpeed > 30) factors.push("High Wind Interference");

  // Mobility & Anomaly Context (Real-Time Alerts)
  if (input.mobilityDelta > 25) {
      factors.push("Rapid Activity Change");
      priorityContext = 'MOVEMENT';
  }

  // "Border Patch" Logic: Assume '0-' rows are border zones
  const isBorder = input.id.startsWith('0-') || input.id.startsWith('1-');
  if (isBorder && (isAnomaly || input.mobilityDelta > 20)) {
      factors.push("Border Patch Movement");
      priorityContext = 'BORDER_INFILTRATION';
  } else if (isAnomaly) {
      factors.push("Abnormal Crowd Pattern");
      priorityContext = 'ANOMALY';
  } else if (input.mobility > 80) {
      factors.push("High Crowd Density");
      priorityContext = 'CROWD';
  }

  // Terrain & History Context
  if (input.terrain > 70) factors.push("Complex Terrain");
  if (input.history > 70) factors.push("Historical Incident Zone");

  // 3. Generate Tactical Monitoring Advice (What to monitor next)
  let monitorNext = "Scan sector for changes."; // Default

  if (priorityContext === 'BORDER_INFILTRATION') {
      monitorNext = "Check fence line & gullies for footprints.";
  } else if (priorityContext === 'VISIBILITY') {
      monitorNext = "Switch to Thermal/IR. Scan treeline.";
  } else if (priorityContext === 'MOVEMENT') {
      monitorNext = "Identify vector of movement. Report group size.";
  } else if (priorityContext === 'ANOMALY') {
      monitorNext = "Investigate grouping pattern. Verify civilian status.";
  } else if (priorityContext === 'CROWD') {
      monitorNext = "Monitor chokepoints for high-value targets.";
  } else if (input.history > 80) {
      monitorNext = "Maintain vigilance. Known ambush zone.";
  }

  // 4. Autonomous Decision Rule
  let shouldAlert = false;
  
  // Trigger on High/Critical Risk
  if (threatLevelEnum === ThreatLevel.CRITICAL || threatLevelEnum === ThreatLevel.HIGH) {
      shouldAlert = true;
  }
  // Trigger on Medium Risk if there is also an anomaly
  else if (threatLevelEnum === ThreatLevel.MEDIUM && isAnomaly) {
      shouldAlert = true;
  }
  // Trigger purely on significant rapid changes near border even if risk score is lower
  else if (isBorder && input.mobilityDelta > 30) {
      shouldAlert = true;
  }

  // 5. Format Output
  const riskLevelStr = threatLevelEnum.charAt(0) + threatLevelEnum.slice(1).toLowerCase();

  const dataClarity = (factors.length > 0 ? 0.05 : -0.05) + (isAnomaly ? 0.05 : 0);
  const confidence = Math.min(0.99, Math.max(0.75, 0.85 + dataClarity + (Math.random() * 0.05)));

  return {
    zone_id: input.id,
    risk_score: riskScore,
    risk_level: riskLevelStr,
    factors: factors,
    monitor_next: monitorNext,
    alert: shouldAlert,
    timestamp: Date.now(),
    confidence: parseFloat(confidence.toFixed(2))
  };
};
