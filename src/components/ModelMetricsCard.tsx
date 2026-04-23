"use client";

import type { ModelMetrics } from "@/lib/types";

interface ModelMetricsCardProps {
  metrics: ModelMetrics | null;
}

export default function ModelMetricsCard({ metrics }: ModelMetricsCardProps) {
  if (!metrics) return null;

  const m = metrics.metrics;
  const trainedDate = new Date(metrics.trained_at);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          XGBoost Model Performance
        </p>
        <p className="text-[10px] text-zinc-600">
          Trained {trainedDate.toLocaleDateString()} on {metrics.train_samples} samples
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">MAPE</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">
            {m.mape_pct}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">RMSE</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-200">
            {m.rmse_mw.toLocaleString()} MW
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">MAE</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-200">
            {m.mae_mw.toLocaleString()} MW
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">R&sup2;</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-200">
            {m.r2.toFixed(4)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-600">
        Evaluated on {metrics.test_samples}-hour holdout ({metrics.test_period.start.slice(0, 10)} to {metrics.test_period.end.slice(0, 10)})
      </p>
    </div>
  );
}
