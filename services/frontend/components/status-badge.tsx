import { Badge } from "@/components/ui/badge";
import { scoreToStatus } from "@/lib/utils/health";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { SourceProvenance } from "@/lib/types";

interface StatusBadgeProps {
  score: number | null;
  scoreSource: SourceProvenance;
  className?: string;
  showDetails?: boolean; // Toggles the smaller source text if needed
}

export function StatusBadge({ score, scoreSource, className, showDetails = true }: StatusBadgeProps) {
  const status = scoreToStatus(score);
  
  const variantStyles = {
    nominal: "bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20 dark:bg-green-500/20 dark:text-green-400",
    degraded: "bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400",
    critical: "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/20 dark:bg-destructive/20 dark:text-red-400",
    offline: "bg-muted text-muted-foreground hover:bg-muted border-border",
    unknown: "bg-muted text-muted-foreground hover:bg-muted border-border",
  };

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className={cn("flex flex-col gap-1 items-start", className)}>
      <Badge variant="outline" className={cn("font-medium transition-colors", variantStyles[status])}>
        {label}
        {score !== null && <span className="ml-1 opacity-70">({score})</span>}
      </Badge>
      
      {showDetails && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
          <Info className="size-3" />
          {scoreSource}
        </div>
      )}
    </div>
  );
}
