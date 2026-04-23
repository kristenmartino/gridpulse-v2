"use client";

import type { DemandRow } from "@/lib/types";

interface MetricsBarProps {
  data: DemandRow[];
  regionName: string;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default function MetricsBar({ data }: MetricsBarProps) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.demand_mw);
  const current = values[values.length - 1];
  const peak = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  const last24 = values.slice(-24);
  const prior24 = values.slice(-48, -24);
  const last24Avg = last24.reduce((a, b) => a + b, 0) / last24.length;
  const prior24Avg =
    prior24.length > 0
      ? prior24.reduce((a, b) => a + b, 0) / prior24.length
      : last24Avg;
  const trendPct = ((last24Avg - prior24Avg) / prior24Avg) * 100;
  const trendUp = trendPct >= 0;

  return (
    <div className="grid grid-cols-5 divide-x divide-[var(--border)]">
      {/* Current — hero metric */}
      <div className="pr-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Now
        </p>
        <p className="tabular mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {fmt(current)}
        </p>
        <p className="text-[10px] text-[var(--text-muted)]">MW</p>
      </div>

      {/* Peak */}
      <div className="px-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          7d Peak
        </p>
        <p className="tabular mt-1 text-lg font-medium text-[var(--text-secondary)]">
          {fmt(peak)}
        </p>
      </div>

      {/* Low */}
      <div className="px-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          7d Low
        </p>
        <p className="tabular mt-1 text-lg font-medium text-[var(--text-secondary)]">
          {fmt(min)}
        </p>
      </div>

      {/* Average */}
      <div className="px-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Average
        </p>
        <p className="tabular mt-1 text-lg font-medium text-[var(--text-secondary)]">
          {fmt(avg)}
        </p>
      </div>

      {/* Trend */}
      <div className="pl-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          24h Trend
        </p>
        <p
          className={`tabular mt-1 text-lg font-medium ${
            trendUp ? "text-[var(--negative)]" : "text-[var(--positive)]"
          }`}
        >
          {trendUp ? "+" : ""}
          {trendPct.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
