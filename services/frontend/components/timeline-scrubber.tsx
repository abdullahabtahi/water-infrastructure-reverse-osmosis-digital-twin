'use client';
import { useReplayStore } from "@/lib/store/replay-store";
import { parseISO, differenceInDays, formatISO, addDays } from "date-fns";
import { Slider } from "@/components/ui/slider";

export function TimelineScrubber() {
  const { currentDate, availableDateRange, setCurrentDate } = useReplayStore();
  
  const start = parseISO(availableDateRange[0]);
  const end = parseISO(availableDateRange[1]);
  const current = parseISO(currentDate);
  
  const totalDays = differenceInDays(end, start);
  const currentDay = Math.max(0, Math.min(totalDays, differenceInDays(current, start)));

  const handleSliderChange = (vals: number[]) => {
    const val = vals[0];
    const newDate = addDays(start, val);
    setCurrentDate(formatISO(newDate));
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-background/50 backdrop-blur-md border border-border/40 rounded-[1.5rem] px-8 py-3 shadow-sm group transition-all hover:border-border">
      <div className="flex items-center justify-between w-full mb-3">
        <span className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">
          Timeline Scrubber
        </span>
        <span className="text-[10px] text-muted-foreground font-medium">
          {totalDays} Days Available
        </span>
      </div>
      
      <Slider 
        value={[currentDay]} 
        max={totalDays} 
        step={1} 
        onValueChange={handleSliderChange}
        className="w-full cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
