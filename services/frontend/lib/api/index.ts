import { generateMockFleet } from "../data/mock-fleet";
import { getMockTimelineRange } from "../data/mock-timeline";
import { getMockInspection } from "../data/mock-inspection";
import { getMockAlerts } from "../data/mock-alerts";

// Simulating network delay for realism
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const fetchFleetStatus = async (date: string) => {
  await delay(300);
  return generateMockFleet(date);
};

export const fetchTimelineRange = async () => {
  await delay(100);
  return getMockTimelineRange();
};

export const fetchUnitInspection = async (unitId: string, date: string) => {
  await delay(200);
  return getMockInspection(unitId, date);
};

export const fetchAlerts = async (date: string) => {
  await delay(300);
  return getMockAlerts(date);
};
