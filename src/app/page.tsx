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
      // Fetch demand, forecast, and metrics in parallel
      const [demandRes, forecastRes, metricsRes] = await Promise.allSettled([
        fetch(`/api/demand?region=${regionCode}&hours=168`),
        fetch(`/api/forecast?region=${regionCode}`),
        fetch(`/api/metrics?region=${regionCode}`),
      ]);

      // Demand (required)
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

      // Forecast (optional — may not exist for all regions)
      if (forecastRes.status === "fulfilled" && forecastRes.value.ok) {
        const json: ForecastAPIResponse = await forecastRes.value.json();
        setForecast(json.forecasts);
      } else {
        setForecast([]);
      }

      // Metrics (optional)
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

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="border-b border-white/[0.06] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="text-blue-400"
              >
                <path
                  d="M2 12L5 4L8 9L11 2L14 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
              GridPulse
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <RegionPicker value={region} onChange={handleRegionChange} />
            {lastUpdated && (
              <span className="text-xs text-zinc-600">
                Updated {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Region title */}
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {REGIONS[region]}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Hourly demand + 24h XGBoost forecast — EIA-930
            </p>
          </div>

          {/* Error state */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] px-5 py-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-zinc-500">Loading demand data...</p>
              </div>
            </div>
          )}

          {/* Data loaded */}
          {!loading && !error && data.length > 0 && (
            <>
              {/* Metrics */}
              <MetricsBar data={data} regionName={REGIONS[region]} />

              {/* Chart with forecast overlay */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <DemandChart data={data} forecast={forecast} />
              </div>

              {/* Model performance */}
              <ModelMetricsCard metrics={modelMetrics} />

              {/* Insight */}
              <InsightCard data={data} regionName={REGIONS[region]} />

              {/* Data source attribution */}
              <p className="text-xs text-zinc-600">
                Source:{" "}
                <a
                  href="https://www.eia.gov/electricity/gridmonitor/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-zinc-400"
                >
                  U.S. Energy Information Administration, Hourly Electric Grid
                  Monitor (EIA-930)
                </a>
                {" | "}
                Model: XGBoost regressor trained on 90-day rolling window
              </p>
            </>
          )}

          {/* Empty state */}
          {!loading && !error && data.length === 0 && (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-zinc-400">No data available for {REGIONS[region]}.</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Run{" "}
                  <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">
                    python data/ingest.py
                  </code>{" "}
                  to fetch data.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
