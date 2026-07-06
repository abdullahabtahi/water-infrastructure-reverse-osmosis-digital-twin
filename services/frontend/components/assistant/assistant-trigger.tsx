"use client";

import { useAssistantStore } from "@/lib/store/assistant-store";
import { Sparkles } from "lucide-react";

export function AssistantTrigger() {
  const { isOpen, toggle } = useAssistantStore();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle AI Assistant"
      aria-expanded={isOpen}
      className={`
        group relative flex items-center justify-between h-9 w-[132px] px-2 rounded-[16px]
        bg-background border border-border shadow-sm active:scale-[0.98]
        transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
        hover:bg-secondary
        ${isOpen ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}
      `}
    >
      <span className="text-[12px] font-semibold tracking-wide ml-2.5 text-foreground">
        Assistant
      </span>
      <div className="flex items-center justify-center w-6 h-6 rounded-[10px] bg-primary text-primary-foreground transition-colors duration-300">
        <Sparkles className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}
