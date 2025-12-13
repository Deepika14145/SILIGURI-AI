import { Coordinates, WeatherData } from '../types';

// Open-Meteo API
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';

export const fetchRealWeather = async (coords: Coordinates): Promise<WeatherData> => {
  try {
    const params = new URLSearchParams({
      latitude: coords.lat.toString(),
      longitude: coords.lng.toString(),
      current_weather: 'true',
      hourly: 'visibility',
      timezone: 'auto'
    });

    const response = await fetch(`${WEATHER_API_URL}?${params.toString()}`);
    const data = await response.json();

    const current = data.current_weather;
    // Mock visibility if not available in current_weather (it's usually in hourly)
    // We take the current hour's visibility estimate
    const hourIndex = new Date().getHours();
    const visibility = data.hourly?.visibility?.[hourIndex] || 10000;

    return {
      temperature: current.temperature,
      windSpeed: current.windspeed,
      isDay: current.is_day === 1,
      precipitation: 0, // Simplified for this endpoint, often requires different params
      visibility: visibility
    };
  } catch (error) {
    console.error("Weather fetch failed, using fallback", error);
    return {
      temperature: 24,
      windSpeed: 5,
      isDay: true,
      precipitation: 0,
      visibility: 8000
    };
  }
};

// Simulates fetching mobility data from a secure backend
// Live Demo Tuning: Added probabilistic 'spikes' to trigger anomaly alerts
export const fetchMobilityData = (gridId: string, tick: number = 0, isDay: boolean = true, visibility: number = 10000): number => {
  const [r, c] = gridId.split('-').map(Number);
  
  // 1. Base Movement Pattern (Drifting Clouds/Groups)
  // Use Sine waves based on time (tick) and space (r, c) to create moving blobs
  const wave1 = Math.sin(r * 0.5 + tick * 0.2);
  const wave2 = Math.cos(c * 0.5 + tick * 0.2);
  // Create a moving 'flow' across the map
  const flow = (wave1 + wave2 + 2) / 4; // Normalized approx 0-1
  
  let density = flow * 55; // Base density 0-55
  
  // 2. Fixed Hotspots (Towns/Markets) always have some baseline
  const isTown = (r === 2 && c === 2) || (r === 3 && c === 3);
  if (isTown) density += 25;

  // 3. "Unusual Hours" Logic (Night)
  if (!isDay) {
      // Generally quiet at night
      density *= 0.4; 
      
      // FEATURE: Sudden spikes at unusual hours (Border Crossing Points)
      const isBorderCrossing = (r === 0 && c === 2) || (r === 0 && c === 3);
      // Periodic spike representing a group moving at night
      const nightSpike = (tick % 8 === 0) ? 70 : 0; 
      
      if (isBorderCrossing) {
          density += nightSpike;
      }
  }

  // 4. "Fog" Logic (Movement Pattern Detection)
  if (visibility < 2000) {
      // In fog, movement shifts to "Cover" areas (Edges/Forests) to avoid detection
      // We simulate this by boosting density in the outer columns/rows (cover) and reducing in center
      const isCoverArea = r === 0 || c === 0 || c === 5;
      if (isCoverArea) {
           density += 25; // Increase activity in cover
      } else {
           density -= 15; // Decrease in open
      }
  }
  
  // 5. Random Noise & Spikes (Existing Feature)
  const spike = Math.random() < 0.05 ? (Math.random() * 30 + 20) : 0;
  const noise = Math.random() * 10 - 5;

  return Math.max(0, Math.min(100, density + spike + noise));
};

// Static Terrain Analysis (Simulated GIS Data)
export const getTerrainComplexity = (lat: number, lng: number): number => {
  // Northern part is hillier/forested
  if (lat > 26.75) return 85;
  // Near rivers (simulated)
  if (lng > 88.45 && lng < 88.48) return 65;
  return 30; // Plains/Urban
};

// Historical Incident Density (Simulated Database)
export const getHistoricalRisk = (gridId: string): number => {
  const historyMap: Record<string, number> = {
    '0-0': 15, '0-1': 25, '0-2': 85, // High history near border
    '1-2': 70, '2-2': 55,
    '3-3': 95, // Choke point
  };
  return historyMap[gridId] || 10;
};