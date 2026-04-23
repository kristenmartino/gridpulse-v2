"use client";

import type { DemandRow, ForecastPoint } from "@/lib/types";

interface InsightCardProps {
  data: DemandRow[];
  forecast: ForecastPoint[];
  regionName: string;
}

export default function InsightCard({ data, forecast, regionName }: InsightCardProps) {
  if (data.length < 48) return null;

  const values = data.map((d) => d.demand_mw);
  const current = values[values.length - 1];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const deviation = ((current - avg) / avg) * 100;
  const direction = deviation >= 0 ? "above" : "below";

  // Find peak in last 24h
  const recent = data.slice(-24);
  let peakVal = 0;
  let peakIdx = 0;
  recent.forEach((row, i) => {
    if (row.demand_mw > peakVal) {
      peakVal = row.demand_mw;
      peakIdx = i;
    }
  });
  const peakTime = new Date(recent[peakIdx].period);
  const peakHour = peakTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Forecast peak
  let forecastSentence = "";
  if (forecast.length > 0) {
    const fPeak = forecast.reduce((a, b) => (b.forecast_mw > a.forecast_mw ? b : a));
    const fPeakTime = new Date(fPeak.period);
    const fPeakHour = fPeakTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    forecastSentence = ` The model forecasts a peak of ${Math.round(fPeak.forecast_mw).toLocaleString()} MW around ${fPeakHour} tomorrow.`;
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
        Summary
      </p>
      <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
        Demand is{" "}
        <span
          className={`font-medium ${
            deviation >= 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"
          }`}
        >
          {Math.abs(deviation).toFixed(1)}% {direction}
        </span>{" "}
        the 7-day average in {regionName}. The last 24-hour peak was{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {Math.round(peakVal).toLocaleString()} MW
        </span>{" "}
        at {peakHour}.{forecastSentence}
      </p>
    </div>
  );
}
