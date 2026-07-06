import { UnitInspection } from "../types";

export const getMockInspection = (unitId: string, date: string): UnitInspection => {
  const isMeasured = unitId.startsWith('F') || unitId.startsWith('G');
  
  return {
    unitId,
    timestamp: date,
    flux: { value: 14.5, source: 'measured' },
    pressureDrop: { value: 1.2, source: 'measured' },
    energyUsage: { value: 2.1, source: isMeasured ? 'measured' : 'modeled' },
    daysSinceClean: 45,
  };
};
