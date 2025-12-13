
import { GoogleGenAI } from "@google/genai";
import { GridCell, WeatherData, Alert } from '../types';

let aiClient: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export const generateStrategicReport = async (
  cell: GridCell,
  weather: WeatherData
): Promise<string> => {
  if (!aiClient) {
    return "API_KEY not configured. Cannot generate live AI report.";
  }

  const prompt = `
    ACT AS A SENIOR MILITARY INTELLIGENCE OFFICER.
    Your task is to provide a predictive threat assessment for a specific sector in the Siliguri Corridor.

    SECTOR DATA (FUSED SOURCES):
    - **ID**: ${cell.id}
    - **Calculated Threat Level**: ${cell.threatLevel} (Score: ${cell.riskScore}/100)
    - **Mobility Anomaly**: ${cell.mobilityDensity.toFixed(1)}% (Normal: ~20%)
    - **Terrain Difficulty**: ${cell.terrainComplexity}% (Higher = Dense Forest/River)
    - **Historical Conflict**: ${cell.historicalActivity}%
    
    LIVE WEATHER:
    - Visibility: ${weather.visibility}m
    - Condition: ${weather.isDay ? 'Daylight' : 'Night'}
    - Wind: ${weather.windSpeed} km/h

    ANALYSIS REQUIRED:
    1. **Prediction**: Based on the high mobility and ${weather.isDay ? 'daylight' : 'low light'} conditions, what is the probability of an infiltration attempt in the next 2 hours?
    2. **Pattern Recognition**: Does the combination of terrain (${cell.terrainComplexity}%) and current weather favor the adversary?
    3. **Tactical Recommendation**: Provide 2 specific actions (e.g., "Deploy Thermal Drones to Sector ${cell.id}", "Alert Border Outpost Alpha").

    Format as a tactical briefing (Markdown). Keep it brief, authoritative, and actionable.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Analysis complete but no text returned.";
  } catch (error) {
    console.error("AI Analysis Failed", error);
    return "## Analysis Failed\nUnable to reach AI Command Center. Please rely on manual metrics.";
  }
};

export const chatWithCommander = async (
  query: string,
  grid: GridCell[],
  weather: WeatherData,
  recentAlerts: Alert[]
): Promise<string> => {
  if (!aiClient) {
    return "Offline: AI Uplink Not Established (Missing API Key).";
  }

  // 1. Optimize Context (Only send high-risk cells to save tokens/latency)
  const highRiskCells = grid
    .filter(c => c.riskScore > 50)
    .map(c => `Sector ${c.id}: Risk ${c.riskScore}, Mobility ${c.mobilityDensity.toFixed(0)}%, Factors: ${c.riskFactors.join(', ')}`)
    .join('\n');

  const alertsContext = recentAlerts.slice(0, 5).map(a => `[${new Date(a.timestamp).toLocaleTimeString()}] ${a.level}: ${a.message}`).join('\n');

  const systemInstruction = `
    You are 'Command AI', an advanced tactical assistant for the Siliguri Corridor Defense Grid.
    Your user is a Sector Commander. Answer efficiently, using military terminology.
    
    CURRENT SITUATION REPORT (SITREP):
    - Weather: ${weather.isDay ? 'Day' : 'Night'}, Visibility ${weather.visibility}m, Wind ${weather.windSpeed}km/h.
    - Active Alerts:
    ${alertsContext || "None"}
    
    CRITICAL SECTORS (Risk > 50):
    ${highRiskCells || "All sectors currently nominal."}
    
    CAPABILITIES:
    - You can issue URGENT VOICE BROADCASTS to troops.
    - To do this, start a new line with the tag: [BROADCAST: Your Short Audio Message]
    - Only use this if the user asks to "alert units", "broadcast", or if there is an imminent Critical Threat in the context.
    
    INSTRUCTIONS:
    - If asked about "hotspots", list the top 3 sectors by risk.
    - If asked "why", explain using the risk factors provided.
    - Be brief. No pleasantries. Start directly with the answer.
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      contents: query,
    });
    return response.text || "Command, please repeat. Signal interference.";
  } catch (error) {
    console.error("Commander Chat Failed", error);
    return "Uplink Error. Unable to process tactical query.";
  }
};
