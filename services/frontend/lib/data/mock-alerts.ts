import { AlertItem } from "../types";

export const getMockAlerts = (date: string): AlertItem[] => {
  return [
    {
      id: "alrt-1",
      unitId: "A01",
      severity: "critical",
      message: "High pressure drop detected",
      timestamp: date,
      evidence: "Pressure drop exceeded 1.5 bar threshold (measured 1.62 bar)",
    },
    {
      id: "alrt-2",
      unitId: "C02",
      severity: "warning",
      message: "Fouling accumulation predicted",
      timestamp: date,
      evidence: "Model forecasts critical fouling in 5 days based on current flux trend",
    }
  ];
};
