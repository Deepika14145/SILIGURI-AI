import { GridCell, Coordinates, WeatherData, ThreatLevel } from '../types';
import { GRID_ROWS, GRID_COLS } from '../constants';

// Parse "row-col" ID to numbers
const parseId = (id: string): { r: number, c: number } => {
  const [r, c] = id.split('-').map(Number);
  return { r, c };
};

// Heuristic: Manhattan distance
const heuristic = (a: { r: number, c: number }, b: { r: number, c: number }): number => {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
};

// Calculate traversal cost for a cell
const getTraversalCost = (cell: GridCell, weather: WeatherData | null): number => {
  const BASE_COST = 1;
  
  // 1. Threat Risk Penalty (0-10 extra cost)
  // We want to strictly avoid Critical/High zones unless necessary
  const riskPenalty = (cell.riskScore / 10); 

  // 2. Terrain Penalty (0-5 extra cost)
  // Harder to move through complex terrain
  const terrainPenalty = (cell.terrainComplexity / 20);

  // 3. Blind Patrol Penalty (Visibility + Terrain)
  // If visibility is low (< 2km) and terrain is complex (> 50), it's a dangerous "blind patrol"
  let blindPatrolPenalty = 0;
  if (weather && weather.visibility < 2000 && cell.terrainComplexity > 50) {
    blindPatrolPenalty = 20; // Massive penalty to force avoidance
  }

  // Choke Point Avoidance (Critical threats are effectively walls unless no other option)
  if (cell.threatLevel === ThreatLevel.CRITICAL) {
      return 100 + terrainPenalty;
  }

  return BASE_COST + riskPenalty + terrainPenalty + blindPatrolPenalty;
};

export const calculateOptimalPath = (
  grid: GridCell[],
  startId: string,
  endId: string,
  weather: WeatherData | null
): Coordinates[] => {
  // Map grid for easy lookup
  const gridMap = new Map<string, GridCell>();
  grid.forEach(cell => gridMap.set(cell.id, cell));

  const start = parseId(startId);
  const end = parseId(endId);

  // Check if start/end exist
  if (!gridMap.has(startId) || !gridMap.has(endId)) {
      console.warn("Pathfinding failed: Invalid start or end ID");
      return [];
  }

  // A* Data Structures
  const openSet: string[] = [startId];
  const cameFrom = new Map<string, string>();
  
  const gScore = new Map<string, number>(); // Cost from start to node
  grid.forEach(c => gScore.set(c.id, Infinity));
  gScore.set(startId, 0);

  const fScore = new Map<string, number>(); // Estimated total cost
  grid.forEach(c => fScore.set(c.id, Infinity));
  fScore.set(startId, heuristic(start, end));

  while (openSet.length > 0) {
    // Get node with lowest fScore
    let currentId = openSet[0];
    let lowestF = fScore.get(currentId) || Infinity;

    for (const id of openSet) {
      const f = fScore.get(id) || Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (currentId === endId) {
      // Reconstruct Path
      const path: Coordinates[] = [];
      let curr: string | undefined = currentId;
      while (curr) {
        const cell = gridMap.get(curr);
        if (cell) path.unshift(cell.center);
        curr = cameFrom.get(curr);
      }
      return path;
    }

    // Remove current from openSet
    openSet.splice(openSet.indexOf(currentId), 1);

    const currentPos = parseId(currentId);
    
    // Get Neighbors (Up, Down, Left, Right)
    const neighbors = [
      { r: currentPos.r - 1, c: currentPos.c },
      { r: currentPos.r + 1, c: currentPos.c },
      { r: currentPos.r, c: currentPos.c - 1 },
      { r: currentPos.r, c: currentPos.c + 1 },
    ].filter(n => n.r >= 0 && n.r < GRID_ROWS && n.c >= 0 && n.c < GRID_COLS);

    for (const n of neighbors) {
      const neighborId = `${n.r}-${n.c}`;
      const neighborCell = gridMap.get(neighborId);
      
      if (!neighborCell) continue;

      const tentativeG = (gScore.get(currentId) || Infinity) + getTraversalCost(neighborCell, weather);

      if (tentativeG < (gScore.get(neighborId) || Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);
        fScore.set(neighborId, tentativeG + heuristic(n, end));
        
        if (!openSet.includes(neighborId)) {
          openSet.push(neighborId);
        }
      }
    }
  }

  // No path found
  console.warn("A* Pathfinding returned no path.");
  return [];
};