import { HealthStatus } from "../types";

export function scoreToStatus(score: number | null): HealthStatus {
  if (score === null || score === undefined) return 'unknown';
  
  if (score >= 66) return 'nominal';
  if (score >= 33) return 'degraded';
  if (score >= 0) return 'critical';
  
  return 'unknown';
}
