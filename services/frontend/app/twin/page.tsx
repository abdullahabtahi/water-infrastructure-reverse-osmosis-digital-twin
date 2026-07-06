import { PlantScene } from "@/components/plant-scene";

export default function TwinPage() {
  return (
    <main className="flex-1 flex flex-col items-center w-full pb-24">
      
      {/* Top Header Placeholder (Replay Clock + Timeline Scrubber) */}
      <div className="w-full max-w-6xl mt-8 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="h-14 bg-muted/20 w-48 rounded-2xl border border-dashed border-border/50 animate-pulse flex items-center justify-center">
          <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Clock Stub</span>
        </div>
        <div className="h-14 bg-muted/20 flex-1 rounded-2xl border border-dashed border-border/50 animate-pulse flex items-center justify-center">
          <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Timeline Stub</span>
        </div>
      </div>

      <PlantScene />
      
      {/* Bottom Charts Placeholder */}
      <div className="w-full max-w-6xl mt-12">
         <div className="h-px bg-border/50 w-full mb-12" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-muted/10 rounded-2xl border border-dashed border-border/50 animate-pulse" />
            <div className="h-64 bg-muted/10 rounded-2xl border border-dashed border-border/50 animate-pulse" />
            <div className="h-64 bg-muted/10 rounded-2xl border border-dashed border-border/50 animate-pulse" />
         </div>
      </div>
    </main>
  );
}
