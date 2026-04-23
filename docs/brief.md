# GridPulse V2 — Project Brief

## Problem Statement

Grid operators and energy analysts need short-term demand forecasts to make
reliability decisions, but existing tools either require institutional access
(proprietary ISO portals) or present raw data without interpretation. There is
no lightweight, publicly accessible tool that takes real grid telemetry, runs a
transparent forecasting model against it, and presents the result as a clear
narrative a human can act on.

GridPulse answers one question:
**"What will electricity demand look like in the next 24 hours for this region,
and how confident should I be in that forecast?"**

## User

A single persona: **Grid Analyst** — someone who monitors regional electricity
demand and needs to understand near-term load trajectories. They care about:

- Current demand vs. historical pattern
- Forecast accuracy (MAPE, confidence intervals)
- Anomaly detection (is today unusual?)

They do not need: portfolio trading tools, renewable dispatch optimization,
multi-model comparison dashboards, or executive briefing generators.

## Core Interaction

1. User selects a region (start with ERCOT, expand to 3-4 ISOs max)
2. Dashboard shows **actual demand** (last 7 days from EIA-930) plotted against
   **model forecast** (next 24h)
3. Key metrics displayed: current load, peak forecast, forecast MAPE on
   trailing validation window, confidence band
4. One insight card: a single sentence describing what the model sees
   ("Demand is tracking 4.2% above the 30-day average; forecast expects
   peak at 62,400 MW around 16:00 CT")

That's the whole product. One region, one model, one chart, one insight.

## Data

| Source | What | Refresh Rate | Access |
|--------|------|-------------|--------|
| EIA-930 Hourly Grid Monitor | Hourly demand by balancing authority | ~1h lag | Public API, no key required |
| NOAA RTMA / GFS | Temperature actuals + 24h forecast | Hourly | Public, free |

**Pipeline:**
```
EIA-930 API → Python ingestion script → SQLite (local) / Turso (prod)
    → Next.js API route → Client chart
```

**Model:**
- Algorithm: XGBoost regression (or LightGBM) on tabular features
- Features: hour-of-day, day-of-week, trailing 24h demand, temperature
  forecast, holiday flag
- Training: Rolling 90-day window, retrained daily
- Evaluation: MAPE on last 7-day holdout, displayed on dashboard
- No pretending: if MAPE is 8%, show 8%. The honesty is the point.

## Non-Goals

These are explicitly out of scope. They may look impressive but they dilute the
story and add complexity without proving engineering skill:

- **Multiple ML models / model comparison** — one model, understood deeply
- **Persona-based views** — one user type, one view
- **Briefing mode / narrative generation** — the chart + one insight card is the
  narrative
- **Scenario sliders / what-if analysis** — we forecast reality, not
  hypotheticals
- **More than 4 regions** — depth over breadth
- **Real-time WebSocket streaming** — hourly refresh is sufficient for this
  domain
- **User accounts / authentication** — public tool, no login

## Success Criteria

A reviewer at a company like Vercel, Stripe, or Anthropic should look at this
and conclude:

1. **Data engineering** — "They built a real pipeline from a public API to a
   database to a frontend. The data is fresh and verifiable."
2. **Applied ML** — "They trained a real model, measured its error honestly, and
   display confidence intervals that mean something."
3. **Design** — "The interface is minimal, intentional, and tells a story. Every
   element earns its space."
4. **Software engineering** — "The code is typed, tested, deployed with CI/CD,
   and handles the obvious failure modes (API down, stale data, model drift)."
5. **Judgment** — "They scoped this tightly. They cut features instead of
   faking them."

## Architecture

```
gridpulse-v2/
├── docs/                   # This brief, ADRs, data dictionary
├── data/
│   ├── ingest.py           # EIA-930 + NOAA fetch → SQLite
│   ├── train.py            # Model training + evaluation
│   └── gridpulse.db        # Local SQLite (gitignored)
├── src/
│   ├── app/                # Next.js app router
│   │   ├── page.tsx        # Dashboard (the one screen)
│   │   └── api/
│   │       ├── demand/     # GET /api/demand?region=ERCOT&hours=168
│   │       └── forecast/   # GET /api/forecast?region=ERCOT
│   ├── components/         # React components
│   │   ├── DemandChart.tsx
│   │   ├── InsightCard.tsx
│   │   ├── MetricsBar.tsx
│   │   └── RegionPicker.tsx
│   └── lib/
│       ├── db.ts           # SQLite/Turso client
│       └── types.ts        # Shared types
├── tests/
│   ├── api/                # API route tests
│   └── data/               # Pipeline tests
├── .github/
│   └── workflows/
│       ├── ci.yml          # Lint + type-check + test
│       └── ingest.yml      # Scheduled data refresh (cron)
├── next.config.ts
├── tsconfig.json
├── pyproject.toml          # Python deps (uv/pip)
└── package.json
```

## Stack Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js 14 (App Router) + TypeScript | SSR for initial load, API routes colocated, Vercel-native |
| Charts | D3.js (direct SVG) | Full control over every pixel; no charting library abstractions |
| Database | SQLite (dev) / Turso (prod) | Zero-ops for <100 users, single-file local dev |
| ML | Python + scikit-learn/XGBoost | Industry standard, inspectable, no black boxes |
| Data fetch | Python scripts + GitHub Actions cron | Simple, auditable, free |
| Hosting | Vercel | Automatic preview deploys, edge functions, free tier |
| CI | GitHub Actions | Lint, typecheck, test on every PR |

## Phase Plan

**Phase 1 — Foundation (one working pipeline)**
- [ ] EIA-930 ingestion script (Python) → SQLite
- [ ] One trained XGBoost model on ERCOT demand
- [ ] Next.js project with one API route serving demand data
- [ ] One chart rendering real data with D3
- [ ] Deploy to Vercel

**Phase 2 — Product (the complete story)**
- [ ] Forecast API route (model inference)
- [ ] Confidence intervals on chart
- [ ] Insight card with real narrative
- [ ] MAPE display from actual validation
- [ ] NOAA temperature overlay (if it strengthens the story)
- [ ] 2-3 additional regions
- [ ] Error states and loading states designed intentionally

**Phase 3 — Polish (hiring-ready)**
- [ ] CI pipeline (lint + typecheck + test)
- [ ] GitHub Actions cron for daily ingest + retrain
- [ ] Responsive design (mobile)
- [ ] Lighthouse 95+ scores
- [ ] README that explains decisions, not just setup
- [ ] One ADR documenting a real tradeoff you made
