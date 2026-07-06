import { generateMockFleet } from "../data/mock-fleet";
import { getMockTimelineRange } from "../data/mock-timeline";
import { getMockInspection } from "../data/mock-inspection";
import { getMockAlerts } from "../data/mock-alerts";
import { mockValidation } from "../data/mock-validation";

// Real serving API (ro-serving-api). Falls back to mock data if the API is unreachable,
// so the UI still renders offline. Set NEXT_PUBLIC_API_URL to override the default.
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function live<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const res = await fetch(`${API}${path}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as T;
  } catch {
    return fallback(); // graceful fallback to mock
  }
}

export const fetchFleetStatus = (date: string) =>
  live(`/api/fleet?date=${date}`, () => generateMockFleet(date));

export const fetchTimelineRange = () =>
  live(`/api/timeline`, () => getMockTimelineRange());

export const fetchUnitInspection = (unitId: string, date: string) =>
  live(`/api/inspection/${unitId}?date=${date}`, () => getMockInspection(unitId, date));

export const fetchAlerts = (date: string) =>
  live(`/api/alerts?date=${date}`, () => getMockAlerts(date));

export const fetchEnvironmentContext = (date: string) =>
  live(`/api/env?date=${date}`, () => ({
    date,
    electricityCostUsdPerKwh: 0.12, // approx 12 cents
    gridCarbonIntensityKgPerKwh: 0.35, // approx 350 g/kWh
    ambientTemperatureC: 22.5,
  }));

export const fetchPhysicsDeviation = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/physics-deviation/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return []; // Return empty array instead of mock data
  }
};

export const fetchForecast = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/forecast/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchAnomaly = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/anomaly/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return [];
  }
};

export const fetchValidationReport = () =>
  live(`/api/validation`, () => mockValidation);

export const fetchEconomics = async (unitId: string, date: string) => {
  try {
    const res = await fetch(`${API}/api/economics/${unitId}?date=${date}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};

export const fetchEconomicsOverrides = async (unitId: string, date: string, params: Record<string, number>) => {
  try {
    const res = await fetch(`${API}/api/economics/${unitId}/override?date=${date}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
};

export type AssistantReply = {
  answer: string;
  mode: "gemini" | "deterministic";
  backend: string;
  unit: string | null;
};

// Spec 007 — advise-only RO assistant. Answers over the 003–006 evidence; the backend uses
// Gemini when configured and a deterministic composer otherwise (so it never fails).
export const askAssistant = async (
  question: string,
  opts?: { date?: string; unit?: string | null }
): Promise<AssistantReply> => {
  try {
    const res = await fetch(`${API}/api/assistant/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, date: opts?.date, unit: opts?.unit ?? undefined }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return (await res.json()) as AssistantReply;
  } catch {
    return {
      answer: "The assistant is offline right now. Please try again once the serving API is running.",
      mode: "deterministic",
      backend: "unreachable",
      unit: opts?.unit ?? null,
    };
  }
};
