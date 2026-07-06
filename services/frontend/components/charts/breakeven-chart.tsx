'use client';

import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { EvidenceFigure } from "../evidence-figure";
import { useReplayStore } from "@/lib/store/replay-store";
import { fetchEconomics } from "@/lib/api";

const mockEconomicsData = [
  { day: 0, costDelta: -500 },
  { day: 5, costDelta: -300 },
  { day: 10, costDelta: -100 },
  { day: 15, costDelta: 100 },  // Breakeven crossed
  { day: 20, costDelta: 400 },
  { day: 25, costDelta: 800 },
];

export function BreakevenChart() {
  const selectedUnitId = useReplayStore((state) => state.selectedUnitId);
  const currentDate = useReplayStore((state) => state.currentDate);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (selectedUnitId) {
       fetchEconomics(selectedUnitId, currentDate).then(setData);
    } else {
       setData(null);
    }
  }, [selectedUnitId, currentDate]);

  const chartData = data?.history ? data.history.map((row: any, idx: number) => ({
    day: idx + 1,
    costDelta: row.cum_energy_penalty_usd - row.cip_cost_usd
  })) : mockEconomicsData;

  const currentDayInfo = data?.current || null;

  return (
    <div className="flex flex-col h-full p-5 bg-white border border-border/40 rounded-[20px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-foreground mb-1">CIP Break-Even</h3>
          {currentDayInfo ? (
            <>
              <EvidenceFigure 
                value={currentDayInfo.break_even_day ? `Day ${currentDayInfo.break_even_day}` : "N/A"} 
                unit="" 
                source={currentDayInfo.provenance} 
                label={`Penalty: $${currentDayInfo.cum_energy_penalty_usd} vs CIP: $${currentDayInfo.cip_cost_usd}`} 
                className="!gap-0" 
              />
              <div className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">
                Assumes ${currentDayInfo.params?.electricity_price_usd_kwh || 0.08}/kWh | {currentDayInfo.recommendation}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">Select a unit</div>
          )}
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#787774' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#787774' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '10px', color: '#787774', marginBottom: '4px', textTransform: 'uppercase' }}
            />
            <Area type="monotone" dataKey="costDelta" stroke="#F59E0B" fillOpacity={1} fill="url(#colorCost)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

