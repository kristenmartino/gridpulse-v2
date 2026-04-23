"use client";

import { useState, useEffect, useCallback } from "react";
import DemandChart from "@/components/DemandChart";
import MetricsBar from "@/components/MetricsBar";
import InsightCard from "@/components/InsightCard";
import RegionPicker from "@/components/RegionPicker";
import { REGIONS, type RegionCode, type DemandRow, type DemandAPIResponse } from "@/lib/types";

export default function Dashboard() {
  const [region, setRegion] = useState<RegionCode>("ERCO");
  const [data, setData] = useState<DemandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchData = useCallback(async (regionCode: RegionCode) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/demand?region=${regionCode}&hours=168`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json: DemandAPIResponse = await res.json();
      setData(json.rows);
      setLastUpdated(json.last_updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
      setData([]);
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
              Hourly demand — Last 7 days from EIA-930
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

              {/* Chart */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <DemandChart data={data} />
              </div>

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
              </p>
            </>
          )}

          {/* Empty state */}
          {!loading && !error && data.length === 0 && (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-zinc-400">No data available for {REGIONS[region]}.</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Run <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-xs">python data/ingest.py</code> to fetch data.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
