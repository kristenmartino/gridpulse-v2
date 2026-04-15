/* ═══════════════════════════════════════════════════════════
   GridPulse Platform — Interactions, Charts, Tab Management
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const C = {
    bg:       '#0a0a0a',
    s1:       '#111111',
    s2:       '#1a1a1a',
    s3:       '#242424',
    border:   '#333333',
    bsub:     '#1e1e1e',
    tp:       '#f4f4f4',
    ts:       '#c6c6c6',
    tm:       '#6f6f6f',
    accent:   '#4589ff',
    accentH:  '#6ea6ff',
    success:  '#42be65',
    warn:     '#f1c21b',
    danger:   '#fa4d56',
    purple:   '#a56eff',
  };

  // ── Region Data Profiles ────────────────────────────────
  // Each region has distinct demand shape, scale, and gen mix
  const REGIONS = {
    ERCOT:  { base: 48000, amp: 6000, peak: 52140, conf: 94.2, risk: 'Low',  riskDelta: -12, renew: 34.7, wind: 12480, solar: 4560, gas: 0.38, windPct: 0.28, solarPct: 0.12, nucPct: 0.10, otherPct: 0.12, totalGen: 49180, netLoad: 38420, tempBase: 95 },
    CAISO:  { base: 32000, amp: 4500, peak: 36800, conf: 92.8, risk: 'Low',  riskDelta: -8,  renew: 42.3, wind: 5200,  solar: 9800, gas: 0.35, windPct: 0.15, solarPct: 0.28, nucPct: 0.09, otherPct: 0.13, totalGen: 34100, netLoad: 24200, tempBase: 88 },
    PJM:    { base: 72000, amp: 8000, peak: 78400, conf: 93.1, risk: 'Low',  riskDelta: -5,  renew: 18.2, wind: 6800,  solar: 3200, gas: 0.42, windPct: 0.10, solarPct: 0.08, nucPct: 0.32, otherPct: 0.08, totalGen: 74500, netLoad: 65400, tempBase: 82 },
    MISO:   { base: 62000, amp: 7000, peak: 67500, conf: 91.4, risk: 'Moderate', riskDelta: 3, renew: 26.8, wind: 14200, solar: 2100, gas: 0.36, windPct: 0.22, solarPct: 0.05, nucPct: 0.18, otherPct: 0.19, totalGen: 64300, netLoad: 51800, tempBase: 85 },
    NYISO:  { base: 22000, amp: 3500, peak: 24800, conf: 95.6, risk: 'Low',  riskDelta: -15, renew: 22.1, wind: 2800,  solar: 1600, gas: 0.48, windPct: 0.12, solarPct: 0.10, nucPct: 0.25, otherPct: 0.05, totalGen: 23400, netLoad: 19200, tempBase: 78 },
    FPL:    { base: 46000, amp: 5500, peak: 50200, conf: 94.8, risk: 'Low',  riskDelta: -10, renew: 19.4, wind: 280,   solar: 7800, gas: 0.52, windPct: 0.01, solarPct: 0.18, nucPct: 0.22, otherPct: 0.07, totalGen: 47600, netLoad: 40100, tempBase: 92 },
    SPP:    { base: 34000, amp: 5000, peak: 38100, conf: 90.2, risk: 'Moderate', riskDelta: 6, renew: 38.9, wind: 12600, solar: 1800, gas: 0.32, windPct: 0.36, solarPct: 0.04, nucPct: 0.08, otherPct: 0.20, totalGen: 35800, netLoad: 24600, tempBase: 90 },
    'ISO-NE': { base: 16000, amp: 2800, peak: 18200, conf: 96.1, risk: 'Low', riskDelta: -18, renew: 16.8, wind: 1400, solar: 1200, gas: 0.50, windPct: 0.08, solarPct: 0.09, nucPct: 0.28, otherPct: 0.05, totalGen: 17100, netLoad: 14800, tempBase: 75 },
  };

  let currentRegion = 'FPL';
  let currentHorizon = '24h';
  let currentModel = 'Ensemble';

  function getRegion() { return REGIONS[currentRegion]; }

  // ── Model Profiles ─────────────────────────────────────
  // Each model has distinct forecast behavior:
  //   seedOff  – seed offset for unique random path
  //   ampMul   – amplitude scaling (how reactive to peaks)
  //   freqMul  – frequency shift (phase behavior)
  //   noiseMul – noise level (forecast jitter)
  //   biasPct  – systematic bias as % of base demand
  //   ciWidth  – confidence interval width multiplier
  //   color    – line color
  const MODEL_PROFILES = {
    Ensemble: { seedOff: 10, ampMul: 1.05, freqMul: 2.2, noiseMul: 0.10, biasPct: 0.02,  ciWidth: 1.0, color: C.accent },
    XGBoost:  { seedOff: 20, ampMul: 1.12, freqMul: 2.3, noiseMul: 0.08, biasPct: 0.015, ciWidth: 0.85, color: C.success },
    Prophet:  { seedOff: 30, ampMul: 0.95, freqMul: 1.9, noiseMul: 0.14, biasPct: 0.035, ciWidth: 1.3, color: C.warn },
    SARIMAX:  { seedOff: 40, ampMul: 1.00, freqMul: 2.0, noiseMul: 0.18, biasPct: 0.045, ciWidth: 1.5, color: C.purple },
  };

  // ── Tab Navigation ──────────────────────────────────────
  const tabBtns = document.querySelectorAll('[data-tab]');
  const panels  = document.querySelectorAll('.tab-panel');
  const topTitle = document.getElementById('topbar-title');
  const topBreadcrumb = document.getElementById('topbar-breadcrumb');

  const breadcrumbs = {
    overview:  'Mission Control',
    forecast:  'Demand Outlook',
    risk:      'Operational Risk',
    grid:      'Generation & Net Load',
    scenarios: 'What-If Analysis',
    models:    'Performance & Validation',
    briefings: 'Intelligence Reports',
  };

  function switchTab(tabId) {
    tabBtns.forEach(b => b.classList.toggle('sidebar__link--active', b.dataset.tab === tabId));
    panels.forEach(p => {
      p.classList.toggle('tab-panel--active', p.id === 'panel-' + tabId);
    });
    topTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
    topBreadcrumb.textContent = breadcrumbs[tabId] || '';
    requestAnimationFrame(() => renderChartsForTab(tabId));
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Sidebar Toggle (mobile) ─────────────────────────────
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 900) sidebar.classList.remove('open');
      });
    });
  }

  // ── Region Dropdown ─────────────────────────────────────
  const regionSelect = document.getElementById('region-select');
  regionSelect.addEventListener('change', () => {
    currentRegion = regionSelect.value;
    updateKPIs();
    refreshAllCharts();
  });

  // ── Persona Dropdown ──────────────────────────────────
  let currentPersona = 'ops';

  // KPI label sets per persona for the Overview tab
  const PERSONA_KPI_LABELS = {
    ops:        ['Current Demand',   'Peak Forecast',   'Forecast Confidence', 'Risk Level',    'Renewable Share'],
    renewables: ['System Demand',    'Peak Forecast',   'Renewable Output',    'Curtailment',   'Renewable Share'],
    trader:     ['Spot Demand',      'Peak Forecast',   'Position Confidence', 'Market Risk',   'Renewable Impact'],
    data:       ['Demand (MW)',      'Peak Predicted',  'Model Confidence',    'Anomaly Score', 'Feature: Renew%'],
  };

  // KPI label sets per persona for the Forecast tab
  const PERSONA_FORECAST_LABELS = {
    ops:        ['24h Peak', '48h Peak', '72h Peak', 'Confidence', 'Primary Driver'],
    renewables: ['24h Peak', '48h Peak', '72h Peak', 'Confidence', 'Wind/Solar Driver'],
    trader:     ['24h Peak', '48h Peak', '72h Peak', 'Spread Conf', 'Price Driver'],
    data:       ['24h Pred', '48h Pred', '72h Pred', 'CI Width',   'Top Feature'],
  };

  const personaSelect = document.getElementById('persona-select');
  personaSelect.addEventListener('change', () => {
    currentPersona = personaSelect.value;
    applyPersona();
  });

  function applyPersona() {
    // 1. Show/hide sidebar tabs
    tabBtns.forEach(btn => {
      const allowed = (btn.dataset.persona || '').split(' ');
      btn.style.display = allowed.includes(currentPersona) ? '' : 'none';
    });

    // 2. If current active tab is now hidden, switch to overview
    const activeBtn = document.querySelector('.sidebar__link--active');
    if (activeBtn && activeBtn.style.display === 'none') {
      switchTab('overview');
    }

    // 3. Show/hide overview cards
    const overviewCards = document.querySelectorAll('#panel-overview .overview-grid > .card');
    overviewCards.forEach(card => {
      const allowed = (card.dataset.persona || '').split(' ');
      if (!card.dataset.persona) {
        card.style.display = '';
      } else {
        card.style.display = allowed.includes(currentPersona) ? '' : 'none';
      }
    });

    // 4. Relabel overview KPIs
    const labels = PERSONA_KPI_LABELS[currentPersona];
    if (labels) {
      const kpis = document.querySelectorAll('#panel-overview .kpi');
      labels.forEach((lbl, i) => {
        if (kpis[i]) {
          const el = kpis[i].querySelector('.kpi__label');
          if (el) el.textContent = lbl;
        }
      });
    }

    // 5. Relabel forecast KPIs
    const fLabels = PERSONA_FORECAST_LABELS[currentPersona];
    if (fLabels) {
      const fKpis = document.querySelectorAll('#panel-forecast .kpi');
      fLabels.forEach((lbl, i) => {
        if (fKpis[i]) {
          const el = fKpis[i].querySelector('.kpi__label');
          if (el) el.textContent = lbl;
        }
      });
    }

    // 6. Re-render visible charts (in case cards were hidden/shown)
    refreshAllCharts();
  }

  // ── Briefing Mode ──────────────────────────────────────
  const briefingOverlay = document.getElementById('briefing-overlay');
  const briefingBtn = document.getElementById('briefing-mode-btn');
  const briefingClose = document.getElementById('briefing-close');
  const briefingBody = document.getElementById('briefing-body');
  const briefingRegion = document.getElementById('briefing-region');
  const briefingTimestamp = document.getElementById('briefing-timestamp');

  let briefingActive = false;

  function toggleBriefing() {
    briefingActive = !briefingActive;
    if (briefingActive) {
      generateBriefingContent();
      briefingOverlay.classList.add('briefing-overlay--active');
      briefingBtn.textContent = 'Exit Briefing';
      briefingBtn.style.background = 'var(--accent)';
      briefingBtn.style.color = 'var(--bg)';
      briefingBtn.style.borderColor = 'var(--accent)';
      document.body.style.overflow = 'hidden';
    } else {
      briefingOverlay.classList.remove('briefing-overlay--active');
      briefingBtn.textContent = 'Briefing Mode';
      briefingBtn.style.background = '';
      briefingBtn.style.color = '';
      briefingBtn.style.borderColor = '';
      document.body.style.overflow = '';
    }
  }

  briefingBtn.addEventListener('click', toggleBriefing);
  briefingClose.addEventListener('click', toggleBriefing);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && briefingActive) toggleBriefing();
  });

  function generateBriefingContent() {
    const r = getRegion();
    const region = currentRegion;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    briefingRegion.textContent = region;
    briefingTimestamp.textContent = dateStr + ' — ' + timeStr;

    // Derived values
    const peakStr = Math.round(r.peak).toLocaleString();
    const baseStr = Math.round(r.base).toLocaleString();
    const totalGenStr = Math.round(r.totalGen).toLocaleString();
    const netLoadStr = Math.round(r.netLoad).toLocaleString();
    const windStr = Math.round(r.wind).toLocaleString();
    const solarStr = Math.round(r.solar).toLocaleString();
    const confStr = r.conf.toFixed(1);
    const riskDir = r.riskDelta <= 0 ? 'down' : 'up';
    const riskDeltaAbs = Math.abs(r.riskDelta);
    const riskWord = r.risk;
    const gasPct = Math.round(r.gas * 100);
    const windPct = Math.round(r.windPct * 100);
    const solarPct = Math.round(r.solarPct * 100);
    const nucPct = Math.round(r.nucPct * 100);
    const capacityMargin = ((r.totalGen - r.base) / r.totalGen * 100).toFixed(1);

    // Determine top renewable source
    const topRenewable = r.windPct > r.solarPct ? 'wind' : 'solar';
    const topRenewMW = topRenewable === 'wind' ? windStr : solarStr;
    const topRenewPct = topRenewable === 'wind' ? windPct : solarPct;

    // Stability assessment
    const stability = r.conf > 94 ? 'High' : r.conf > 90 ? 'Moderate' : 'Low';

    // Ensemble MAPE (deterministic from region)
    const rng = seededRand(regionSeed() + 2000);
    const ensembleMape = (2.5 + rng() * 1.2).toFixed(2);
    const xgbMape = (ensembleMape * 1.08 + rng() * 0.3).toFixed(2);
    const bestModel = parseFloat(xgbMape) < parseFloat(ensembleMape) ? 'XGBoost' : 'Ensemble';
    const bestMape = parseFloat(xgbMape) < parseFloat(ensembleMape) ? xgbMape : ensembleMape;

    briefingBody.innerHTML = ''
      // KPI snapshot
      + '<div class="bo-section">'
      + '  <div class="bo-kpi-row">'
      + '    <div class="bo-kpi"><span class="bo-kpi__label">Current Demand</span><span class="bo-kpi__value">' + baseStr + ' <small>MW</small></span></div>'
      + '    <div class="bo-kpi"><span class="bo-kpi__label">Peak Forecast</span><span class="bo-kpi__value">' + peakStr + ' <small>MW</small></span></div>'
      + '    <div class="bo-kpi"><span class="bo-kpi__label">Confidence</span><span class="bo-kpi__value">' + confStr + '<small>%</small></span></div>'
      + '    <div class="bo-kpi"><span class="bo-kpi__label">Risk Level</span><span class="bo-kpi__value">' + riskWord + '</span></div>'
      + '  </div>'
      + '</div>'

      // Executive Summary
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">Executive Summary</h3>'
      + '  <p class="bo-text">'
      +      region + ' region demand is currently at <strong>' + baseStr + ' MW</strong>, '
      +      'with ensemble models projecting a peak of <strong>' + peakStr + ' MW</strong> '
      +      'within the next 24 hours at <strong>' + confStr + '% confidence</strong>. '
      +      'Overall risk level is <strong>' + riskWord + '</strong>, '
      +      riskDir + ' ' + riskDeltaAbs + ' points from the prior period. '
      +      'Renewable penetration stands at <strong>' + r.renew.toFixed(1) + '%</strong> of total generation, '
      +      'with ' + topRenewable + ' contributing the largest share at ' + topRenewMW + ' MW.'
      + '  </p>'
      + '</div>'

      // System Conditions
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">System Conditions</h3>'
      + '  <ul class="bo-list">'
      + '    <li>Total generation capacity: <strong>' + totalGenStr + ' MW</strong> — capacity margin at ' + capacityMargin + '%</li>'
      + '    <li>Net load (demand less renewables): <strong>' + netLoadStr + ' MW</strong></li>'
      + '    <li>Temperature baseline for region: <strong>' + r.tempBase + '°F</strong></li>'
      + '    <li>Wind output: <strong>' + windStr + ' MW</strong> (' + windPct + '% of mix)</li>'
      + '    <li>Solar output: <strong>' + solarStr + ' MW</strong> (' + solarPct + '% of mix)</li>'
      + '  </ul>'
      + '</div>'

      // Generation Mix
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">Generation Mix</h3>'
      + '  <p class="bo-text">'
      +      'The current fuel stack is led by <strong>natural gas at ' + gasPct + '%</strong>, '
      +      'followed by ' + (nucPct > 0 ? 'nuclear at ' + nucPct + '%, ' : '')
      +      'wind at ' + windPct + '%, '
      +      'solar at ' + solarPct + '%, '
      +      'and other sources at ' + Math.round(r.otherPct * 100) + '%. '
      +      'Total renewable share of <strong>' + r.renew.toFixed(1) + '%</strong> '
      +      (r.renew > 30 ? 'exceeds the regional average, indicating favorable renewable conditions.' : 'is within normal operating ranges for ' + region + '.')
      + '  </p>'
      + '</div>'

      // Risk Assessment
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">Risk Assessment</h3>'
      + '  <p class="bo-text">'
      +      'Overall operational risk is assessed as <strong>' + riskWord + '</strong>'
      +      (r.riskDelta <= 0
          ? ', improving by ' + riskDeltaAbs + ' points versus the prior period. '
          : ', elevated by ' + riskDeltaAbs + ' points versus the prior period. ')
      +      'Forecast stability is <strong>' + stability + '</strong> across all horizons. '
      +      (r.risk === 'Low'
          ? 'No material supply-demand imbalances are anticipated in the near term.'
          : 'Operators should monitor developing conditions, particularly around peak demand windows.')
      + '  </p>'
      + '</div>'

      // Model Performance
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">Model Performance</h3>'
      + '  <p class="bo-text">'
      +      'The <strong>' + bestModel + '</strong> is the top-performing model with a 7-day MAPE of <strong>' + bestMape + '%</strong>. '
      +      'Ensemble MAPE stands at ' + ensembleMape + '%. '
      +      'No model drift has been detected and all models are performing within acceptable thresholds. '
      +      'The most recent training cycle completed on schedule.'
      + '  </p>'
      + '</div>'

      // Recommended Actions
      + '<div class="bo-section">'
      + '  <h3 class="bo-heading">Recommended Actions</h3>'
      + '  <ul class="bo-list">'
      +      (r.risk !== 'Low' ? '<li>Monitor risk conditions closely — risk score is trending ' + riskDir + '</li>' : '')
      + '    <li>Review ' + (r.conf < 93 ? '24h' : '48h') + ' forecast window — confidence ' + (r.conf < 93 ? 'is below 93% and warrants attention' : 'declines slightly beyond 36h') + '</li>'
      + '    <li>' + (r.renew > 35 ? 'High renewable penetration — monitor for curtailment potential during low-demand hours' : 'Renewable output normal — no curtailment concerns at current levels') + '</li>'
      + '    <li>No model interventions required at this time</li>'
      + '  </ul>'
      + '</div>'

      + '<div class="bo-divider"></div>'
      + '<div class="bo-footer">GridPulse Automated Briefing — ' + region + ' — ' + dateStr + '</div>';
  }

  // ── Briefings Tab (region-reactive) ───────────────────
  function updateBriefingsTab() {
    const r = getRegion();
    const region = currentRegion;
    const rng = seededRand(regionSeed() + 3000);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Meta timestamp
    const metaEl = document.getElementById('briefing-tab-meta');
    if (metaEl) metaEl.textContent = 'Generated today at ' + timeStr + ' — ' + region;

    // Derived values
    const peakStr = Math.round(r.peak).toLocaleString();
    const baseStr = Math.round(r.base).toLocaleString();
    const windStr = Math.round(r.wind).toLocaleString();
    const solarStr = Math.round(r.solar).toLocaleString();
    const confStr = r.conf.toFixed(1);
    const riskDeltaAbs = Math.abs(r.riskDelta);
    const riskDir = r.riskDelta <= 0 ? 'down' : 'up';
    const stability = r.conf > 94 ? 'High' : r.conf > 90 ? 'Moderate' : 'Low';
    const capacityMargin = ((r.totalGen - r.base) / r.totalGen * 100).toFixed(1);
    const topRenewable = r.windPct > r.solarPct ? 'wind' : 'solar';
    const topRenewMW = topRenewable === 'wind' ? windStr : solarStr;

    const ensembleMape = (2.5 + rng() * 1.2).toFixed(2);
    const xgbMape = (ensembleMape * 1.08 + rng() * 0.3).toFixed(2);
    const bestModel = parseFloat(xgbMape) < parseFloat(ensembleMape) ? 'XGBoost' : 'Ensemble';
    const bestMape = parseFloat(xgbMape) < parseFloat(ensembleMape) ? xgbMape : ensembleMape;

    // Wind delta for narrative
    const windDelta = Math.round((rng() - 0.4) * r.wind * 0.08);
    const windAbove = windDelta > 0;

    // CDD index (temperature-driven)
    const cddIndex = Math.round((r.tempBase - 65) * 0.8 + rng() * 6);

    // Main briefing body
    const body = document.getElementById('briefing-tab-body');
    if (body) {
      body.innerHTML = ''
        + '<div class="briefing__section">'
        + '  <h4 class="briefing__heading">Executive Summary</h4>'
        + '  <p class="briefing__text">'
        +      region + ' region demand is currently at <strong>' + baseStr + ' MW</strong>, '
        +      'driven primarily by ' + (r.tempBase > 85 ? 'elevated cooling degree days as temperatures remain above seasonal averages' : 'baseline industrial and commercial load patterns') + '. '
        +      'The ensemble forecast projects peak demand of <strong>' + peakStr + ' MW</strong> '
        +      'within the next 24 hours, with <strong>' + confStr + '% confidence</strong>. '
        +      'All models are performing within acceptable MAPE thresholds '
        +      'and no significant drift has been detected.'
        + '  </p>'
        + '</div>'
        + '<div class="briefing__section">'
        + '  <h4 class="briefing__heading">Key Conditions</h4>'
        + '  <ul class="briefing__list">'
        + '    <li>Temperature baseline: ' + r.tempBase + '°F peak, CDD index ' + (cddIndex > 20 ? 'elevated' : 'moderate') + ' at ' + cddIndex + '</li>'
        + '    <li>Wind generation ' + (windAbove ? 'performing above' : 'tracking below') + ' forecast (' + (windDelta >= 0 ? '+' : '') + windDelta + ' MW system-wide)</li>'
        + '    <li>' + (r.solarPct > 0.1 ? 'Solar ramp contributing ' + solarStr + ' MW (' + Math.round(r.solarPct * 100) + '% of mix)' : 'Solar contribution minimal for ' + region + ' (' + solarStr + ' MW)') + '</li>'
        + '    <li>Renewable share at <strong>' + r.renew.toFixed(1) + '%</strong>' + (r.renew > 30 ? ', above regional rolling average' : ', within normal range for ' + region) + '</li>'
        + '  </ul>'
        + '</div>'
        + '<div class="briefing__section">'
        + '  <h4 class="briefing__heading">Risk Assessment</h4>'
        + '  <p class="briefing__text">'
        +      'Overall risk level is <strong>' + r.risk + '</strong>, '
        +      riskDir + ' ' + riskDeltaAbs + ' points from last week. '
        +      (r.risk === 'Low'
            ? 'No material supply-demand imbalances are anticipated. Forecast stability remains <strong>' + stability + '</strong> across all horizons.'
            : 'Operators should monitor developing conditions during peak demand windows. Forecast stability is <strong>' + stability + '</strong>.')
        + '  </p>'
        + '</div>'
        + '<div class="briefing__section">'
        + '  <h4 class="briefing__heading">Model Performance</h4>'
        + '  <p class="briefing__text">'
        +      'The <strong>' + bestModel + '</strong> leads with a 7-day MAPE of ' + bestMape + '%. '
        +      'Ensemble MAPE stands at ' + ensembleMape + '%. No recalibration required at this time. '
        +      'The overnight training cycle completed successfully with no anomalies detected.'
        + '  </p>'
        + '</div>'
        + '<div class="briefing__section">'
        + '  <h4 class="briefing__heading">Recommended Actions</h4>'
        + '  <ul class="briefing__list">'
        +      (r.risk !== 'Low' ? '<li>Monitor risk conditions — risk score trending ' + riskDir + ' by ' + riskDeltaAbs + ' points</li>' : '')
        + '    <li>Review ' + (r.conf < 93 ? '24h' : '48h') + ' forecast window — confidence ' + (r.conf < 93 ? 'is below 93% and warrants attention' : 'declines slightly beyond 36h') + '</li>'
        + '    <li>' + (r.renew > 35 ? 'High renewable penetration (' + r.renew.toFixed(1) + '%) — monitor for curtailment during low-demand hours' : 'Renewable output within normal range — no curtailment concerns') + '</li>'
        + '    <li>No model interventions required</li>'
        + '  </ul>'
        + '</div>';
    }

    // Previous briefings table (seeded history per region)
    const histEl = document.getElementById('briefing-tab-history');
    if (histEl) {
      const today = new Date();
      let html = '<div class="data-table">'
        + '<div class="data-table__row data-table__row--header">'
        + '  <span class="data-table__cell">Date</span>'
        + '  <span class="data-table__cell">Region</span>'
        + '  <span class="data-table__cell">Risk Level</span>'
        + '  <span class="data-table__cell">Peak Forecast</span>'
        + '  <span class="data-table__cell">Confidence</span>'
        + '</div>';

      const histRng = seededRand(regionSeed() + 4000);
      for (let d = 1; d <= 5; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().slice(0, 10);

        const histPeak = Math.round(r.peak * (0.94 + histRng() * 0.12));
        const histConf = (r.conf - 2 + histRng() * 4).toFixed(1);
        const histRisk = histRng() > 0.65 ? 'Moderate' : 'Low';
        const gradeClass = histRisk === 'Low' ? 'grade--a' : 'grade--b';

        html += '<div class="data-table__row">'
          + '<span class="data-table__cell data-table__cell--mono">' + dateStr + '</span>'
          + '<span class="data-table__cell">' + region + '</span>'
          + '<span class="data-table__cell"><span class="grade ' + gradeClass + '">' + histRisk + '</span></span>'
          + '<span class="data-table__cell data-table__cell--mono">' + histPeak.toLocaleString() + ' MW</span>'
          + '<span class="data-table__cell data-table__cell--mono">' + histConf + '%</span>'
          + '</div>';
      }

      html += '</div>';
      histEl.innerHTML = html;
    }
  }

  function updateKPIs() {
    const r = getRegion();
    // Overview KPIs
    const kpis = document.querySelectorAll('#panel-overview .kpi');
    if (kpis.length >= 5) {
      kpis[0].querySelector('.kpi__value').innerHTML = Math.round(r.base).toLocaleString() + ' <small>MW</small>';
      kpis[1].querySelector('.kpi__value').innerHTML = Math.round(r.peak).toLocaleString() + ' <small>MW</small>';
      kpis[2].querySelector('.kpi__value').innerHTML = r.conf.toFixed(1) + '<small>%</small>';
      kpis[3].querySelector('.kpi__value').textContent = r.risk;
      kpis[3].querySelector('.kpi__delta').textContent = (r.riskDelta >= 0 ? '+' : '') + r.riskDelta + ' pts from last week';
      kpis[3].querySelector('.kpi__delta').className = 'kpi__delta ' + (r.riskDelta <= 0 ? 'kpi__delta--down' : 'kpi__delta--up');
      kpis[4].querySelector('.kpi__value').innerHTML = r.renew.toFixed(1) + '<small>%</small>';
    }

    // Forecast KPIs
    const fKpis = document.querySelectorAll('#panel-forecast .kpi');
    if (fKpis.length >= 5) {
      fKpis[0].querySelector('.kpi__value').innerHTML = Math.round(r.peak).toLocaleString() + ' <small>MW</small>';
      fKpis[1].querySelector('.kpi__value').innerHTML = Math.round(r.peak * 1.05).toLocaleString() + ' <small>MW</small>';
      fKpis[2].querySelector('.kpi__value').innerHTML = Math.round(r.peak * 0.98).toLocaleString() + ' <small>MW</small>';
      fKpis[3].querySelector('.kpi__value').innerHTML = r.conf.toFixed(1) + '<small>%</small>';
    }

    // Risk KPIs
    const rKpis = document.querySelectorAll('#panel-risk .kpi');
    if (rKpis.length >= 4) {
      rKpis[0].querySelector('.kpi__value').textContent = r.risk;
    }

    // Grid KPIs
    const gKpis = document.querySelectorAll('#panel-grid .kpi');
    if (gKpis.length >= 5) {
      gKpis[0].querySelector('.kpi__value').innerHTML = (r.totalGen / 1000).toFixed(1).replace(/\.0$/, '') + ',' + String(r.totalGen % 1000).padStart(3, '0').slice(0, 3) + ' <small>MW</small>';
      gKpis[0].querySelector('.kpi__value').innerHTML = Math.round(r.totalGen).toLocaleString() + ' <small>MW</small>';
      gKpis[1].querySelector('.kpi__value').innerHTML = Math.round(r.netLoad).toLocaleString() + ' <small>MW</small>';
      gKpis[2].querySelector('.kpi__value').innerHTML = r.renew.toFixed(1) + '<small>%</small>';
      gKpis[3].querySelector('.kpi__value').innerHTML = Math.round(r.wind).toLocaleString() + ' <small>MW</small>';
      gKpis[4].querySelector('.kpi__value').innerHTML = Math.round(r.solar).toLocaleString() + ' <small>MW</small>';
    }

    // Freshness text with region name
    const freshText = document.querySelector('.topbar__freshness-text');
    if (freshText) freshText.textContent = 'Data fresh — ' + currentRegion + ' — 4 min ago';
  }

  function refreshAllCharts() {
    const activePanel = document.querySelector('.tab-panel--active');
    if (!activePanel) return;
    const tabId = activePanel.id.replace('panel-', '');
    renderChartsForTab(tabId, true);
  }

  // ── Horizon Buttons (24h / 48h / 7d) ───────────────────
  function initHorizonButtons() {
    const demandCard = document.querySelector('#panel-overview .card--wide');
    if (!demandCard) return;
    const btns = demandCard.querySelectorAll('.card__action');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('card__action--active'));
        btn.classList.add('card__action--active');
        currentHorizon = btn.textContent.trim();
        drawDemandChart();
      });
    });
  }

  // ── Model Selection Buttons (Forecast tab) ─────────────
  function initModelButtons() {
    const forecastCard = document.querySelector('#panel-forecast .card--full');
    if (!forecastCard) return;
    const btns = forecastCard.querySelectorAll('.card__action');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('card__action--active'));
        btn.classList.add('card__action--active');
        currentModel = btn.textContent.trim();
        drawForecastMain();
      });
    });
  }

  // ── Chart Rendering ─────────────────────────────────────
  function renderChartsForTab(tabId, force) {
    // always re-render when force (region change)
    switch (tabId) {
      case 'overview':
        drawDemandChart();
        drawWeatherChart();
        drawGenMixChart();
        break;
      case 'forecast':
        drawForecastMain();
        drawConfidenceChart();
        break;
      case 'risk':
        drawRiskTimeline();
        drawAnomalyChart();
        break;
      case 'grid':
        drawGenStack();
        drawFuelDonut();
        drawNetLoad();
        break;
      case 'scenarios':
        drawScenarioChart();
        break;
      case 'models':
        drawModelMape();
        drawShapChart();
        drawResidualsChart();
        drawErrorByHour();
        break;
      case 'briefings':
        updateBriefingsTab();
        break;
    }
  }

  // ── Canvas Helpers ──────────────────────────────────────
  function setupCanvas(id) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    return { ctx, w: rect.width, h: rect.height };
  }

  // Seeded random for region consistency within a render
  function seededRand(seed) {
    let s = seed;
    return function() {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generateSine(n, base, amp, freq, noise, seed) {
    const rng = seed != null ? seededRand(seed) : Math.random.bind(Math);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(base + amp * Math.sin((i / n) * Math.PI * freq) + (rng() - 0.5) * noise);
    }
    return out;
  }

  function regionSeed() {
    let h = 0;
    for (let i = 0; i < currentRegion.length; i++) h = ((h << 5) - h + currentRegion.charCodeAt(i)) | 0;
    return Math.abs(h) + 1;
  }

  function drawLine(ctx, points, x0, y0, w, h, minV, maxV, color, lineWidth, dash) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth || 1.5;
    if (dash) ctx.setLineDash(dash);
    else ctx.setLineDash([]);
    points.forEach((v, i) => {
      const x = x0 + (i / (points.length - 1)) * w;
      const y = y0 + h - ((v - minV) / (maxV - minV)) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawArea(ctx, points, x0, y0, w, h, minV, maxV, color, opacity) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    points.forEach((v, i) => {
      const x = x0 + (i / (points.length - 1)) * w;
      const y = y0 + h - ((v - minV) / (maxV - minV)) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(x0 + w, y0 + h);
    ctx.lineTo(x0, y0 + h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawBand(ctx, upper, lower, x0, y0, w, h, minV, maxV, color, opacity) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    upper.forEach((v, i) => {
      const x = x0 + (i / (upper.length - 1)) * w;
      const y = y0 + h - ((v - minV) / (maxV - minV)) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    for (let i = lower.length - 1; i >= 0; i--) {
      const x = x0 + (i / (lower.length - 1)) * w;
      const y = y0 + h - ((lower[i] - minV) / (maxV - minV)) * h;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawGridLines(ctx, x0, y0, w, h, count, minV, maxV) {
    ctx.strokeStyle = C.bsub;
    ctx.lineWidth = 1;
    ctx.fillStyle = C.tm;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i <= count; i++) {
      const y = y0 + (i / count) * h;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.stroke();
      const val = maxV - (i / count) * (maxV - minV);
      ctx.fillText(Math.round(val).toLocaleString(), x0 - 6, y + 3);
    }
  }

  function drawXLabels(ctx, labels, x0, y0, w, h) {
    ctx.fillStyle = C.tm;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    labels.forEach((label, i) => {
      const x = x0 + (i / (labels.length - 1)) * w;
      ctx.fillText(label, x, y0 + h + 16);
    });
  }

  // ── Chart: Demand (Overview) ────────────────────────────
  function drawDemandChart() {
    const c = setupCanvas('chart-demand');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 50 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const seed = regionSeed();

    let totalHours, forecastHours, xlabels;
    switch (currentHorizon) {
      case '48h':
        totalHours = 72;
        forecastHours = 48;
        xlabels = ['-24h', '-12h', 'Now', '+12h', '+24h', '+36h', '+48h'];
        break;
      case '7d':
        totalHours = 192;
        forecastHours = 168;
        xlabels = ['-24h', 'Now', '+1d', '+2d', '+3d', '+4d', '+5d', '+6d', '+7d'];
        break;
      default: // 24h
        totalHours = 48;
        forecastHours = 24;
        xlabels = ['00:00', '06:00', '12:00', '18:00', '00:00', '06:00', '12:00', '18:00', '24:00'];
        break;
    }

    const historyHours = totalHours - forecastHours;
    const actual   = generateSine(historyHours, r.base, r.amp, 2, r.amp * 0.2, seed);
    const forecast = generateSine(forecastHours, r.base * 1.03, r.amp * 1.1, 2.2, r.amp * 0.12, seed + 100);

    // widen CI for longer horizons
    const ciScale = currentHorizon === '7d' ? 1.6 : currentHorizon === '48h' ? 1.3 : 1;
    const upper = forecast.map((v, i) => v + (r.amp * 0.3 + (i / forecastHours) * r.amp * 0.25) * ciScale);
    const lower = forecast.map((v, i) => v - (r.amp * 0.3 + (i / forecastHours) * r.amp * 0.25) * ciScale);

    const allVals = [...actual, ...forecast, ...upper, ...lower];
    const minV = Math.min(...allVals) - r.amp * 0.15;
    const maxV = Math.max(...allVals) + r.amp * 0.15;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 5, minV, maxV);

    const nowFrac = historyHours / totalHours;
    const forecastX0 = pad.l + nowFrac * cw;
    const forecastW = cw * (1 - nowFrac);

    // confidence band
    drawBand(ctx, upper, lower, forecastX0, pad.t, forecastW, ch, minV, maxV, C.accent, 0.08);

    // actual
    drawLine(ctx, actual, pad.l, pad.t, nowFrac * cw, ch, minV, maxV, C.tm, 1.5, [4, 3]);

    // now marker
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(forecastX0, pad.t); ctx.lineTo(forecastX0, pad.t + ch); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.tm;
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', forecastX0, pad.t - 2);

    // forecast
    drawLine(ctx, forecast, forecastX0, pad.t, forecastW, ch, minV, maxV, C.accent, 2);

    drawXLabels(ctx, xlabels, pad.l, pad.t, cw, ch);
  }

  // ── Chart: Weather Scatter (Overview) ───────────────────
  function drawWeatherChart() {
    const c = setupCanvas('chart-weather');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 50 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const rng = seededRand(regionSeed() + 200);

    const demandMin = r.base - r.amp * 1.2;
    const demandMax = r.base + r.amp * 1.2;
    const tempMin = r.tempBase - 25;
    const tempMax = r.tempBase + 15;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 4, demandMin, demandMax);

    const points = [];
    for (let i = 0; i < 80; i++) {
      const temp = tempMin + rng() * (tempMax - tempMin);
      const demand = r.base - r.amp * 0.5 + ((temp - tempMin) / (tempMax - tempMin)) * r.amp * 1.5 + (rng() - 0.5) * r.amp * 0.6;
      points.push({ temp, demand });
    }

    points.forEach(p => {
      const x = pad.l + ((p.temp - tempMin) / (tempMax - tempMin)) * cw;
      const y = pad.t + ch - ((p.demand - demandMin) / (demandMax - demandMin)) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.5;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // trend line
    ctx.beginPath();
    ctx.strokeStyle = C.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    const trendY0 = pad.t + ch - ((r.base - r.amp * 0.3 - demandMin) / (demandMax - demandMin)) * ch;
    const trendY1 = pad.t + ch - ((r.base + r.amp * 0.5 - demandMin) / (demandMax - demandMin)) * ch;
    ctx.moveTo(pad.l, trendY0);
    ctx.lineTo(pad.l + cw, trendY1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const temps = [Math.round(tempMin) + '\u00B0F', '', Math.round((tempMin + tempMax) / 2) + '\u00B0F', '', Math.round(tempMax) + '\u00B0F'];
    ctx.fillStyle = C.tm;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    temps.forEach((t, i) => {
      if (t) ctx.fillText(t, pad.l + (i / (temps.length - 1)) * cw, pad.t + ch + 16);
    });
  }

  // ── Chart: Generation Mix (Overview) ────────────────────
  function drawGenMixChart() {
    const c = setupCanvas('chart-genmix');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 50 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const seed = regionSeed() + 300;
    const total = r.totalGen;

    const n = 24;
    const gas    = generateSine(n, total * r.gas, total * r.gas * 0.15, 1.8, total * 0.02, seed);
    const wind   = generateSine(n, total * r.windPct, total * r.windPct * 0.35, 2.5, total * 0.02, seed + 1);
    const solar  = Array.from({length: n}, (_, i) => {
      const rng = seededRand(seed + 2 + i);
      return Math.max(0, total * r.solarPct * Math.sin((i / n) * Math.PI) + (rng() - 0.5) * total * 0.01);
    });
    const nuclear= generateSine(n, total * r.nucPct, total * r.nucPct * 0.02, 0.5, total * 0.005, seed + 3);

    const maxV = total * 1.1;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 5, 0, maxV);

    const layers = [
      { data: gas, color: C.tm },
      { data: wind, color: C.accent },
      { data: solar, color: C.warn },
      { data: nuclear, color: C.success },
    ];

    let accumulated = Array(n).fill(0);
    layers.forEach(layer => {
      const top = accumulated.map((a, i) => a + layer.data[i]);
      drawArea(ctx, top, pad.l, pad.t, cw, ch, 0, maxV, layer.color, 0.6);
      drawLine(ctx, top, pad.l, pad.t, cw, ch, 0, maxV, layer.color, 1);
      accumulated = top;
    });

    const xlabels = ['00', '04', '08', '12', '16', '20', '24'];
    drawXLabels(ctx, xlabels, pad.l, pad.t, cw, ch);
  }

  // ── Chart: Forecast Main ────────────────────────────────
  function generateModelForecast(modelName, n, r, baseSeed) {
    const m = MODEL_PROFILES[modelName];
    if (!m) return null;
    return generateSine(
      n,
      r.base * (1 + m.biasPct),
      r.amp * m.ampMul,
      m.freqMul,
      r.amp * m.noiseMul,
      baseSeed + m.seedOff
    );
  }

  function drawForecastMain() {
    const c = setupCanvas('chart-forecast-main');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 55 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const seed = regionSeed() + 400;

    const nHist = 36;
    const nFore = 72;
    const actual = generateSine(nHist, r.base, r.amp, 3, r.amp * 0.18, seed);

    // Generate all model forecasts for bounding
    const allModels = {};
    Object.keys(MODEL_PROFILES).forEach(name => {
      allModels[name] = generateModelForecast(name, nFore, r, seed);
    });

    // Active model forecast + CI
    const isActualOnly = currentModel === 'Actual';
    const activeProfile = MODEL_PROFILES[currentModel];
    const activeForecast = allModels[currentModel];

    // Compute bounds across all values that will be displayed
    let boundsVals = [...actual];
    if (!isActualOnly) {
      boundsVals.push(...activeForecast);
      const ciW = activeProfile.ciWidth;
      activeForecast.forEach((v, i) => {
        const spread = (r.amp * 0.35 + (i / nFore) * r.amp * 0.2) * ciW;
        boundsVals.push(v + spread, v - spread);
      });
    }
    const minV = Math.min(...boundsVals) - r.amp * 0.2;
    const maxV = Math.max(...boundsVals) + r.amp * 0.2;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 6, minV, maxV);

    const histFrac = nHist / (nHist + nFore);
    const nowX = pad.l + histFrac * cw;
    const forecastW = cw * (1 - histFrac);

    // Confidence band (only when a model is selected)
    if (!isActualOnly) {
      const ciW = activeProfile.ciWidth;
      const upper = activeForecast.map((v, i) => v + (r.amp * 0.35 + (i / nFore) * r.amp * 0.2) * ciW);
      const lower = activeForecast.map((v, i) => v - (r.amp * 0.35 + (i / nFore) * r.amp * 0.2) * ciW);
      drawBand(ctx, upper, lower, nowX, pad.t, forecastW, ch, minV, maxV, activeProfile.color, 0.08);
    }

    // Actual history line
    drawLine(ctx, actual, pad.l, pad.t, histFrac * cw, ch, minV, maxV, C.tm, 1.5, [4, 3]);

    // Now marker
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(nowX, pad.t); ctx.lineTo(nowX, pad.t + ch); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.tm;
    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NOW', nowX, pad.t - 2);

    if (!isActualOnly) {
      // Ghost lines for non-active models (subtle background context)
      ctx.globalAlpha = 0.25;
      Object.keys(MODEL_PROFILES).forEach(name => {
        if (name === currentModel) return;
        drawLine(ctx, allModels[name], nowX, pad.t, forecastW, ch, minV, maxV, MODEL_PROFILES[name].color, 1.2);
      });
      ctx.globalAlpha = 1;

      // Active model forecast line (bold, on top)
      drawLine(ctx, activeForecast, nowX, pad.t, forecastW, ch, minV, maxV, activeProfile.color, 2.5);
    }

    const xlabels = ['-36h', '-24h', '-12h', 'Now', '+12h', '+24h', '+36h', '+48h', '+60h', '+72h'];
    drawXLabels(ctx, xlabels, pad.l, pad.t, cw, ch);

    // Update legend
    updateForecastLegend();
  }

  function updateForecastLegend() {
    const legendContainer = document.querySelector('#panel-forecast .card--full .card__legend');
    if (!legendContainer) return;

    if (currentModel === 'Actual') {
      legendContainer.innerHTML =
        '<span class="legend-item"><span class="legend-swatch" style="background:' + C.tm + '"></span>Actual</span>';
      return;
    }

    const m = MODEL_PROFILES[currentModel];
    let html = '<span class="legend-item"><span class="legend-swatch" style="background:' + C.tm + '"></span>Actual</span>';
    // Ghost model swatches
    Object.keys(MODEL_PROFILES).forEach(name => {
      if (name === currentModel) return;
      html += '<span class="legend-item" style="opacity:0.4"><span class="legend-swatch" style="background:' + MODEL_PROFILES[name].color + '"></span>' + name + '</span>';
    });
    // Active model swatch (bold)
    html += '<span class="legend-item"><span class="legend-swatch" style="background:' + m.color + '"></span><strong>' + currentModel + '</strong></span>';
    html += '<span class="legend-item"><span class="legend-swatch legend-swatch--band" style="background:' + m.color + '"></span>95% CI</span>';

    legendContainer.innerHTML = html;
  }

  // ── Chart: Confidence ───────────────────────────────────
  function drawConfidenceChart() {
    const c = setupCanvas('chart-confidence');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 40 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 4, 75, 100);

    const base = r.conf;
    const horizons = [
      Math.min(99, base + 2.9),
      Math.min(98, base + 1.6),
      base,
      base - 2.1,
      base - 4.8,
      base - 8.0,
      base - 11.4,
    ];
    const barW = cw / horizons.length - 6;

    horizons.forEach((v, i) => {
      const x = pad.l + (i / horizons.length) * cw + 3;
      const barH = Math.max(0, ((v - 75) / 25) * ch);
      const y = pad.t + ch - barH;

      ctx.fillStyle = v > 90 ? C.accent : v > 85 ? C.warn : C.danger;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x, y, barW, barH);
      ctx.globalAlpha = 1;

      ctx.fillStyle = C.tp;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(v.toFixed(1) + '%', x + barW / 2, y - 6);
    });

    const xlabels = ['6h', '12h', '24h', '36h', '48h', '60h', '72h'];
    xlabels.forEach((l, i) => {
      ctx.fillStyle = C.tm;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(l, pad.l + (i / horizons.length) * cw + 3 + barW / 2, pad.t + ch + 16);
    });
  }

  // ── Chart: Risk Timeline ────────────────────────────────
  function drawRiskTimeline() {
    const c = setupCanvas('chart-risk-timeline');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 20, r: 10, b: 28, l: 50 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const riskBase = r.risk === 'Low' ? 18 : r.risk === 'Moderate' ? 38 : 60;

    const n = 72;
    const risk = [];
    const rng = seededRand(regionSeed() + 500);
    for (let i = 0; i < n; i++) {
      let base = riskBase + Math.sin((i / n) * Math.PI * 3) * 15;
      if (i > 20 && i < 35) base += 20;
      risk.push(Math.max(0, Math.min(100, base + (rng() - 0.5) * 10)));
    }

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 4, 0, 100);

    const zoneH = ch / 3;
    ctx.fillStyle = C.danger; ctx.globalAlpha = 0.04;
    ctx.fillRect(pad.l, pad.t, cw, zoneH);
    ctx.fillStyle = C.warn; ctx.globalAlpha = 0.04;
    ctx.fillRect(pad.l, pad.t + zoneH, cw, zoneH);
    ctx.globalAlpha = 1;

    ctx.font = '9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = C.danger; ctx.globalAlpha = 0.5;
    ctx.fillText('HIGH', pad.l + cw - 4, pad.t + 12);
    ctx.fillStyle = C.warn;
    ctx.fillText('MOD', pad.l + cw - 4, pad.t + zoneH + 12);
    ctx.fillStyle = C.success;
    ctx.fillText('LOW', pad.l + cw - 4, pad.t + zoneH * 2 + 12);
    ctx.globalAlpha = 1;

    drawArea(ctx, risk, pad.l, pad.t, cw, ch, 0, 100, C.warn, 0.12);
    drawLine(ctx, risk, pad.l, pad.t, cw, ch, 0, 100, C.warn, 1.5);

    drawXLabels(ctx, ['Now', '+12h', '+24h', '+36h', '+48h', '+60h', '+72h'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Anomaly ──────────────────────────────────────
  function drawAnomalyChart() {
    const c = setupCanvas('chart-anomaly');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 50 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();

    const n = 48;
    const residuals = generateSine(n, 0, r.amp * 0.2, 4, r.amp * 0.15, regionSeed() + 600);
    const threshold = r.amp * 0.35;

    const maxV = r.amp * 0.5;
    const minV = -maxV;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 4, minV, maxV);

    const zeroY = pad.t + ch / 2;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, zeroY); ctx.lineTo(pad.l + cw, zeroY); ctx.stroke();

    ctx.fillStyle = C.danger;
    ctx.globalAlpha = 0.05;
    const threshFrac = (threshold / maxV) * (ch / 2);
    ctx.fillRect(pad.l, pad.t, cw, ch / 2 - threshFrac);
    ctx.fillRect(pad.l, pad.t + ch / 2 + threshFrac, cw, ch / 2 - threshFrac);
    ctx.globalAlpha = 1;

    residuals.forEach((v, i) => {
      const x = pad.l + (i / n) * cw + 1;
      const barW = (cw / n) - 2;
      const barH = Math.abs(v) / maxV * (ch / 2);
      const y = v >= 0 ? zeroY - barH : zeroY;
      const isAnomaly = Math.abs(v) > threshold;
      ctx.fillStyle = isAnomaly ? C.danger : C.accent;
      ctx.globalAlpha = isAnomaly ? 0.8 : 0.4;
      ctx.fillRect(x, y, Math.max(barW, 1), barH);
    });
    ctx.globalAlpha = 1;

    drawXLabels(ctx, ['-48h', '-36h', '-24h', '-12h', 'Now'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Generation Stack (Grid) ──────────────────────
  function drawGenStack() {
    const c = setupCanvas('chart-gen-stack');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 55 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const seed = regionSeed() + 700;
    const total = r.totalGen;

    const n = 48;
    const gas     = generateSine(n, total * r.gas, total * r.gas * 0.15, 2, total * 0.015, seed);
    const wind    = generateSine(n, total * r.windPct, total * r.windPct * 0.4, 3, total * 0.02, seed + 1);
    const solar   = Array.from({length: n}, (_, i) => {
      const hour = (i / n) * 24;
      const peak = total * r.solarPct;
      return Math.max(0, peak * Math.sin(Math.max(0, (hour - 6) / 12) * Math.PI) * (hour >= 6 && hour <= 18 ? 1 : 0));
    });
    const nuclear = generateSine(n, total * r.nucPct, total * r.nucPct * 0.02, 0.5, total * 0.003, seed + 3);
    const other   = generateSine(n, total * r.otherPct, total * r.otherPct * 0.1, 1, total * 0.005, seed + 4);

    const maxV = total * 1.15;
    drawGridLines(ctx, pad.l, pad.t, cw, ch, 5, 0, maxV);

    const layers = [
      { data: other, color: C.purple },
      { data: nuclear, color: C.success },
      { data: solar, color: C.warn },
      { data: wind, color: C.accent },
      { data: gas, color: C.tm },
    ];

    let accumulated = Array(n).fill(0);
    layers.forEach(layer => {
      const top = accumulated.map((a, i) => a + layer.data[i]);
      drawArea(ctx, top, pad.l, pad.t, cw, ch, 0, maxV, layer.color, 0.55);
      drawLine(ctx, top, pad.l, pad.t, cw, ch, 0, maxV, layer.color, 0.8);
      accumulated = top;
    });

    drawXLabels(ctx, ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Fuel Donut (Grid) ────────────────────────────
  function drawFuelDonut() {
    const c = setupCanvas('chart-fuel-donut');
    if (!c) return;
    const { ctx, w, h } = c;
    const r = getRegion();

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.35;
    const inner = radius * 0.6;

    const slices = [
      { label: 'Gas',     pct: r.gas, color: C.tm },
      { label: 'Wind',    pct: r.windPct, color: C.accent },
      { label: 'Solar',   pct: r.solarPct, color: C.warn },
      { label: 'Nuclear', pct: r.nucPct, color: C.success },
      { label: 'Other',   pct: r.otherPct, color: C.purple },
    ];

    let startAngle = -Math.PI / 2;
    slices.forEach(slice => {
      const endAngle = startAngle + slice.pct * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.arc(cx, cy, inner, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = slice.color;
      ctx.globalAlpha = 0.75;
      ctx.fill();
      ctx.globalAlpha = 1;

      const midAngle = (startAngle + endAngle) / 2;
      const labelR = radius + 16;
      const lx = cx + Math.cos(midAngle) * labelR;
      const ly = cy + Math.sin(midAngle) * labelR;
      ctx.fillStyle = C.ts;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = Math.cos(midAngle) > 0 ? 'left' : 'right';
      ctx.fillText(slice.label + ' ' + Math.round(slice.pct * 100) + '%', lx, ly + 3);

      startAngle = endAngle;
    });

    ctx.fillStyle = C.tp;
    ctx.font = '600 18px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText((r.totalGen / 1000).toFixed(1), cx, cy - 2);
    ctx.fillStyle = C.tm;
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.fillText('GW Total', cx, cy + 14);
  }

  // ── Chart: Net Load (Grid) ──────────────────────────────
  function drawNetLoad() {
    const c = setupCanvas('chart-net-load');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 55 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();
    const seed = regionSeed() + 800;

    const n = 48;
    const totalDemand = generateSine(n, r.base, r.amp, 2, r.amp * 0.12, seed);
    const renewableBase = r.totalGen * (r.windPct + r.solarPct);
    const netLoadData = totalDemand.map((d, i) => {
      const hour = (i / n) * 24;
      const solarCurve = Math.max(0, Math.sin(Math.max(0, (hour - 5) / 14) * Math.PI)) * (hour >= 5 && hour <= 19 ? 1 : 0);
      const renewable = r.wind + r.solar * solarCurve;
      return d - renewable;
    });

    const allV = [...totalDemand, ...netLoadData];
    const minV = Math.min(...allV) - r.amp * 0.3;
    const maxV = Math.max(...allV) + r.amp * 0.3;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 5, minV, maxV);
    drawLine(ctx, totalDemand, pad.l, pad.t, cw, ch, minV, maxV, C.tm, 1.5, [4, 3]);
    drawLine(ctx, netLoadData, pad.l, pad.t, cw, ch, minV, maxV, C.accent, 2);

    drawXLabels(ctx, ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Scenario ─────────────────────────────────────
  function drawScenarioChart() {
    const c = setupCanvas('chart-scenario');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 55 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const r = getRegion();

    const tempOff   = parseInt(document.getElementById('temp-slider').value);
    const windPct   = parseInt(document.getElementById('wind-slider').value);
    const solarPct  = parseInt(document.getElementById('solar-slider').value);
    const demandPct = parseInt(document.getElementById('demand-slider').value);

    const n = 72;
    const baseline = generateSine(n, r.base, r.amp, 3, r.amp * 0.06, regionSeed() + 900);
    const scenario = baseline.map(v => {
      let adj = v;
      adj += tempOff * (r.base * 0.009);
      adj *= (1 + demandPct / 100);
      adj -= (windPct - 100) * (r.wind * 0.002);
      adj -= (solarPct - 100) * (r.solar * 0.002);
      return adj;
    });

    const allV = [...baseline, ...scenario];
    const minV = Math.min(...allV) - r.amp * 0.3;
    const maxV = Math.max(...allV) + r.amp * 0.3;

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 5, minV, maxV);
    drawLine(ctx, baseline, pad.l, pad.t, cw, ch, minV, maxV, C.tm, 1.5, [4, 3]);
    drawLine(ctx, scenario, pad.l, pad.t, cw, ch, minV, maxV, C.accent, 2);

    const deltaPts = scenario.map((v, i) => v - baseline[i]);
    const peakDelta = Math.max(...deltaPts);
    const avgDelta = deltaPts.reduce((a, b) => a + b, 0) / deltaPts.length;

    document.getElementById('delta-peak').textContent = (peakDelta >= 0 ? '+' : '') + Math.round(peakDelta).toLocaleString() + ' MW';
    document.getElementById('delta-avg').textContent = (avgDelta >= 0 ? '+' : '') + Math.round(avgDelta).toLocaleString() + ' MW';

    const riskChange = peakDelta > r.amp * 0.8 ? 'High' : peakDelta > r.amp * 0.3 ? 'Moderate' : peakDelta > 0 ? 'Low' : 'Reduced';
    const riskEl = document.getElementById('delta-risk');
    riskEl.textContent = riskChange;
    riskEl.style.color = peakDelta > r.amp * 0.8 ? C.danger : peakDelta > r.amp * 0.3 ? C.warn : C.success;

    drawXLabels(ctx, ['Now', '+12h', '+24h', '+36h', '+48h', '+60h', '+72h'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Model MAPE (Models) ──────────────────────────
  function drawModelMape() {
    const c = setupCanvas('chart-model-mape');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 40 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const seed = regionSeed() + 1000;

    const n = 21;
    const xgb     = generateSine(n, 3.2, 0.8, 2, 0.4, seed);
    const prophet = generateSine(n, 4.3, 1.0, 2.5, 0.5, seed + 1);
    const sarimax = generateSine(n, 5.0, 1.2, 1.8, 0.6, seed + 2);
    const ens     = generateSine(n, 2.9, 0.6, 2.2, 0.3, seed + 3);

    drawGridLines(ctx, pad.l, pad.t, cw, ch, 4, 0, 8);
    drawLine(ctx, xgb, pad.l, pad.t, cw, ch, 0, 8, MODEL_PROFILES.XGBoost.color, 2);
    drawLine(ctx, prophet, pad.l, pad.t, cw, ch, 0, 8, MODEL_PROFILES.Prophet.color, 1.5);
    drawLine(ctx, sarimax, pad.l, pad.t, cw, ch, 0, 8, MODEL_PROFILES.SARIMAX.color, 1.5);
    drawLine(ctx, ens, pad.l, pad.t, cw, ch, 0, 8, MODEL_PROFILES.Ensemble.color, 2);

    drawXLabels(ctx, ['Day 1', '', '', 'Day 7', '', '', 'Day 14', '', '', 'Day 21'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: SHAP ─────────────────────────────────────────
  function drawShapChart() {
    const c = setupCanvas('chart-shap');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 8, r: 10, b: 4, l: 100 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;

    const features = [
      { name: 'Temperature', val: 0.82 },
      { name: 'Hour of Day', val: 0.68 },
      { name: 'CDD Index', val: 0.54 },
      { name: 'Day of Week', val: 0.42 },
      { name: 'Wind Speed', val: 0.31 },
      { name: 'Lag 24h', val: 0.28 },
      { name: 'Solar Rad.', val: 0.22 },
      { name: 'Humidity', val: 0.18 },
      { name: 'Rolling Avg', val: 0.14 },
      { name: 'Month', val: 0.09 },
    ];

    const barH = ch / features.length - 4;
    features.forEach((f, i) => {
      const y = pad.t + i * (ch / features.length) + 2;
      const bw = f.val * cw;
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.2 + f.val * 0.6;
      ctx.fillRect(pad.l, y, bw, barH);
      ctx.globalAlpha = 1;

      ctx.fillStyle = C.ts;
      ctx.font = '11px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(f.name, pad.l - 8, y + barH / 2 + 4);

      ctx.fillStyle = C.tp;
      ctx.font = '10px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(f.val.toFixed(2), pad.l + bw + 6, y + barH / 2 + 4);
    });
  }

  // ── Chart: Residuals ────────────────────────────────────
  function drawResidualsChart() {
    const c = setupCanvas('chart-residuals');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 40 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const rng = seededRand(regionSeed() + 1100);

    const bins = 20;
    const data = [];
    for (let i = 0; i < 500; i++) {
      data.push((rng() + rng() + rng() - 1.5) * 2000);
    }

    const counts = Array(bins).fill(0);
    data.forEach(v => {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor(((v + 3000) / 6000) * bins)));
      counts[idx]++;
    });
    const maxCount = Math.max(...counts);

    counts.forEach((count, i) => {
      const x = pad.l + (i / bins) * cw;
      const barW = cw / bins - 1;
      const barH = (count / maxCount) * ch;
      const y = pad.t + ch - barH;
      ctx.fillStyle = C.accent;
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x, y, barW, barH);
    });
    ctx.globalAlpha = 1;

    const zeroX = pad.l + cw / 2;
    ctx.strokeStyle = C.tp;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(zeroX, pad.t); ctx.lineTo(zeroX, pad.t + ch); ctx.stroke();
    ctx.setLineDash([]);

    drawXLabels(ctx, ['-3K', '-1.5K', '0', '+1.5K', '+3K'], pad.l, pad.t, cw, ch);
  }

  // ── Chart: Error by Hour ────────────────────────────────
  function drawErrorByHour() {
    const c = setupCanvas('chart-error-hour');
    if (!c) return;
    const { ctx, w, h } = c;
    const pad = { t: 10, r: 10, b: 28, l: 40 };
    const cw = w - pad.l - pad.r;
    const ch = h - pad.t - pad.b;
    const rng = seededRand(regionSeed() + 1200);

    const n = 24;
    const errors = [];
    for (let i = 0; i < n; i++) {
      const base = 2.5 + Math.sin((i / n) * Math.PI * 2) * 1.5;
      errors.push(Math.max(0.5, base + (rng() - 0.5) * 0.8));
    }

    const barW = cw / n - 3;
    drawGridLines(ctx, pad.l, pad.t, cw, ch, 3, 0, 6);

    errors.forEach((e, i) => {
      const x = pad.l + (i / n) * cw + 1.5;
      const barH = (e / 6) * ch;
      const y = pad.t + ch - barH;
      ctx.fillStyle = e > 4 ? C.warn : C.accent;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, y, barW, barH);
    });
    ctx.globalAlpha = 1;

    drawXLabels(ctx, ['00', '04', '08', '12', '16', '20', '24'], pad.l, pad.t, cw, ch);
  }

  // ── Scenario Sliders ────────────────────────────────────
  function initSliders() {
    const sliders = [
      { id: 'temp-slider',   valId: 'temp-val',   fmt: v => (v >= 0 ? '+' : '') + v + '\u00B0F' },
      { id: 'wind-slider',   valId: 'wind-val',   fmt: v => v + '%' },
      { id: 'solar-slider',  valId: 'solar-val',  fmt: v => v + '%' },
      { id: 'demand-slider', valId: 'demand-val', fmt: v => (v >= 0 ? '+' : '') + v + '%' },
    ];

    sliders.forEach(s => {
      const input = document.getElementById(s.id);
      const display = document.getElementById(s.valId);
      if (!input || !display) return;
      input.addEventListener('input', () => {
        display.textContent = s.fmt(parseInt(input.value));
        drawScenarioChart();
      });
    });

    document.querySelectorAll('.preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const temp = btn.dataset.temp || 0;
        const wind = btn.dataset.wind || 100;
        const solar = btn.dataset.solar || 100;
        const demand = btn.dataset.demand || 0;

        document.getElementById('temp-slider').value = temp;
        document.getElementById('wind-slider').value = wind;
        document.getElementById('solar-slider').value = solar;
        document.getElementById('demand-slider').value = demand;

        document.getElementById('temp-val').textContent = (temp >= 0 ? '+' : '') + temp + '\u00B0F';
        document.getElementById('wind-val').textContent = wind + '%';
        document.getElementById('solar-val').textContent = solar + '%';
        document.getElementById('demand-val').textContent = (demand >= 0 ? '+' : '') + demand + '%';

        drawScenarioChart();
      });
    });
  }

  // ── Window Resize ───────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const activePanel = document.querySelector('.tab-panel--active');
      if (activePanel) {
        renderChartsForTab(activePanel.id.replace('panel-', ''), true);
      }
    }, 250);
  });

  // ── Init ────────────────────────────────────────────────
  initSliders();
  initHorizonButtons();
  initModelButtons();
  updateKPIs();
  applyPersona();
  renderChartsForTab('overview');

})();
