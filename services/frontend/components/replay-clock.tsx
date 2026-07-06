'use client';
import { useReplayStore } from "@/lib/store/replay-store";
import { format, parseISO } from "date-fns";
import { Play, Pause } from "lucide-react";
import { useEffect } from "react";

export function ReplayClock() {
  const { currentDate, isPlaying, setIsPlaying, advanceTime } = useReplayStore();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        advanceTime();
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, advanceTime]);

  const dateStr = format(parseISO(currentDate), "MMM dd, yyyy");

  return (
    <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md rounded-[24px] px-2 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white">
      <button 
        onClick={() => setIsPlaying(!isPlaying)}
        aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
        className="w-[42px] h-[42px] flex items-center justify-center rounded-full bg-[#1465c4] text-white hover:bg-[#1054a3] transition-all shadow-md flex-shrink-0 cursor-pointer active:scale-95"
      >
        {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current translate-x-[1px]" />}
      </button>
      <div className="flex flex-col pr-6">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-extrabold mb-0.5">Simulation Clock</span>
        <span className="font-sans text-[15px] font-black tracking-tight text-foreground">{dateStr}</span>
      </div>
    </div>
  );
}
