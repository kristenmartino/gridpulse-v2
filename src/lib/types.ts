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
  SWPP: "SPP (Central Plains)",
  NYIS: "NYISO (New York)",
  ISNE: "ISO-NE (New England)",
} as const;

export type RegionCode = keyof typeof REGIONS;

// Visual grouping for the region picker. Each region maps to one category;
// CATEGORY_ORDER controls the rendering order of groups. Empty groups are
// hidden, so it's safe to declare future categories ahead of their regions.
export const CATEGORY_ORDER = ["Organized markets", "Southeast", "West"] as const;
export type RegionCategory = (typeof CATEGORY_ORDER)[number];

export const REGION_CATEGORIES: Record<RegionCode, RegionCategory> = {
  ERCO: "Organized markets",
  CISO: "Organized markets",
  PJM:  "Organized markets",
  MISO: "Organized markets",
  SWPP: "Organized markets",
  NYIS: "Organized markets",
  ISNE: "Organized markets",
};

export interface ForecastPoint {
  period: string;
  forecast_mw: number;
  ci_lower: number;
  ci_upper: number;
}

export interface ForecastAPIResponse {
  region: string;
  generated_at: string;
  horizon_hours: number;
  base_rmse_mw: number;
  forecasts: ForecastPoint[];
}

export interface ModelMetrics {
  region: string;
  trained_at: string;
  train_samples: number;
  test_samples: number;
  train_period: { start: string; end: string };
  test_period: { start: string; end: string };
  metrics: {
    mape_pct: number;
    rmse_mw: number;
    mae_mw: number;
    r2: number;
  };
  feature_importances: Record<string, number>;
  best_iteration: number;
  n_estimators_used: number;
}
