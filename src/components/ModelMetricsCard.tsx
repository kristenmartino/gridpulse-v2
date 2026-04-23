"use client";

import type { ModelMetrics } from "@/lib/types";

interface ModelMetricsCardProps {
  metrics: ModelMetrics | null;
}

export default function ModelMetricsCard({ metrics }: ModelMetricsCardProps) {
  if (!metrics) return null;

  const m = metrics.metrics;

  const items = [
    { label: "MAPE", value: `${m.mape_pct}%`, good: m.mape_pct < 2 },
    { label: "RMSE", value: `${m.rmse_mw.toLocaleString()}`, unit: "MW" },
    { label: "MAE", value: `${m.mae_mw.toLocaleString()}`, unit: "MW" },
    { label: "R\u00b2", value: m.r2.toFixed(4), good: m.r2 > 0.95 },
  ];

  return (
    <div className="flex items-center justify-between border-t border-b border-[var(--border)] py-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          Model
        </span>
        <span className="rounded bg-[var(--bg-raised)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-tertiary)]">
          XGBoost
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          {metrics.n_estimators_used} trees &middot; {metrics.train_samples} training hours
        </span>
      </div>

      <div className="flex items-center gap-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              {item.label}
            </span>
            <span
              className={`tabular text-xs font-semibold ${
                item.good ? "text-[var(--positive)]" : "text-[var(--text-secondary)]"
              }`}
            >
              {item.value}
            </span>
            {item.unit && (
              <span className="text-[10px] text-[var(--text-muted)]">{item.unit}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
