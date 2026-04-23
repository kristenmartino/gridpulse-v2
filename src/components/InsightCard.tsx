"use client";

import type { DemandRow } from "@/lib/types";

interface InsightCardProps {
  data: DemandRow[];
  regionName: string;
}

export default function InsightCard({ data, regionName }: InsightCardProps) {
  if (data.length < 48) return null;

  const values = data.map((d) => d.demand_mw);
  const current = values[values.length - 1];
  const avg30 = values.reduce((a, b) => a + b, 0) / values.length;
  const deviation = ((current - avg30) / avg30) * 100;

  // Find peak hour today
  const today = data.slice(-24);
  let peakIdx = 0;
  let peakVal = 0;
  today.forEach((row, i) => {
    if (row.demand_mw > peakVal) {
      peakVal = row.demand_mw;
      peakIdx = i;
    }
  });
  const peakTime = new Date(today[peakIdx].period);
  const peakHour = peakTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const direction = deviation >= 0 ? "above" : "below";
  const absDeviation = Math.abs(deviation).toFixed(1);

  return (
    <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.04] px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-blue-400/80">
        Insight
      </p>
      <p className="mt-2 text-sm leading-relaxed text-zinc-300">
        Demand in <span className="font-medium text-zinc-100">{regionName}</span> is
        tracking{" "}
        <span className={deviation >= 0 ? "text-amber-400" : "text-emerald-400"}>
          {absDeviation}% {direction}
        </span>{" "}
        the 7-day average. Peak in the last 24 hours was{" "}
        <span className="font-medium text-zinc-100">
          {Math.round(peakVal).toLocaleString()} MW
        </span>{" "}
        around {peakHour}.
      </p>
    </div>
  );
}
