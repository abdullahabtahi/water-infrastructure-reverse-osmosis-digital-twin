import { Forecast } from "@/lib/types";
import { LineChart } from "lucide-react";

export function FoulingForecastPanel({ forecast }: { forecast: Forecast | null }) {
  if (!forecast) {
    return (
      <section className="flex flex-col gap-5">
        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
          <LineChart className="size-3" /> Fouling Forecast
        </h3>
        <div className="p-6 bg-white border border-border/20 rounded-[20px] flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 z-10">Incomplete Evidence</span>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80 flex items-center gap-2">
        <LineChart className="size-3" /> Fouling Forecast
      </h3>
      <div className="grid grid-cols-3 gap-6 p-6 bg-white border border-border/20 rounded-[20px]">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-2">Current ΔP Rise</span>
          <div className="text-xl font-medium tracking-tight text-foreground">
            {forecast.currentRise > 0 ? '+' : ''}{forecast.currentRise.toFixed(2)} <span className="text-xs text-muted-foreground ml-0.5">bar</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-2">Fouling Rate</span>
          <div className="text-xl font-medium tracking-tight text-foreground">
            {forecast.foulingRatePerDay > 0 ? '+' : ''}{forecast.foulingRatePerDay.toFixed(3)} <span className="text-xs text-muted-foreground ml-0.5">/d</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-extrabold mb-2">Trend R²</span>
          <div className="text-xl font-medium tracking-tight text-foreground">
            {forecast.trendR2.toFixed(2)}
          </div>
        </div>
      </div>
    </section>
  );
}
