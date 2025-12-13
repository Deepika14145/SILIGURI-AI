import { Coordinates } from './types';

// Siliguri Corridor Approximate Center
export const MAP_CENTER: Coordinates = {
  lat: 26.71, 
  lng: 88.43
};

// Grid Configuration
export const GRID_ROWS = 6;
export const GRID_COLS = 6;
export const CELL_SIZE_KM = 3; // Approximate size

// Risk Weights (Total 1.0)
export const WEIGHTS = {
  WEATHER: 0.25,
  MOBILITY: 0.30,
  TERRAIN: 0.20,
  HISTORY: 0.25
};

// Thresholds
export const THRESHOLD_MEDIUM = 40;
export const THRESHOLD_HIGH = 70;
export const THRESHOLD_CRITICAL = 85;

// Simulation
export const REFRESH_RATE_MS = 5000; // Update every 5 seconds
