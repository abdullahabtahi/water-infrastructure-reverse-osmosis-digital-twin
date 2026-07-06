"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fetchValidationReport } from "@/lib/api";
import { ValidationReport } from "@/lib/types";
import { AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function ValidationReportPanel() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchValidationReport();
        setReport(data);
      } catch (e) {
        console.error("Failed to load validation report", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Skeleton className="w-full h-64 rounded-xl" />;
  }

  if (!report) {
    return (
      <Card className="w-full border-border/50 shadow-sm bg-background/50">
        <CardContent className="p-8 flex flex-col items-center justify-center text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-4 opacity-50" />
          <p>No validation report available.</p>
        </CardContent>
      </Card>
    );
  }

  const leading = report.leading_indicator;

  return (
    <Card className="w-full border-border/50 shadow-sm bg-background/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground">Fouling Validation Report</CardTitle>
            <CardDescription className="mt-1.5 text-muted-foreground">
              Ground-truth performance across {report.detected_cycles} operating cycles
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono bg-background shadow-sm border-border">
              {report.total_cip_events} CIP Events
            </Badge>
            <Badge variant="secondary" className="font-medium bg-secondary/50 text-secondary-foreground">
              Baseline Error: {(report.baseline_error * 100).toFixed(1)}%
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <Separator className="bg-border/50" />
      
      <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leading Indicator Stats */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Leading Signal: {leading.signal}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">Recall</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">{(leading.recall * 100).toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">({leading.tps}/{leading.tps + leading.fns})</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">Precision</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">{(leading.precision * 100).toFixed(0)}%</span>
                  <span className="text-xs text-muted-foreground">({leading.tps}/{leading.tps + leading.fps})</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">Lead Time</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-foreground">{leading.median_lead_days !== null ? leading.median_lead_days.toFixed(0) : "N/A"}</span>
                  <span className="text-xs text-muted-foreground">days (median)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Alternative Indicators</h3>
            <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Signal</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Precision</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Recall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {report.alternative_indicators.map(alt => (
                    <tr key={alt.signal} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{alt.signal}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{alt.score.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{(alt.precision * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{(alt.recall * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-muted/20 border border-border/50">
            <h4 className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              Pre-Registered Parameters
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Horizon Days</span>
                <span className="font-medium">{report.pre_registered_params.horizon_days}d</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sustained Warning</span>
                <span className="font-medium">{report.pre_registered_params.min_sustained_warning_days}d</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-muted/20 border border-border/50">
            <h4 className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Mechanism Mix
            </h4>
            <div className="space-y-3">
              {(() => {
                const total = Object.values(report.mechanism_mix).reduce((sum, val) => sum + val, 0);
                return Object.entries(report.mechanism_mix).map(([mech, count]) => {
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                <div key={mech}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="capitalize text-muted-foreground">{mech}</span>
                    <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary/80 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
