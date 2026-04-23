"use client";

import type { DemandRow } from "@/lib/types";

interface MetricsBarProps {
  data: DemandRow[];
  regionName: string;
}

export default function MetricsBar({ data, regionName }: MetricsBarProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.demand_mw);
  const current = values[values.length - 1];
  const peak = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // Simple trend: compare last 24h avg vs prior 24h avg
  const last24 = values.slice(-24);
  const prior24 = values.slice(-48, -24);
  const last24Avg = last24.reduce((a, b) => a + b, 0) / last24.length;
  const prior24Avg = prior24.length > 0 ? prior24.reduce((a, b) => a + b, 0) / prior24.length : last24Avg;
  const trendPct = ((last24Avg - prior24Avg) / prior24Avg) * 100;

  const metrics = [
    { label: "Current Load", value: `${Math.round(current).toLocaleString()} MW`, emphasis: true },
    { label: "7-Day Peak", value: `${Math.round(peak).toLocaleString()} MW` },
    { label: "7-Day Low", value: `${Math.round(min).toLocaleString()} MW` },
    { label: "Avg Load", value: `${Math.round(avg).toLocaleString()} MW` },
    {
      label: "24h Trend",
      value: `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%`,
      color: trendPct >= 0 ? "text-amber-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {m.label}
          </p>
          <p
            className={`mt-1 text-xl font-semibold tabular-nums ${
              m.color ?? "text-zinc-100"
            }`}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
