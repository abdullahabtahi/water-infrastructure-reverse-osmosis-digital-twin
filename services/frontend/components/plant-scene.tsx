'use client';

import Image from "next/image";
import { useEffect, useState } from "react";
import { EquipmentSprite } from "./equipment-sprite";
import { SpritePlaceholder } from "./sprite-placeholder";
import { fetchFleetStatus } from "@/lib/api";
import { UnitHealth } from "@/lib/types";
import { useReplayStore } from "@/lib/store/replay-store";

export function PlantScene() {
  const { currentDate } = useReplayStore();
  const [fleet, setFleet] = useState<UnitHealth[]>([]);

  useEffect(() => {
    fetchFleetStatus(currentDate).then(setFleet);
  }, [currentDate]);

  const getUnit = (id: string) => fleet.find(u => u.id === id);

  return (
    <section className="relative w-full py-16 flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
      {/* 1. Backdrop using double-bezel architecture */}
      <div className="relative w-full max-w-6xl aspect-[21/9] rounded-[2rem] overflow-hidden bg-black/5 dark:bg-white/5 ring-1 ring-black/5 dark:ring-white/10 p-2 mb-16 shadow-sm">
        <div className="relative w-full h-full rounded-[calc(2rem-0.5rem)] overflow-hidden bg-background">
          <Image
            src="/assets/equipment/ro-plant.png"
            alt="RO Plant Overview"
            fill
            className="object-cover opacity-90 transition-all duration-1000"
            priority
          />
          {/* Subtle gradient overlay to merge plant scene with UI */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* 2. Equipment Strip (Tier 1 & Tier 2) */}
      <div className="w-full max-w-6xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px bg-border/50 flex-1" />
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground px-4">
            Core Equipment Topology
          </h2>
          <div className="h-px bg-border/50 flex-1" />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {/* Tier 1 - Primary Assets */}
          <EquipmentSprite index={1} id="F01" label="HP Feed Pump" imageSrc="/assets/equipment/hp-feed-pump.png" unit={getUnit('F01')} className="col-span-1 md:col-span-2" />
          <EquipmentSprite index={2} id="F02" label="RO Rack" imageSrc="/assets/equipment/ro-membrane-rack.png" unit={getUnit('F02')} className="col-span-1 md:col-span-2" />
          <EquipmentSprite index={3} id="F03" label="ERD System" imageSrc="/assets/equipment/erd.png" unit={getUnit('F03')} className="col-span-1 md:col-span-2" />
          <EquipmentSprite index={4} id="CIP1" label="CIP Skid" imageSrc="/assets/equipment/cip-skid.png" unit={getUnit('CIP1')} className="col-span-1 md:col-span-2" />

          {/* Tier 2 - Abstracted Sub-systems */}
          <SpritePlaceholder index={5} id="A01" label="Pre-Filter A" unit={getUnit('A01')} />
          <SpritePlaceholder index={6} id="C02" label="Membrane Stage 1" unit={getUnit('C02')} />
          <SpritePlaceholder index={7} id="E03" label="Membrane Stage 2" unit={getUnit('E03')} />
          <SpritePlaceholder index={8} id="G03" label="Product Transfer" unit={getUnit('G03')} />
        </div>
      </div>
    </section>
  );
}
