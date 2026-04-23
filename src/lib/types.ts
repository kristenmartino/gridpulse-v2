export interface DemandRow {
  period: string;       // ISO 8601: "2025-04-21T00:00:00Z"
  region: string;       // Balancing authority code: "ERCO"
  demand_mw: number;    // Hourly demand in MW
}

export interface DemandAPIResponse {
  region: string;
  region_name: string;
  rows: DemandRow[];
  count: number;
  last_updated: string;
}

export const REGIONS = {
  ERCO: "ERCOT (Texas)",
  CISO: "CAISO (California)",
  PJM: "PJM (Mid-Atlantic)",
  MISO: "MISO (Midwest)",
} as const;

export type RegionCode = keyof typeof REGIONS;
