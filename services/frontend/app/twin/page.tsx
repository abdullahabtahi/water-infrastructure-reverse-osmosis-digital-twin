import { PlantScene } from "@/components/plant-scene";
import { InspectionDrawer } from "@/components/inspection-drawer";

export default function TwinPage() {
  return (
    <main className="flex-1 flex w-full h-full overflow-hidden bg-[#EFEFEF]">
      
      {/* Left Column - Main Scene */}
      <div className="flex-1 flex flex-col overflow-y-auto px-6 py-6 relative">
        <PlantScene />
      </div>

      {/* Right Column - Inspection Drawer */}
      <InspectionDrawer />
    </main>
  );
}
