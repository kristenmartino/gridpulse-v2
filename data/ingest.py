"""
GridPulse V2 — EIA-930 Hourly Demand Ingestion

Fetches hourly demand data from the EIA Open Data API (v2) for specified
balancing authorities and writes it to a local SQLite database.

Usage:
    python data/ingest.py                  # Last 7 days, all regions
    python data/ingest.py --days 30        # Last 30 days
    python data/ingest.py --region ERCO    # Single region

Data source: https://www.eia.gov/opendata/
Endpoint:    electricity/rto/region-data/data
"""

import argparse
import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

# EIA Open Data API — free, register at https://www.eia.gov/opendata/register.php
API_BASE = "https://api.eia.gov/v2/electricity/rto/region-data/data/"
API_KEY = os.environ.get("EIA_API_KEY", "DEMO_KEY")

# Balancing authorities we ingest
REGIONS = {
    "ERCO": "ERCOT",
    "CISO": "CAISO",
    "PJM":  "PJM",
    "MISO": "MISO",
    "SWPP": "SPP",
    "NYIS": "NYISO",
    "ISNE": "ISO-NE",
}

MAX_RETRIES = 3
RETRY_DELAY = 30  # seconds

DB_PATH = Path(__file__).parent / "gridpulse.db"


def init_db(db_path: Path) -> sqlite3.Connection:
    """Create the database and demand table if they don't exist."""
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS demand (
            period   TEXT NOT NULL,
            region   TEXT NOT NULL,
            demand_mw REAL NOT NULL,
            ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (period, region)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_demand_region_period
        ON demand (region, period)
    """)
    conn.commit()
    return conn


def fetch_demand(region: str, start: str, end: str) -> list[dict]:
    """
    Fetch hourly demand from EIA-930 for a single balancing authority.

    Args:
        region: EIA respondent code (e.g. "ERCO")
        start:  ISO start timestamp (e.g. "2025-04-14T00")
        end:    ISO end timestamp (e.g. "2025-04-21T00")

    Returns:
        List of {period, region, demand_mw} dicts
    """
    rows = []
    offset = 0
    page_size = 5000

    while True:
        params = urllib.parse.urlencode({
            "api_key": API_KEY,
            "frequency": "hourly",
            "data[0]": "value",
            "facets[respondent][]": region,
            "facets[type][]": "D",  # D = Demand
            "start": start,
            "end": end,
            "sort[0][column]": "period",
            "sort[0][direction]": "asc",
            "offset": offset,
            "length": page_size,
        })

        url = f"{API_BASE}?{params}"
        print(f"  Fetching {region} offset={offset}...", end=" ", flush=True)

        body = None
        for attempt in range(MAX_RETRIES):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "GridPulse/2.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    body = json.loads(resp.read().decode())
                break
            except urllib.error.HTTPError as e:
                if e.code == 429 and attempt < MAX_RETRIES - 1:
                    wait = RETRY_DELAY * (attempt + 1)
                    print(f"rate limited, retrying in {wait}s...", end=" ", flush=True)
                    time.sleep(wait)
                else:
                    print(f"ERROR: {e}")
                    break
            except Exception as e:
                print(f"ERROR: {e}")
                break

        if body is None:
            break

        data = body.get("response", {}).get("data", [])
        total = int(body.get("response", {}).get("total", 0))

        if not data:
            print("no data")
            break

        for record in data:
            value = record.get("value")
            if value is None:
                continue
            rows.append({
                "period": record["period"] + ":00:00Z",  # Normalize to ISO 8601
                "region": region,
                "demand_mw": float(value),
            })

        print(f"got {len(data)} rows (total={total})")
        offset += page_size

        if offset >= total:
            break

    return rows


def upsert_rows(conn: sqlite3.Connection, rows: list[dict]) -> int:
    """Insert rows into SQLite, replacing on conflict."""
    if not rows:
        return 0

    conn.executemany(
        """
        INSERT INTO demand (period, region, demand_mw)
        VALUES (:period, :region, :demand_mw)
        ON CONFLICT(period, region) DO UPDATE SET
            demand_mw = excluded.demand_mw,
            ingested_at = datetime('now')
        """,
        rows,
    )
    conn.commit()
    return len(rows)


def main():
    parser = argparse.ArgumentParser(description="Ingest EIA-930 hourly demand data")
    parser.add_argument("--days", type=int, default=7, help="Days to fetch for incremental ingest (default: 7)")
    parser.add_argument("--backfill-days", type=int, default=90, help="Days to fetch for new/sparse regions (default: 90)")
    parser.add_argument("--backfill-threshold", type=int, default=240, help="Row count below which a region triggers backfill (default: 240, matches train.py minimum)")
    parser.add_argument("--region", type=str, default=None, help="Single region code (default: all)")
    parser.add_argument("--db", type=str, default=None, help="Database path (default: data/gridpulse.db)")
    args = parser.parse_args()

    db_path = Path(args.db) if args.db else DB_PATH
    regions = {args.region: REGIONS.get(args.region, args.region)} if args.region else REGIONS

    now = datetime.now(timezone.utc)
    end = now.strftime("%Y-%m-%dT%H")

    print(f"GridPulse Ingestion")
    print(f"  Database: {db_path}")
    print(f"  Regions:  {', '.join(regions.keys())}")
    print(f"  Mode:     per-region (backfill {args.backfill_days}d if <{args.backfill_threshold} rows, else incremental {args.days}d)")
    print()

    conn = init_db(db_path)
    total_rows = 0

    for code, name in regions.items():
        existing = conn.execute("SELECT COUNT(*) FROM demand WHERE region=?", (code,)).fetchone()[0]
        days = args.backfill_days if existing < args.backfill_threshold else args.days
        start = (now - timedelta(days=days)).strftime("%Y-%m-%dT%H")

        mode = "BACKFILL" if days == args.backfill_days and existing < args.backfill_threshold else "incremental"
        print(f"[{name}] existing={existing} rows, fetching {days}d ({mode}) {start} → {end}")
        rows = fetch_demand(code, start, end)
        inserted = upsert_rows(conn, rows)
        total_rows += inserted
        print(f"  → {inserted} rows upserted\n")

    # Print summary
    cursor = conn.execute("SELECT region, COUNT(*), MIN(period), MAX(period) FROM demand GROUP BY region")
    print("Database summary:")
    for row in cursor:
        print(f"  {row[0]}: {row[1]} rows ({row[2]} → {row[3]})")

    conn.close()
    print(f"\nDone. {total_rows} total rows ingested.")


if __name__ == "__main__":
    main()
