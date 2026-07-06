'use client';

import { Forecast, Anomaly } from "@/lib/types";
import { AlertTriangle, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface EarlyWarningPanelProps {
  forecast: Forecast | null;
  anomalies: Anomaly[];
}

export function EarlyWarningPanel({ forecast, anomalies }: EarlyWarningPanelProps) {
  if (!forecast && anomalies.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
          <Activity className="size-3" /> Early Warning Signals
        </h3>
        <div className="p-6 bg-white border border-border/20 rounded-[20px] text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Info className="w-4 h-4" /> No forecast or anomaly data available for this cycle.
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
        <Activity className="size-3" /> Early Warning Signals
      </h3>

      <div className="flex flex-col bg-white border border-border/20 rounded-[20px]">
        {/* Forecast Metrics (Flat Grid) */}
        {forecast && (
          <div className="grid grid-cols-2 gap-y-8 gap-x-6 p-6 border-b border-border/10">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-extrabold mb-2">Fouling Onset Score</span>
              <div className="flex items-end gap-2">
                <span className={cn(
                  "text-3xl font-light tracking-tight",
                  forecast.foulingOnsetScore > 75 ? "text-destructive" :
                  forecast.foulingOnsetScore > 50 ? "text-warning" : "text-success"
                )}>
                  {forecast.foulingOnsetScore.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground mb-1">/ 100</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2 border-t border-border/10 pt-2">
                <span className="font-medium text-foreground">Driven by:</span> {forecast.featureAttribution.join(', ')}
              </div>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-extrabold mb-2">Days to Clean (Forecast)</span>
              <div className="flex items-end gap-2">
                {forecast.daysToClean !== null ? (
                  <>
                    <span className={cn(
                      "text-3xl font-light tracking-tight",
                      forecast.daysToClean < 14 ? "text-destructive" :
                      forecast.daysToClean < 30 ? "text-warning" : "text-success"
                    )}>
                      {forecast.daysToClean}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">days</span>
                  </>
                ) : (
                  <span className="text-xl text-muted-foreground font-light tracking-tight">Incomplete Evidence</span>
                )}
              </div>
              {forecast.daysToClean !== null && (
                <div className="text-xs text-muted-foreground mt-2 border-t border-border/10 pt-2">
                  <span className="font-medium text-foreground">90% CI:</span> {forecast.ciLower} - {forecast.ciUpper} days
                  <br />
                  <span className="font-medium text-foreground mt-1 inline-block">Drivers:</span> {forecast.forecastDrivers.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Anomalies List */}
        {anomalies.length > 0 && (
          <div className="flex flex-col p-6 pt-4 gap-3">
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.1em] font-extrabold mb-1">Active Anomalies</span>
            <div className="flex flex-col gap-2">
              {anomalies.map((anom, idx) => (
                <div key={idx} className="flex items-start gap-3 py-2 border-b border-border/10 last:border-0">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {anom.signal} deviated by {anom.deviation_from_baseline > 0 ? '+' : ''}{anom.deviation_from_baseline}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">
                      Z-Score: {anom.z_score} (vs clean baseline)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
