import { BadgeInfo, Activity, LineChart, DollarSign, CheckCircle2 } from "lucide-react";
import { SourceTrace } from "@/lib/store/assistant-store";

interface Props {
  trace: SourceTrace;
  onClick?: () => void;
}

export function SourceTraceBadge({ trace, onClick }: Props) {
  let Icon = BadgeInfo;
  let bgColor = "bg-muted";
  let textColor = "text-muted-foreground";

  switch (trace.capability) {
    case "data_analyst":
    case "anomaly_detection":
      Icon = Activity;
      bgColor = "bg-blue-50";
      textColor = "text-blue-700";
      break;
    case "simulation":
      Icon = LineChart;
      bgColor = "bg-purple-50";
      textColor = "text-purple-700";
      break;
    case "economics":
      Icon = DollarSign;
      bgColor = "bg-emerald-50";
      textColor = "text-emerald-700";
      break;
    case "document":
      Icon = CheckCircle2;
      bgColor = "bg-amber-50";
      textColor = "text-amber-700";
      break;
  }

  return (
    <button
      onClick={onClick}
      className="group relative inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-card border border-border mx-1 focus:outline-none hover:bg-secondary transition-colors duration-300"
      title={trace.evidence_summary}
      type="button"
    >
      <div className={`flex items-center justify-center w-5 h-5 rounded-full ${bgColor} border border-transparent`}>
        <Icon className={`w-3 h-3 ${textColor}`} />
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-widest ${textColor}`}>
        {trace.capability.replace('_', ' ')}
      </span>
      <span className="text-muted-foreground/30 text-[10px] font-mono">•</span>
      <span className="text-[10px] font-mono font-medium text-muted-foreground">
        {trace.unit_id}
      </span>
    </button>
  );
}
