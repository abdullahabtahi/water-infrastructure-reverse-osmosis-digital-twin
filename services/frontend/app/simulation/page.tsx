import { ValidationReportPanel } from "@/components/simulation/validation-report-panel";

export default function SimulationPage() {
  return (
    <main className="flex-1 overflow-y-auto p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Validation & Economics</h1>
          <p className="text-muted-foreground mt-2">
            Ground-truth performance validation and economic metrics.
          </p>
        </div>
        
        <ValidationReportPanel />
      </div>
    </main>
  );
}
