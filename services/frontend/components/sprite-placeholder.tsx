import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";

interface SpritePlaceholderProps {
  unit: UnitHealth | undefined;
  id: string;
  label: string;
  index?: number;
}

export function SpritePlaceholder({ unit, id, label, index = 0 }: SpritePlaceholderProps) {
  const { selectedUnitId, setSelectedUnitId } = useReplayStore();
  const isActive = selectedUnitId === (unit?.id || id);

  return (
    <button
      onClick={() => setSelectedUnitId(unit?.id || id)}
      aria-label={`Inspect ${label}`}
      aria-pressed={isActive}
      className={cn(
        "group relative flex flex-col items-center justify-between gap-3 p-4 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "border border-dashed border-border/60 bg-muted/10",
        "hover:bg-muted/30 hover:border-border hover:-translate-y-1",
        isActive && "ring-1 ring-primary/30 bg-primary/[0.02] border-primary/20 border-solid",
        "animate-in fade-in slide-in-from-bottom-8 fill-mode-both"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex-1 flex items-center justify-center w-full min-h-[80px]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 font-semibold">{id}</div>
      </div>
      <div className="flex flex-col items-center text-center gap-2 w-full">
        <h3 className="text-xs font-medium text-muted-foreground tracking-tight">{label}</h3>
        {unit && (
          <StatusBadge score={unit.score} scoreSource={unit.scoreSource} showDetails={false} />
        )}
      </div>
    </button>
  );
}
