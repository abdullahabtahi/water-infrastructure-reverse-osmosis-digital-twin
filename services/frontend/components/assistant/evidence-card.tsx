"use client";

import { SourceTrace } from "@/lib/store/assistant-store";
import { ChevronDown, ChevronUp, AlertCircle, TrendingUp, DollarSign, Activity, FileCheck2, Info } from "lucide-react";
import { useState } from "react";

interface Props {
  trace: SourceTrace;
}

export function EvidenceCard({ trace }: Props) {
  const [expanded, setExpanded] = useState(false);
  const payload = trace.evidence_payload;

  if (!payload) return null;

  const renderContent = () => {
    switch (trace.capability) {
      case "forecast":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Confidence Interval:</span>
              <span className="font-mono text-foreground font-medium">
                {payload.confidence_interval ? `[${payload.confidence_interval[0]}, ${payload.confidence_interval[1]}]` : "N/A"}
              </span>
            </div>
            {payload.drivers && payload.drivers.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Key Drivers</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {payload.drivers.map((d: string, i: number) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case "anomaly":
      case "anomaly_detection":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Deviating Signal:</span>
              <span className="font-mono text-foreground font-medium">{payload.deviating_signal}</span>
            </div>
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Magnitude vs Baseline:</span>
              <span className="font-mono text-foreground font-medium">{payload.magnitude_vs_baseline}</span>
            </div>
          </div>
        );
      case "fouling":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <span className="text-[11px] uppercase tracking-wider font-semibold">Feature Attribution</span>
            <div className="mt-2 space-y-2">
              {payload.feature_attribution && Object.entries(payload.feature_attribution).map(([signal, weight]) => (
                <div key={signal} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-mono">{signal}</span>
                    <span className="font-mono">{typeof weight === 'number' ? weight.toFixed(2) : weight}</span>
                  </div>
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${Math.min(100, Math.abs(Number(weight)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "economics":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Provenance</span>
              <span className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider border ${
                payload.label === 'measured' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}>
                {payload.label}
              </span>
            </div>
            {payload.assumptions && Object.keys(payload.assumptions).length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold">Assumptions</span>
                <div className="mt-1 bg-secondary p-2 rounded-[8px] border border-border font-mono text-[11px] space-y-1 text-foreground">
                  {Object.entries(payload.assumptions).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{k}:</span>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "deviation":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Baseline:</span>
              <span className="font-mono text-foreground font-medium">{payload.baseline_value}</span>
            </div>
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Actual:</span>
              <span className="font-mono text-foreground font-medium">{payload.actual_value}</span>
            </div>
            <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border">
              <span>Delta:</span>
              <span className="font-mono text-foreground font-medium">{payload.delta_pct}%</span>
            </div>
          </div>
        );
      case "validation":
      case "document":
        return (
          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Validation Basis</span>
              <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-bold uppercase tracking-wider bg-secondary border border-border text-foreground">
                {payload.validation_basis || 'Unknown'}
              </span>
            </div>
            {payload.mape !== undefined && payload.mape !== null && (
              <div className="flex justify-between items-center bg-secondary p-2 rounded-[8px] border border-border mt-2">
                <span>MAPE:</span>
                <span className="font-mono text-foreground font-medium">{payload.mape}%</span>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="text-[12px] font-mono text-muted-foreground bg-secondary p-3 rounded-[8px] border border-border break-all">
            {JSON.stringify(payload, null, 2)}
          </div>
        );
    }
  };

  return (
    <div className="mt-2 w-full border border-border bg-card rounded-[20px] overflow-hidden flex flex-col">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-col items-start p-3 text-left hover:bg-secondary transition-colors focus:outline-none"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-[13px] font-semibold tracking-wide text-foreground">Evidence Detail</span>
          </div>
          <div className={`transform transition-transform duration-[300ms] ${expanded ? 'rotate-180' : 'rotate-0'}`}>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1.5 pr-6 leading-relaxed line-clamp-2">
          {trace.evidence_summary}
        </p>
      </button>
      
      <div className={`overflow-hidden transition-all duration-[300ms] ${expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-3 pt-0 mt-1 border-t border-border">
          <div className="pt-3">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
