'use client';
import { useReplayStore } from "@/lib/store/replay-store";
import { format, parseISO } from "date-fns";
import { Play, Pause } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function ReplayClock() {
  const { currentDate, isPlaying, setIsPlaying, advanceTime } = useReplayStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        advanceTime();
      }, 500); // 1 tick per 500ms
    }
    return () => clearInterval(interval);
  }, [isPlaying, advanceTime]);

  const dateStr = format(parseISO(currentDate), "MMM dd, yyyy");

  return (
    <div className="flex items-center gap-4 bg-background/50 backdrop-blur-md border border-border/40 rounded-[1.5rem] px-5 py-3 shadow-sm">
      <div className="flex items-center gap-2 pr-4 border-r border-border/50">
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
          className={cn(
            "p-3 rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105 active:scale-95",
            isPlaying 
              ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(20,101,196,0.25)]" 
              : "bg-muted hover:bg-muted/80 text-foreground"
          )}
        >
          {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
        </button>
      </div>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Simulation Clock</span>
        <span className="font-mono text-[15px] font-bold tracking-tight text-foreground mt-0.5">{dateStr}</span>
      </div>
    </div>
  );
}
