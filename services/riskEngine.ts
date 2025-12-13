
import { GridCell, ThreatLevel, WeatherData } from '../types';
import { WEIGHTS, THRESHOLD_MEDIUM, THRESHOLD_HIGH, THRESHOLD_CRITICAL } from '../constants';

// Explicitly export weather risk calculation for UI 'Impact Analysis'
export const calculateWeatherRisk = (weather: WeatherData): number => {
  let weatherScore = 0;
  
  // Visibility Impact (Major Factor)
  if (weather.visibility < 500) weatherScore += 60; // Dense Fog
  else if (weather.visibility < 2000) weatherScore += 40; // Mist/Haze
  else if (weather.visibility < 5000) weatherScore += 20; // Low Vis
  
  // Time of Day Impact
  if (!weather.isDay) weatherScore += 25; // Night operations risk
  
  // Storm/Wind Impact
  if (weather.windSpeed > 30) weatherScore += 15;
  else if (weather.windSpeed > 15) weatherScore += 5;
  
  return Math.min(100, weatherScore);
};

export const getWeatherImpactDescription = (weather: WeatherData): string => {
    const factors = [];
    if (weather.visibility < 2000) factors.push("LOW_VISIBILITY");
    if (!weather.isDay) factors.push("NIGHT_OPS");
    if (weather.windSpeed > 20) factors.push("HIGH_WIND");
    
    if (factors.length === 0) return "NORMAL_CONDITIONS";
    return factors.join(" + ");
};

export const calculateRiskScore = (
  weather: WeatherData,
  mobility: number,
  terrain: number,
  history: number,
  reportImpact: number = 0
): number => {
  // 1. Get Normalized Component Risks
  const wRisk = calculateWeatherRisk(weather);

  // 2. Apply Weighted Formula
  const baseScore = 
    (wRisk * WEIGHTS.WEATHER) +
    (mobility * WEIGHTS.MOBILITY) +
    (terrain * WEIGHTS.TERRAIN) +
    (history * WEIGHTS.HISTORY);

  // 3. Apply Field Report Impact (Direct tactical boost)
  // Field reports represent verified human intel, so they add directly to the risk score
  const finalScore = baseScore + reportImpact;

  return Math.round(Math.min(100, finalScore));
};

export const classifyThreat = (score: number): ThreatLevel => {
  if (score >= THRESHOLD_CRITICAL) return ThreatLevel.CRITICAL;
  if (score >= THRESHOLD_HIGH) return ThreatLevel.HIGH;
  if (score >= THRESHOLD_MEDIUM) return ThreatLevel.MEDIUM;
  return ThreatLevel.LOW;
};

// Statistical Anomaly Detection (Unsupervised Z-Score)
// Calculates how many standard deviations the current mobility is from the baseline
export const calculateZScore = (current: number, baseline: number): number => {
    const stdDev = 15; // Assumed standard deviation for this context
    const diff = current - baseline;
    return parseFloat((diff / stdDev).toFixed(2));
};

export const detectAnomaly = (zScore: number): boolean => {
  // Z-Score > 2.0 implies 2 standard deviations away (Top ~2.5% of probability)
  return zScore > 2.5; 
};
