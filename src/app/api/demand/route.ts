import type { NextRequest } from "next/server";
import { getDemand, getLastUpdated } from "@/lib/db";
import { REGIONS, type RegionCode, type DemandAPIResponse } from "@/lib/types";

/**
 * GET /api/demand?region=ERCO&hours=168
 *
 * Returns hourly demand data from the SQLite database.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = (searchParams.get("region") ?? "ERCO").toUpperCase() as RegionCode;
  const hours = Math.min(Number(searchParams.get("hours") ?? 168), 8760); // cap at 1 year

  if (!(region in REGIONS)) {
    return Response.json(
      { error: `Unknown region: ${region}. Valid: ${Object.keys(REGIONS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const rows = getDemand(region, hours);
    const lastUpdated = getLastUpdated();

    const response: DemandAPIResponse = {
      region,
      region_name: REGIONS[region],
      rows,
      count: rows.length,
      last_updated: lastUpdated,
    };

    return Response.json(response);
  } catch (err) {
    console.error("Database error:", err);
    return Response.json(
      { error: "Failed to read demand data. Has the ingestion script been run?" },
      { status: 500 }
    );
  }
}
