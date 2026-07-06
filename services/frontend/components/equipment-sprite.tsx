import Image from "next/image";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";

interface EquipmentSpriteProps {
  unit: UnitHealth | undefined;
  id: string; // fallback if unit is undefined
  label: string;
  imageSrc: string;
  className?: string;
  index?: number;
}

export function EquipmentSprite({ unit, id, label, imageSrc, className, index = 0 }: EquipmentSpriteProps) {
  const { selectedUnitId, setSelectedUnitId } = useReplayStore();
  const isActive = selectedUnitId === (unit?.id || id);

  return (
    <button
      onClick={() => setSelectedUnitId(unit?.id || id)}
      aria-label={`Inspect ${label}`}
      aria-pressed={isActive}
      className={cn(
        "group relative flex flex-col items-center gap-4 p-5 rounded-[2rem] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "border border-border/40 bg-background/50 backdrop-blur-md",
        "hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:border-border hover:-translate-y-1",
        isActive && "ring-1 ring-primary/30 bg-primary/[0.02] border-primary/20",
        "animate-in fade-in slide-in-from-bottom-8 fill-mode-both",
        className
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Outer Shell / Inner Core Architecture for the image */}
      <div className="relative w-full aspect-[4/3] rounded-[1.5rem] bg-black/5 dark:bg-white/5 p-1.5 ring-1 ring-black/5 dark:ring-white/10 overflow-hidden">
        <div className="relative w-full h-full rounded-[calc(1.5rem-0.375rem)] bg-white dark:bg-black/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex items-center justify-center overflow-hidden">
          <Image
            src={imageSrc}
            alt={label}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] dark:drop-shadow-md"
          />
        </div>
      </div>
      
      <div className="flex flex-col items-center text-center gap-3 w-full mt-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground/90">{label}</h3>
        {unit ? (
          <StatusBadge score={unit.score} scoreSource={unit.scoreSource} showDetails={false} />
        ) : (
          <div className="h-[22px]" /> // Placeholder height
        )}
      </div>
    </button>
  );
}
