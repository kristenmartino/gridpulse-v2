import type { NextRequest } from "next/server";
import { REGIONS, type RegionCode, type DemandAPIResponse } from "@/lib/types";

const EIA_API_BASE =
  "https://api.eia.gov/v2/electricity/rto/region-data/data/";
const EIA_API_KEY = process.env.EIA_API_KEY ?? "DEMO_KEY";

/**
 * GET /api/demand?region=ERCO&hours=168
 *
 * Fetches hourly demand data directly from the EIA Open Data API.
 * No local database required — works on serverless (Vercel).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = (searchParams.get("region") ?? "ERCO").toUpperCase() as RegionCode;
  const hours = Math.min(Number(searchParams.get("hours") ?? 168), 8760);

  if (!(region in REGIONS)) {
    return Response.json(
      { error: `Unknown region: ${region}. Valid: ${Object.keys(REGIONS).join(", ")}` },
      { status: 400 }
    );
  }

  // Build date range
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600 * 1000);
  const startStr = start.toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const endStr = end.toISOString().slice(0, 13);

  // Build URL with exact param format the EIA API expects
  // (matching the working Python ingest script)
  const params = [
    `api_key=${EIA_API_KEY}`,
    `frequency=hourly`,
    `data[0]=value`,
    `facets[respondent][]=${region}`,
    `facets[type][]=D`,
    `start=${startStr}`,
    `end=${endStr}`,
    `sort[0][column]=period`,
    `sort[0][direction]=asc`,
    `length=${hours}`,
  ].join("&");

  try {
    const res = await fetch(`${EIA_API_BASE}?${params}`, {
      headers: { "User-Agent": "GridPulse/2.0" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("EIA API error:", res.status, text);
      return Response.json(
        { error: `EIA API returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const eiaRows: Array<{ period: string; value: number }> =
      json?.response?.data ?? [];

    const rows = eiaRows.map((r) => ({
      period: r.period.length === 13 ? r.period + ":00:00Z" : r.period,
      region,
      demand_mw: r.value,
    }));

    const response: DemandAPIResponse = {
      region,
      region_name: REGIONS[region],
      rows,
      count: rows.length,
      last_updated: rows.length > 0 ? rows[rows.length - 1].period : "unknown",
    };

    return Response.json(response);
  } catch (err) {
    console.error("EIA fetch error:", err);
    return Response.json(
      { error: "Failed to fetch demand data from EIA" },
      { status: 500 }
    );
  }
}
