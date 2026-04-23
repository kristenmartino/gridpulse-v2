"use client";

import { useState, useEffect, useCallback } from "react";
import DemandChart from "@/components/DemandChart";
import MetricsBar from "@/components/MetricsBar";
import InsightCard from "@/components/InsightCard";
import RegionPicker from "@/components/RegionPicker";
import ModelMetricsCard from "@/components/ModelMetricsCard";
import {
  REGIONS,
  type RegionCode,
  type DemandRow,
  type DemandAPIResponse,
  type ForecastPoint,
  type ForecastAPIResponse,
  type ModelMetrics,
} from "@/lib/types";

export default function Dashboard() {
  const [region, setRegion] = useState<RegionCode>("ERCO");
  const [data, setData] = useState<DemandRow[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = useCallback(async (regionCode: RegionCode) => {
    setLoading(true);
    setError(null);

    try {
      const [demandRes, forecastRes, metricsRes] = await Promise.allSettled([
        fetch(`/api/demand?region=${regionCode}&hours=168`),
        fetch(`/data/${regionCode}_forecast.json`),
        fetch(`/data/${regionCode}_metrics.json`),
      ]);

      if (demandRes.status === "fulfilled" && demandRes.value.ok) {
        const json: DemandAPIResponse = await demandRes.value.json();
        setData(json.rows);
        setLastUpdated(json.last_updated);
      } else {
        const msg =
          demandRes.status === "fulfilled"
            ? (await demandRes.value.json()).error
            : "Network error";
        throw new Error(msg ?? "Failed to fetch demand data");
      }

      if (forecastRes.status === "fulfilled" && forecastRes.value.ok) {
        const json: ForecastAPIResponse = await forecastRes.value.json();
        setForecast(json.forecasts);
      } else {
        setForecast([]);
      }

      if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
        const json: ModelMetrics = await metricsRes.value.json();
        setModelMetrics(json);
      } else {
        setModelMetrics(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setData([]);
      setForecast([]);
      setModelMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(region);
  }, [region, fetchData]);

  return (
    <div className="flex flex-1 flex-col">
      {/* ─── Header ─── */}
      <header className="border-b border-[var(--border)] px-6 lg:px-8">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="text-[var(--accent)]"
            >
              <path
                d="M2 14L5.5 5L9 10.5L12.5 2L16 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
              GridPulse
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">/</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              demand intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <RegionPicker value={region} onChange={setRegion} />
            {lastUpdated && !loading && (
              <span className="hidden text-[10px] text-[var(--text-muted)] sm:inline">
                {new Date(lastUpdated).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="flex-1 px-6 py-10 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Error */}
          {error && (
            <div className="mb-8 rounded-md border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex h-[420px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-[1.5px] border-[var(--accent)] border-t-transparent" />
            </div>
          )}

          {/* Content */}
          {!loading && !error && data.length > 0 && (
            <div className="space-y-8">
              {/* Title block */}
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                  {REGIONS[region]}
                </h1>
                <p className="text-xs text-[var(--text-tertiary)]">
                  7-day hourly demand with 24-hour XGBoost forecast
                </p>
              </div>

              {/* Metrics row */}
              <MetricsBar data={data} regionName={REGIONS[region]} />

              {/* Chart — the hero */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-5">
                <DemandChart data={data} forecast={forecast} />
              </div>

              {/* Model provenance bar */}
              <ModelMetricsCard metrics={modelMetrics} />

              {/* Narrative insight */}
              <InsightCard
                data={data}
                forecast={forecast}
                regionName={REGIONS[region]}
              />

              {/* Attribution */}
              <footer className="border-t border-[var(--border)] pt-4">
                <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
                  Data from{" "}
                  <a
                    href="https://www.eia.gov/electricity/gridmonitor/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[var(--text-muted)]/30 hover:text-[var(--text-tertiary)]"
                  >
                    EIA-930 Hourly Electric Grid Monitor
                  </a>
                  . Forecast by XGBoost regressor on a 90-day rolling training
                  window. Confidence intervals widen with horizon to reflect
                  compounding uncertainty.
                </p>
              </footer>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && data.length === 0 && (
            <div className="flex h-[420px] flex-col items-center justify-center gap-2">
              <p className="text-sm text-[var(--text-tertiary)]">
                No data for {REGIONS[region]}.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                Run{" "}
                <code className="rounded bg-[var(--bg-raised)] px-1.5 py-0.5 font-mono text-[10px]">
                  python data/ingest.py
                </code>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
