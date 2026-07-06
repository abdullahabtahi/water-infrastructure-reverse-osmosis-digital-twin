import { PhysicsDeviation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Activity, Beaker, Zap, AlertTriangle } from "lucide-react";

interface PhysicsDeviationPanelProps {
  deviations: PhysicsDeviation[];
}

export function PhysicsDeviationPanel({ deviations }: PhysicsDeviationPanelProps) {
  if (!deviations || deviations.length === 0) return null;

  const getMetricConfig = (metric: string) => {
    switch (metric) {
      case "unit_n_delta_p":
        return { label: "Differential Pressure", unit: "bar", icon: <Activity className="w-4 h-4" /> };
      case "salt_passage":
        return { label: "Salt Passage", unit: "%", icon: <Beaker className="w-4 h-4" /> };
      case "unit_recovery":
        return { label: "Recovery", unit: "%", icon: <Zap className="w-4 h-4" /> };
      default:
        return { label: metric, unit: "", icon: <Activity className="w-4 h-4" /> };
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/50" /> Physics Deviation
      </h3>
      
      <div className="flex flex-col bg-white border border-border/20 rounded-[20px] overflow-hidden">
        {deviations.map((dev, idx) => {
          const config = getMetricConfig(dev.metric);
          const isOOR = dev.status === "out-of-range";
          const isUnavailable = dev.status === "unavailable";
          
          return (
            <div 
              key={dev.metric} 
              className={cn(
                "flex flex-col p-6 border-b border-border/10 last:border-0 transition-colors",
                isUnavailable && "opacity-50 grayscale"
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  {config.icon}
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.1em]">{config.label}</span>
                </div>
                {isOOR && (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                )}
              </div>
              
              {!isUnavailable ? (
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-2xl font-medium tracking-tight text-foreground">
                      {dev.actual?.toFixed(2)} <span className="text-sm text-muted-foreground ml-0.5">{config.unit}</span>
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Expected clean: {dev.expectedClean?.toFixed(2)} {config.unit}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end">
                    <span className={cn(
                      "text-lg font-medium tracking-tight",
                      dev.deviation && dev.deviation > 0 ? (dev.metric === "unit_recovery" ? "text-destructive" : "text-warning") : "text-success",
                      dev.deviation && dev.deviation < 0 ? (dev.metric === "unit_recovery" ? "text-warning" : "text-success") : ""
                    )}>
                      {dev.deviation && dev.deviation > 0 ? "+" : ""}{dev.deviation?.toFixed(2)} <span className="text-sm">{config.unit}</span>
                    </span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                      Deviation
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-sm text-muted-foreground italic">
                  Data unavailable for this cycle
                </div>
              )}
              
              {/* Provenance footer */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/10">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                  {dev.provenance} • {dev.fidelity} baseline
                </div>
                {dev.deviationPct !== null && !isUnavailable && (
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-semibold">
                    {Math.abs(dev.deviationPct!).toFixed(1)}% delta
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
