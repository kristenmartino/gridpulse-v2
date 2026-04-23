import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { DemandRow } from "./types";

// In Next.js dev, process.cwd() is the src/ directory.
// In production, it depends on deployment. Use relative to cwd.
const DB_PATH = path.resolve(process.cwd(), "data", "gridpulse.db");

// Fallback: try parent directory (if cwd is src/)
const DB_PATH_ALT = path.resolve(process.cwd(), "..", "data", "gridpulse.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const dbPath = fs.existsSync(DB_PATH) ? DB_PATH : DB_PATH_ALT;
    _db = new Database(dbPath, { readonly: true });
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

/**
 * Fetch hourly demand data for a region.
 *
 * @param region  - EIA respondent code (e.g. "ERCO")
 * @param hours   - Number of hours to look back (default 168 = 7 days)
 */
export function getDemand(region: string, hours = 168): DemandRow[] {
  const db = getDb();

  const stmt = db.prepare(`
    SELECT period, region, demand_mw
    FROM demand
    WHERE region = ?
    ORDER BY period DESC
    LIMIT ?
  `);

  const rows = stmt.all(region, hours) as DemandRow[];
  return rows.reverse(); // chronological order
}

/**
 * Get the most recent data timestamp across all regions.
 */
export function getLastUpdated(): string {
  const db = getDb();
  const row = db
    .prepare("SELECT MAX(ingested_at) as last FROM demand")
    .get() as { last: string } | undefined;
  return row?.last ?? "unknown";
}

/**
 * Get a summary of what's in the database.
 */
export function getDbSummary(): { region: string; count: number; min_period: string; max_period: string }[] {
  const db = getDb();
  return db
    .prepare(`
      SELECT region, COUNT(*) as count, MIN(period) as min_period, MAX(period) as max_period
      FROM demand
      GROUP BY region
      ORDER BY region
    `)
    .all() as { region: string; count: number; min_period: string; max_period: string }[];
}
