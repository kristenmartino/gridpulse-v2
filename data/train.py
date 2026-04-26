"""
GridPulse V2 — XGBoost Demand Forecasting

Trains an XGBoost regressor on hourly demand data from SQLite.
Evaluates on a 7-day holdout and serializes the model + metrics.

Usage:
    python data/train.py                      # Train all regions
    python data/train.py --region ERCO        # Train single region
    python data/train.py --region ERCO --plot # Train + save evaluation plot

Output:
    data/models/<region>_model.json    — XGBoost model (JSON format)
    data/models/<region>_metrics.json  — Evaluation metrics
    data/models/<region>_eval.png      — Actual vs predicted plot (if --plot)
"""

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

# Defer heavy imports to after arg parsing for faster --help
DB_PATH = Path(__file__).parent / "gridpulse.db"
MODELS_DIR = Path(__file__).parent / "models"

REGIONS = ["ERCO", "CISO", "PJM", "MISO", "SWPP", "NYIS", "ISNE"]

# Holdout: last 7 days for test
HOLDOUT_HOURS = 168


def load_demand(db_path: Path, region: str) -> list[dict]:
    """Load all demand rows for a region, ordered chronologically."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT period, region, demand_mw FROM demand WHERE region = ? ORDER BY period ASC",
        (region,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def build_features(rows: list[dict]) -> tuple:
    """
    Build feature matrix and target vector from raw demand rows.

    Features per timestep:
      - hour (0-23)
      - day_of_week (0=Mon, 6=Sun)
      - is_weekend (0 or 1)
      - month (1-12)
      - demand_lag_1   (t-1)
      - demand_lag_2   (t-2)
      - demand_lag_3   (t-3)
      - demand_lag_24  (t-24, same hour yesterday)
      - demand_lag_48  (t-48, same hour 2 days ago)
      - demand_lag_168 (t-168, same hour last week)
      - rolling_mean_6   (mean of last 6h)
      - rolling_mean_24  (mean of last 24h)
      - rolling_mean_168 (mean of last 168h / 7 days)
      - rolling_std_24   (std of last 24h)
      - demand_diff_1    (change from t-1)
      - demand_diff_24   (change from t-24)

    Returns:
      X: numpy array of shape (n_samples, n_features)
      y: numpy array of shape (n_samples,)
      periods: list of period strings for each sample
      feature_names: list of feature name strings
    """
    demands = np.array([r["demand_mw"] for r in rows], dtype=np.float64)
    periods_all = [r["period"] for r in rows]

    feature_names = [
        "hour", "day_of_week", "is_weekend", "month",
        "demand_lag_1", "demand_lag_2", "demand_lag_3",
        "demand_lag_24", "demand_lag_48", "demand_lag_168",
        "rolling_mean_6", "rolling_mean_24", "rolling_mean_168",
        "rolling_std_24",
        "demand_diff_1", "demand_diff_24",
    ]

    # We need at least 168 hours of history for lag_168
    start_idx = 168
    n = len(demands) - start_idx

    if n < HOLDOUT_HOURS + 48:
        raise ValueError(
            f"Not enough data: {len(demands)} rows, need at least "
            f"{start_idx + HOLDOUT_HOURS + 48} for training + holdout"
        )

    X = np.zeros((n, len(feature_names)), dtype=np.float64)
    y = np.zeros(n, dtype=np.float64)
    periods = []

    for i in range(n):
        idx = start_idx + i
        dt = datetime.fromisoformat(periods_all[idx].replace("Z", "+00:00"))

        # Calendar features
        X[i, 0] = dt.hour
        X[i, 1] = dt.weekday()
        X[i, 2] = 1.0 if dt.weekday() >= 5 else 0.0
        X[i, 3] = dt.month

        # Lag features
        X[i, 4] = demands[idx - 1]
        X[i, 5] = demands[idx - 2]
        X[i, 6] = demands[idx - 3]
        X[i, 7] = demands[idx - 24]
        X[i, 8] = demands[idx - 48]
        X[i, 9] = demands[idx - 168]

        # Rolling statistics
        X[i, 10] = demands[idx - 6:idx].mean()
        X[i, 11] = demands[idx - 24:idx].mean()
        X[i, 12] = demands[idx - 168:idx].mean()
        X[i, 13] = demands[idx - 24:idx].std()

        # Differencing
        X[i, 14] = demands[idx - 1] - demands[idx - 2]  # recent change
        X[i, 15] = demands[idx - 1] - demands[idx - 25]  # day-over-day at lag

        y[i] = demands[idx]
        periods.append(periods_all[idx])

    return X, y, periods, feature_names


def train_and_evaluate(
    X: np.ndarray,
    y: np.ndarray,
    periods: list[str],
    feature_names: list[str],
    region: str,
    save_plot: bool = False,
) -> dict:
    """
    Train XGBoost on train split, evaluate on holdout.

    Returns dict with metrics and feature importances.
    """
    import xgboost as xgb
    from sklearn.metrics import (
        mean_absolute_error,
        mean_absolute_percentage_error,
        mean_squared_error,
        r2_score,
    )

    # Split: last HOLDOUT_HOURS for test
    split = len(X) - HOLDOUT_HOURS
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    periods_test = periods[split:]

    print(f"  Train: {split} samples ({periods[0]} → {periods[split-1]})")
    print(f"  Test:  {HOLDOUT_HOURS} samples ({periods[split]} → {periods[-1]})")

    # Train XGBoost
    model = xgb.XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=20,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Predict
    y_pred = model.predict(X_test)

    # Metrics
    mape = mean_absolute_percentage_error(y_test, y_pred) * 100
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\n  Evaluation on 7-day holdout:")
    print(f"    MAPE:  {mape:.2f}%")
    print(f"    RMSE:  {rmse:.0f} MW")
    print(f"    MAE:   {mae:.0f} MW")
    print(f"    R²:    {r2:.4f}")

    # Feature importances
    importances = dict(zip(feature_names, model.feature_importances_.tolist()))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)

    print(f"\n  Feature Importance (top 8):")
    for name, imp in sorted_imp[:8]:
        bar = "█" * int(imp * 50)
        print(f"    {name:20s} {imp:.3f} {bar}")

    # Save model
    MODELS_DIR.mkdir(exist_ok=True)
    model_path = MODELS_DIR / f"{region}_model.json"
    model.save_model(str(model_path))
    print(f"\n  Model saved: {model_path}")

    # Save metrics
    metrics = {
        "region": region,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "train_samples": split,
        "test_samples": HOLDOUT_HOURS,
        "train_period": {"start": periods[0], "end": periods[split - 1]},
        "test_period": {"start": periods[split], "end": periods[-1]},
        "metrics": {
            "mape_pct": round(mape, 2),
            "rmse_mw": round(rmse, 1),
            "mae_mw": round(mae, 1),
            "r2": round(r2, 4),
        },
        "feature_importances": {k: round(v, 4) for k, v in sorted_imp},
        "best_iteration": model.best_iteration,
        "n_estimators_used": model.best_iteration + 1,
        "hyperparameters": {
            "n_estimators": 500,
            "max_depth": 6,
            "learning_rate": 0.05,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
            "min_child_weight": 5,
        },
    }

    metrics_path = MODELS_DIR / f"{region}_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved: {metrics_path}")

    # Optional plot
    if save_plot:
        try:
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt
            import matplotlib.dates as mdates

            dates_test = [
                datetime.fromisoformat(p.replace("Z", "+00:00"))
                for p in periods_test
            ]

            fig, axes = plt.subplots(2, 1, figsize=(14, 8), gridspec_kw={"height_ratios": [3, 1]})
            fig.suptitle(f"GridPulse — {region} Demand Forecast Evaluation", fontsize=14, fontweight="bold")

            # Top: actual vs predicted
            ax1 = axes[0]
            ax1.plot(dates_test, y_test, color="#3b82f6", linewidth=1.2, label="Actual", alpha=0.9)
            ax1.plot(dates_test, y_pred, color="#f97316", linewidth=1.2, label="Predicted", alpha=0.9)
            ax1.fill_between(dates_test, y_test, y_pred, alpha=0.15, color="#f97316")
            ax1.set_ylabel("Demand (MW)")
            ax1.legend(loc="upper right")
            ax1.set_title(f"MAPE: {mape:.2f}%  |  RMSE: {rmse:.0f} MW  |  R²: {r2:.4f}", fontsize=10, color="#666")
            ax1.grid(True, alpha=0.3)
            ax1.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
            ax1.xaxis.set_major_locator(mdates.DayLocator())

            # Bottom: residuals
            ax2 = axes[1]
            residuals = y_test - y_pred
            ax2.bar(dates_test, residuals, width=0.04, color=["#ef4444" if r < 0 else "#22c55e" for r in residuals], alpha=0.7)
            ax2.axhline(0, color="#666", linewidth=0.5)
            ax2.set_ylabel("Error (MW)")
            ax2.set_xlabel("Date")
            ax2.grid(True, alpha=0.3)
            ax2.xaxis.set_major_formatter(mdates.DateFormatter("%b %d"))
            ax2.xaxis.set_major_locator(mdates.DayLocator())

            plt.tight_layout()
            plot_path = MODELS_DIR / f"{region}_eval.png"
            plt.savefig(plot_path, dpi=150, bbox_inches="tight")
            plt.close()
            print(f"  Plot saved: {plot_path}")
        except ImportError:
            print("  (matplotlib not available, skipping plot)")

    # Save test predictions for serving
    predictions = []
    for i, period in enumerate(periods_test):
        predictions.append({
            "period": period,
            "actual_mw": round(float(y_test[i]), 1),
            "predicted_mw": round(float(y_pred[i]), 1),
            "error_mw": round(float(y_test[i] - y_pred[i]), 1),
            "error_pct": round(abs(float(y_test[i] - y_pred[i])) / float(y_test[i]) * 100, 2),
        })

    preds_path = MODELS_DIR / f"{region}_predictions.json"
    with open(preds_path, "w") as f:
        json.dump(predictions, f, indent=2)
    print(f"  Predictions saved: {preds_path}")

    return metrics


def generate_forecast(region: str, hours: int = 24) -> list[dict]:
    """
    Generate a forward forecast using the trained model.
    Uses recursive prediction: predict t+1, feed it back as lag for t+2, etc.

    Returns list of {period, forecast_mw, ci_lower, ci_upper} dicts.
    """
    import xgboost as xgb

    model_path = MODELS_DIR / f"{region}_model.json"
    metrics_path = MODELS_DIR / f"{region}_metrics.json"

    if not model_path.exists():
        raise FileNotFoundError(f"No trained model for {region}. Run train first.")

    model = xgb.XGBRegressor()
    model.load_model(str(model_path))

    with open(metrics_path) as f:
        metrics = json.load(f)
    rmse = metrics["metrics"]["rmse_mw"]

    # Load recent demand for lag computation
    rows = load_demand(DB_PATH, region)
    demands = [r["demand_mw"] for r in rows]
    periods = [r["period"] for r in rows]

    if len(demands) < 168:
        raise ValueError(f"Need at least 168 hours of history, have {len(demands)}")

    # Extend demands array as we forecast
    forecast_demands = list(demands)
    last_period = datetime.fromisoformat(periods[-1].replace("Z", "+00:00"))

    forecasts = []

    for step in range(hours):
        from datetime import timedelta
        forecast_dt = last_period + timedelta(hours=step + 1)
        idx = len(forecast_demands)

        # Build single-row feature vector
        arr = np.array(forecast_demands, dtype=np.float64)

        features = np.zeros((1, 16), dtype=np.float64)
        features[0, 0] = forecast_dt.hour
        features[0, 1] = forecast_dt.weekday()
        features[0, 2] = 1.0 if forecast_dt.weekday() >= 5 else 0.0
        features[0, 3] = forecast_dt.month
        features[0, 4] = arr[-1]            # lag_1
        features[0, 5] = arr[-2]            # lag_2
        features[0, 6] = arr[-3]            # lag_3
        features[0, 7] = arr[-24]           # lag_24
        features[0, 8] = arr[-48]           # lag_48
        features[0, 9] = arr[-168]          # lag_168
        features[0, 10] = arr[-6:].mean()   # rolling_mean_6
        features[0, 11] = arr[-24:].mean()  # rolling_mean_24
        features[0, 12] = arr[-168:].mean() # rolling_mean_168
        features[0, 13] = arr[-24:].std()   # rolling_std_24
        features[0, 14] = arr[-1] - arr[-2] # diff_1
        features[0, 15] = arr[-1] - arr[-25] # diff_24

        pred = float(model.predict(features)[0])
        forecast_demands.append(pred)

        # Confidence interval widens with forecast horizon
        ci_scale = 1.0 + (step * 0.15)  # grows 15% per hour
        ci = rmse * 1.96 * ci_scale

        forecasts.append({
            "period": forecast_dt.strftime("%Y-%m-%dT%H:00:00Z"),
            "forecast_mw": round(pred, 1),
            "ci_lower": round(pred - ci, 1),
            "ci_upper": round(pred + ci, 1),
        })

    # Save forecast
    forecast_path = MODELS_DIR / f"{region}_forecast.json"
    with open(forecast_path, "w") as f:
        json.dump({
            "region": region,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "horizon_hours": hours,
            "base_rmse_mw": round(rmse, 1),
            "forecasts": forecasts,
        }, f, indent=2)
    print(f"  Forecast saved: {forecast_path}")

    return forecasts


def main():
    parser = argparse.ArgumentParser(description="Train demand forecast models")
    parser.add_argument("--region", type=str, default=None, help="Single region (default: all)")
    parser.add_argument("--db", type=str, default=None, help="Database path")
    parser.add_argument("--plot", action="store_true", help="Save evaluation plots")
    parser.add_argument("--forecast", type=int, default=24, help="Generate N-hour forecast after training (default: 24)")
    args = parser.parse_args()

    global DB_PATH
    if args.db:
        DB_PATH = Path(args.db)

    regions = [args.region] if args.region else REGIONS

    print("GridPulse Model Training")
    print(f"  Database: {DB_PATH}")
    print(f"  Regions:  {', '.join(regions)}")
    print()

    for region in regions:
        print(f"{'='*60}")
        print(f"  {region}")
        print(f"{'='*60}")

        # Load data
        rows = load_demand(DB_PATH, region)
        if not rows:
            print(f"  SKIP: No data available for {region}")
            continue
        print(f"  Loaded {len(rows)} rows ({rows[0]['period']} → {rows[-1]['period']})")

        if len(rows) < 168 + HOLDOUT_HOURS + 48:
            print(f"  SKIP: Not enough data (need {168 + HOLDOUT_HOURS + 48}, have {len(rows)})")
            continue

        # Build features
        X, y, periods, feature_names = build_features(rows)
        print(f"  Features: {X.shape[1]}, Samples: {X.shape[0]}")

        # Train and evaluate
        metrics = train_and_evaluate(X, y, periods, feature_names, region, save_plot=args.plot)

        # Generate forward forecast
        if args.forecast > 0:
            print(f"\n  Generating {args.forecast}h forecast...")
            forecasts = generate_forecast(region, args.forecast)
            print(f"  Forecast: {forecasts[0]['period']} → {forecasts[-1]['period']}")
            print(f"  Range: {forecasts[0]['forecast_mw']:.0f} → peak ~{max(f['forecast_mw'] for f in forecasts):.0f} MW")

        print()

    print("Done.")


if __name__ == "__main__":
    main()
