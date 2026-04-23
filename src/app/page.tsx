"use client";

import { useEffect, useRef } from "react";

export default function LandingPage() {
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const navLinksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // --- Load landing page CSS ---
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/landing.css";
    document.head.appendChild(link);

    // --- Load Google Fonts ---
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "anonymous";
    document.head.appendChild(preconnect2);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(fontLink);

    // --- IntersectionObserver reveal ---
    const revealEls = document.querySelectorAll("[data-reveal]");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));

    // --- Nav scroll state ---
    const nav = document.getElementById("nav");
    const handleScroll = () => {
      if (nav) {
        if (window.scrollY > 80) {
          nav.classList.add("nav--scrolled");
        } else {
          nav.classList.remove("nav--scrolled");
        }
      }

      // --- Active nav link highlighting ---
      const sections = document.querySelectorAll("section[id]");
      const navLinks = document.querySelectorAll(".nav__link[href^='#']");
      let currentSection = "";
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop - 120;
        if (window.scrollY >= sectionTop) {
          currentSection = section.getAttribute("id") || "";
        }
      });
      navLinks.forEach((link) => {
        link.classList.remove("nav__link--active");
        if (link.getAttribute("href") === `#${currentSection}`) {
          link.classList.add("nav__link--active");
        }
      });

      // --- Parallax on hero dashboard visual ---
      const heroVisual = document.querySelector(".hero__dashboard") as HTMLElement | null;
      if (heroVisual) {
        const scrolled = window.scrollY;
        heroVisual.style.transform = `translateY(${scrolled * 0.08}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // --- Mobile nav toggle ---
    const toggleBtn = navToggleRef.current;
    const navLinksEl = navLinksRef.current;
    const handleToggle = () => {
      if (navLinksEl) {
        navLinksEl.classList.toggle("open");
      }
      if (toggleBtn) {
        toggleBtn.classList.toggle("open");
      }
    };
    if (toggleBtn) {
      toggleBtn.addEventListener("click", handleToggle);
    }

    // --- Smooth scroll for anchor links ---
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    const handleAnchorClick = (e: Event) => {
      e.preventDefault();
      const href = (e.currentTarget as HTMLAnchorElement).getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      // Close mobile nav if open
      if (navLinksEl) {
        navLinksEl.classList.remove("open");
      }
      if (toggleBtn) {
        toggleBtn.classList.remove("open");
      }
    };
    anchorLinks.forEach((link) => {
      link.addEventListener("click", handleAnchorClick);
    });

    // --- Chart line drawing animation ---
    const chartLines = document.querySelectorAll(
      ".mock__line-forecast, .mock__line-actual"
    );
    chartLines.forEach((line) => {
      const svgLine = line as SVGPathElement;
      if (svgLine.getTotalLength) {
        const length = svgLine.getTotalLength();
        svgLine.style.strokeDasharray = `${length}`;
        svgLine.style.strokeDashoffset = `${length}`;
        const chartObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                svgLine.style.transition = "stroke-dashoffset 1.5s ease-out";
                svgLine.style.strokeDashoffset = "0";
                chartObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.3 }
        );
        chartObserver.observe(svgLine);
      }
    });

    // --- Cleanup ---
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (toggleBtn) {
        toggleBtn.removeEventListener("click", handleToggle);
      }
      anchorLinks.forEach((l) => {
        l.removeEventListener("click", handleAnchorClick);
      });
      revealObserver.disconnect();
      if (document.head.contains(link)) document.head.removeChild(link);
      if (document.head.contains(fontLink)) document.head.removeChild(fontLink);
      if (document.head.contains(preconnect1)) document.head.removeChild(preconnect1);
      if (document.head.contains(preconnect2)) document.head.removeChild(preconnect2);
    };
  }, []);

  return (
    <>
      {/* Nav */}
      <nav className="nav" id="nav">
        <div className="nav__inner">
          <a href="#" className="nav__logo">
            <span className="nav__logo-mark">GP</span>
            <span className="nav__logo-text">
              Grid<span className="nav__logo-accent">Pulse</span>
            </span>
          </a>
          <div className="nav__links" id="nav-links" ref={navLinksRef}>
            <a href="#platform" className="nav__link">Platform</a>
            <a href="#modules" className="nav__link">Modules</a>
            <a href="#workflows" className="nav__link">Workflows</a>
            <a href="#credibility" className="nav__link">Technology</a>
            <a href="/dashboard" className="nav__link">Launch Platform</a>
            <a href="#contact" className="nav__link nav__link--cta">Request Demo</a>
          </div>
          <button
            className="nav__toggle"
            id="nav-toggle"
            aria-label="Toggle navigation"
            ref={navToggleRef}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero" id="hero">
        <div className="hero__grid">
          <div className="hero__content">
            <p className="hero__eyebrow" data-reveal="">Energy Intelligence Platform</p>
            <h1 className="hero__title" data-reveal="">
              Operational clarity<br/>
              for a volatile grid.
            </h1>
            <p className="hero__subtitle" data-reveal="">
              GridPulse unifies demand forecasting, forecast confidence, grid visibility,
              and scenario-based decision support into one decision-ready platform for energy teams.
            </p>
            <div className="hero__actions" data-reveal="">
              <a href="#contact" className="btn btn--primary">Request a demo</a>
              <a href="/dashboard" className="btn btn--ghost">Explore platform</a>
            </div>
            <div className="hero__proof" data-reveal="">
              <div className="hero__proof-item">
                <span className="hero__proof-number">8</span>
                <span className="hero__proof-label">Regional grids</span>
              </div>
              <div className="hero__proof-divider"></div>
              <div className="hero__proof-item">
                <span className="hero__proof-number">3.1%</span>
                <span className="hero__proof-label">MAPE accuracy</span>
              </div>
              <div className="hero__proof-divider"></div>
              <div className="hero__proof-item">
                <span className="hero__proof-number">43</span>
                <span className="hero__proof-label">Engineered features</span>
              </div>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__dashboard" data-reveal="">
              <div className="mock">
                <div className="mock__header">
                  <div className="mock__dots">
                    <span></span><span></span><span></span>
                  </div>
                  <span className="mock__title">GridPulse — ERCOT Overview</span>
                </div>
                <div className="mock__body">
                  <div className="mock__kpi-row">
                    <div className="mock__kpi">
                      <span className="mock__kpi-label">Peak Demand</span>
                      <span className="mock__kpi-value">72.4 <small>GW</small></span>
                      <span className="mock__kpi-delta mock__kpi-delta--up">+2.1%</span>
                    </div>
                    <div className="mock__kpi">
                      <span className="mock__kpi-label">Forecast Conf.</span>
                      <span className="mock__kpi-value">94.2<small>%</small></span>
                      <span className="mock__kpi-delta mock__kpi-delta--stable">Stable</span>
                    </div>
                    <div className="mock__kpi">
                      <span className="mock__kpi-label">Risk Level</span>
                      <span className="mock__kpi-value">Low</span>
                      <span className="mock__kpi-delta mock__kpi-delta--down">-12pts</span>
                    </div>
                  </div>
                  <div className="mock__chart">
                    <svg viewBox="0 0 480 160" className="mock__chart-svg" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3}/>
                          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <path d="M0,100 Q60,90 120,75 T240,60 T360,50 T480,65 L480,120 Q360,95 240,105 T120,115 T0,130 Z" fill="url(#chart-grad)" className="mock__band"/>
                      <path d="M0,115 Q40,110 80,105 T160,95 T240,85 L240,85" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeDasharray="4,3" className="mock__line-actual"/>
                      <path d="M0,115 Q60,105 120,90 T240,75 T360,60 T480,70" fill="none" stroke="var(--accent)" strokeWidth="2.5" className="mock__line-forecast"/>
                      <circle cx="240" cy="75" r="4" fill="var(--accent)" className="mock__dot"/>
                    </svg>
                    <div className="mock__chart-labels">
                      <span>Now</span>
                      <span>+24h</span>
                      <span>+48h</span>
                      <span>+72h</span>
                    </div>
                  </div>
                  <div className="mock__signal">
                    <div className="mock__signal-dot"></div>
                    <span>Heat-driven demand risk elevated — ERCOT West</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero__scroll-cue">
          <span>Scroll</span>
          <div className="hero__scroll-line"></div>
        </div>
      </section>

      {/* Marquee */}
      <section className="marquee">
        <div className="marquee__track">
          <span className="marquee__item">Weather-aware forecasting</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Confidence-aware modeling</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Regional grid visibility</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Scenario-ready workflows</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Multi-model ensemble</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Real-time risk signals</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Weather-aware forecasting</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Confidence-aware modeling</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Regional grid visibility</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Scenario-ready workflows</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Multi-model ensemble</span>
          <span className="marquee__sep">/</span>
          <span className="marquee__item">Real-time risk signals</span>
          <span className="marquee__sep">/</span>
        </div>
      </section>

      {/* Platform - Section 01 */}
      <section className="section section--dark" id="platform">
        <div className="section__inner">
          <div className="section__header" data-reveal="">
            <p className="section__number">01</p>
            <h2 className="section__title">A clearer operating layer<br/>for energy decisions</h2>
            <p className="section__desc">
              GridPulse brings fragmented operational signals into one decision-ready
              system so teams can move faster without losing context or confidence.
            </p>
          </div>
          <div className="pillars">
            <article className="pillar" data-reveal="">
              <div className="pillar__index">01</div>
              <h3 className="pillar__title">Forecast with context</h3>
              <p className="pillar__desc">
                Unify demand, weather, and time-series patterns in a forecasting
                experience designed for real operating conditions.
              </p>
              <div className="pillar__line"></div>
            </article>
            <article className="pillar" data-reveal="">
              <div className="pillar__index">02</div>
              <h3 className="pillar__title">See confidence, not just output</h3>
              <p className="pillar__desc">
                Understand model reliability, forecast uncertainty, and recent
                performance before acting on a number.
              </p>
              <div className="pillar__line"></div>
            </article>
            <article className="pillar" data-reveal="">
              <div className="pillar__index">03</div>
              <h3 className="pillar__title">Surface risk earlier</h3>
              <p className="pillar__desc">
                Track anomalies, severe conditions, and forecast instability
                in one operational view.
              </p>
              <div className="pillar__line"></div>
            </article>
            <article className="pillar" data-reveal="">
              <div className="pillar__index">04</div>
              <h3 className="pillar__title">Plan through scenarios</h3>
              <p className="pillar__desc">
                Test assumptions and understand how changing conditions can
                alter expected demand and decision windows.
              </p>
              <div className="pillar__line"></div>
            </article>
          </div>
        </div>
      </section>

      {/* Modules - Section 02 */}
      <section className="section" id="modules">
        <div className="section__inner">
          <div className="section__header" data-reveal="">
            <p className="section__number">02</p>
            <h2 className="section__title">One platform.<br/>Multiple decision layers.</h2>
            <p className="section__desc">
              Start with forecasting, then expand into risk, grid visibility, scenarios,
              and model oversight without fragmenting the workflow.
            </p>
          </div>
          <div className="modules">
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="4,24 10,16 16,20 22,8 28,14"/>
                  <line x1="4" y1="28" x2="28" y2="28"/>
                </svg>
              </div>
              <h3 className="module__name">Forecast</h3>
              <p className="module__desc">Weather-aware demand forecasts with confidence bands, horizon views, and model-aware comparisons.</p>
            </article>
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="16,4 28,28 4,28"/>
                  <line x1="16" y1="14" x2="16" y2="20"/>
                  <circle cx="16" cy="24" r="1" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="module__name">Risk</h3>
              <p className="module__desc">Operational risk visibility for anomalies, severe conditions, and forecast instability.</p>
            </article>
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="16" cy="16" r="11"/>
                  <path d="M16,5 L16,16 L24,20"/>
                </svg>
              </div>
              <h3 className="module__name">Grid</h3>
              <p className="module__desc">Generation mix, net load, and regional operating context in one unified view.</p>
            </article>
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="24" height="24" rx="2"/>
                  <line x1="4" y1="16" x2="28" y2="16"/>
                  <line x1="16" y1="4" x2="16" y2="28"/>
                </svg>
              </div>
              <h3 className="module__name">Scenarios</h3>
              <p className="module__desc">What-if planning tools for testing conditions before they become costly.</p>
            </article>
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="10" cy="22" r="5"/>
                  <circle cx="22" cy="10" r="5"/>
                  <line x1="14" y1="18" x2="18" y2="14"/>
                </svg>
              </div>
              <h3 className="module__name">Models</h3>
              <p className="module__desc">Backtesting, model validation, drift awareness, and forecast accountability.</p>
            </article>
            <article className="module" data-reveal="">
              <div className="module__icon">
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="6" y="4" width="20" height="24" rx="2"/>
                  <line x1="10" y1="10" x2="22" y2="10"/>
                  <line x1="10" y1="15" x2="22" y2="15"/>
                  <line x1="10" y1="20" x2="18" y2="20"/>
                </svg>
              </div>
              <h3 className="module__name">Briefings</h3>
              <p className="module__desc">Narrative summaries, executive snapshots, and presentation-ready operational updates.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Workflows - Section 03 */}
      <section className="section section--dark" id="workflows">
        <div className="section__inner">
          <div className="section__header" data-reveal="">
            <p className="section__number">03</p>
            <h2 className="section__title">Designed for the people<br/>who use the signal</h2>
            <p className="section__desc">
              Role-adapted views for every operational workflow.
              One system, many perspectives.
            </p>
          </div>
          <div className="roles">
            <article className="role" data-reveal="">
              <div className="role__number">01</div>
              <h3 className="role__title">Utility Operations</h3>
              <p className="role__desc">See demand direction, risk windows, and high-priority conditions quickly. Start with the Overview and drill into Forecast or Risk when signals shift.</p>
              <div className="role__tags">
                <span className="role__tag">Overview</span>
                <span className="role__tag">Risk</span>
                <span className="role__tag">Grid</span>
              </div>
            </article>
            <article className="role" data-reveal="">
              <div className="role__number">02</div>
              <h3 className="role__title">Renewables Planning</h3>
              <p className="role__desc">Understand weather-driven shifts and how they affect expected grid behavior. Monitor generation mix and renewable share across regions.</p>
              <div className="role__tags">
                <span className="role__tag">Forecast</span>
                <span className="role__tag">Grid</span>
                <span className="role__tag">Scenarios</span>
              </div>
            </article>
            <article className="role" data-reveal="">
              <div className="role__number">03</div>
              <h3 className="role__title">Trading &amp; Markets</h3>
              <p className="role__desc">Track demand movement, changing conditions, and forecast divergence with greater speed. Compare model outputs and confidence in real time.</p>
              <div className="role__tags">
                <span className="role__tag">Forecast</span>
                <span className="role__tag">Risk</span>
                <span className="role__tag">Models</span>
              </div>
            </article>
            <article className="role" data-reveal="">
              <div className="role__number">04</div>
              <h3 className="role__title">Analytics &amp; Data Science</h3>
              <p className="role__desc">Monitor model performance, confidence degradation, and validation results. Inspect feature importance, SHAP values, and error decomposition.</p>
              <div className="role__tags">
                <span className="role__tag">Models</span>
                <span className="role__tag">Scenarios</span>
                <span className="role__tag">Briefings</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Showcase */}
      <section className="showcase">
        <div className="showcase__inner">
          <div className="showcase__text" data-reveal="">
            <p className="showcase__eyebrow">From signal to decision</p>
            <h2 className="showcase__title">
              A system built for<br/>
              operational tempo.
            </h2>
            <ul className="showcase__list">
              <li>Start with a region or operating view</li>
              <li>Review today&apos;s demand outlook and confidence</li>
              <li>Inspect rising risks and changing conditions</li>
              <li>Compare scenarios before action</li>
              <li>Share a briefing-ready summary with stakeholders</li>
            </ul>
          </div>
          <div className="showcase__visual" data-reveal="">
            <div className="showcase__mock">
              <div className="mock mock--wide">
                <div className="mock__header">
                  <div className="mock__dots"><span></span><span></span><span></span></div>
                  <span className="mock__title">GridPulse — Scenario Simulator</span>
                </div>
                <div className="mock__body">
                  <div className="mock__tabs">
                    <span className="mock__tab">Overview</span>
                    <span className="mock__tab">Forecast</span>
                    <span className="mock__tab mock__tab--active">Scenarios</span>
                    <span className="mock__tab">Risk</span>
                    <span className="mock__tab">Models</span>
                  </div>
                  <div className="mock__scenario-grid">
                    <div className="mock__scenario-panel">
                      <div className="mock__scenario-label">Baseline</div>
                      <div className="mock__scenario-bar" style={{"--w": "72%"} as React.CSSProperties}></div>
                      <div className="mock__scenario-label">+5°F Heat Wave</div>
                      <div className="mock__scenario-bar mock__scenario-bar--accent" style={{"--w": "88%"} as React.CSSProperties}></div>
                      <div className="mock__scenario-label">Wind Curtailment</div>
                      <div className="mock__scenario-bar mock__scenario-bar--warn" style={{"--w": "81%"} as React.CSSProperties}></div>
                    </div>
                    <div className="mock__scenario-chart">
                      <svg viewBox="0 0 280 100" preserveAspectRatio="none">
                        <path d="M0,70 Q35,65 70,55 T140,40 T210,30 T280,35" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="4,3"/>
                        <path d="M0,70 Q35,60 70,45 T140,25 T210,15 T280,20" fill="none" stroke="var(--accent)" strokeWidth="2"/>
                        <path d="M0,70 Q35,62 70,50 T140,35 T210,28 T280,30" fill="none" stroke="var(--warn)" strokeWidth="1.5"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility - Section 04 */}
      <section className="section" id="credibility">
        <div className="section__inner">
          <div className="section__header" data-reveal="">
            <p className="section__number">04</p>
            <h2 className="section__title">Built for<br/>technical scrutiny</h2>
            <p className="section__desc">
              GridPulse is designed to be credible with both operators and technical stakeholders.
              Not a black box. Not a static dashboard.
            </p>
          </div>
          <div className="specs">
            <div className="spec" data-reveal="">
              <div className="spec__header">
                <h4 className="spec__title">Data Sources</h4>
                <span className="spec__badge">Real-time</span>
              </div>
              <ul className="spec__list">
                <li>EIA API v2 — hourly demand, generation, interchange</li>
                <li>Open-Meteo — 17 weather variables, historical + forecast</li>
                <li>NOAA/NWS — severe weather alerts and advisories</li>
              </ul>
            </div>
            <div className="spec" data-reveal="">
              <div className="spec__header">
                <h4 className="spec__title">Models</h4>
                <span className="spec__badge">Ensemble</span>
              </div>
              <ul className="spec__list">
                <li>Prophet with weather regressors</li>
                <li>SARIMAX with auto-order selection</li>
                <li>XGBoost with TimeSeriesSplit CV + SHAP</li>
                <li>1/MAPE weighted ensemble</li>
              </ul>
            </div>
            <div className="spec" data-reveal="">
              <div className="spec__header">
                <h4 className="spec__title">Engineering</h4>
                <span className="spec__badge">43 Features</span>
              </div>
              <ul className="spec__list">
                <li>CDD/HDD thermal indices</li>
                <li>Wind power and solar capacity factors</li>
                <li>Lagged and rolling aggregates</li>
                <li>Cyclical time encodings</li>
              </ul>
            </div>
            <div className="spec" data-reveal="">
              <div className="spec__header">
                <h4 className="spec__title">Infrastructure</h4>
                <span className="spec__badge">Cloud-native</span>
              </div>
              <ul className="spec__list">
                <li>Docker multi-stage builds</li>
                <li>Cloud Run with auto-scaling</li>
                <li>Redis Memorystore precompute</li>
                <li>CI/CD via GitHub Actions</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Regions - Section 05 */}
      <section className="section section--dark" id="regions">
        <div className="section__inner">
          <div className="regions__layout">
            <div className="regions__text" data-reveal="">
              <p className="section__number">05</p>
              <h2 className="section__title">Eight regional grids.<br/>One unified view.</h2>
              <p className="section__desc">
                Coverage across major US balancing authorities, each with localized
                weather correlation, generation context, and demand behavior.
              </p>
            </div>
            <div className="regions__grid" data-reveal="">
              <div className="region-card">
                <span className="region-card__code">ERCOT</span>
                <span className="region-card__name">Texas</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">CAISO</span>
                <span className="region-card__name">California</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">PJM</span>
                <span className="region-card__name">Mid-Atlantic</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">MISO</span>
                <span className="region-card__name">Midwest</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">NYISO</span>
                <span className="region-card__name">New York</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">FPL</span>
                <span className="region-card__name">Florida</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">SPP</span>
                <span className="region-card__name">Southwest</span>
              </div>
              <div className="region-card">
                <span className="region-card__code">ISO-NE</span>
                <span className="region-card__name">New England</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" id="contact">
        <div className="cta-section__inner">
          <div className="cta-section__content" data-reveal="">
            <h2 className="cta-section__title">
              Bring forecasting, confidence,<br/>and grid visibility into one view.
            </h2>
            <p className="cta-section__desc">
              GridPulse helps energy teams interpret changing conditions faster
              and act with more confidence.
            </p>
            <div className="cta-section__actions">
              <a href="mailto:hello@gridpulse.dev" className="btn btn--primary btn--lg">Request a demo</a>
              <a href="/dashboard" className="btn btn--ghost btn--lg">Launch platform</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__top">
            <div className="footer__brand">
              <span className="nav__logo-mark">GP</span>
              <p className="footer__tagline">See demand sooner.<br/>Decide with confidence.</p>
            </div>
            <div className="footer__columns">
              <div className="footer__col">
                <h4 className="footer__col-title">Platform</h4>
                <a href="#platform" className="footer__link">Overview</a>
                <a href="#modules" className="footer__link">Modules</a>
                <a href="#workflows" className="footer__link">Workflows</a>
                <a href="#credibility" className="footer__link">Technology</a>
              </div>
              <div className="footer__col">
                <h4 className="footer__col-title">Modules</h4>
                <a href="#modules" className="footer__link">Forecast</a>
                <a href="#modules" className="footer__link">Risk</a>
                <a href="#modules" className="footer__link">Grid</a>
                <a href="#modules" className="footer__link">Scenarios</a>
                <a href="#modules" className="footer__link">Models</a>
                <a href="#modules" className="footer__link">Briefings</a>
              </div>
              <div className="footer__col">
                <h4 className="footer__col-title">Resources</h4>
                <a href="#credibility" className="footer__link">Documentation</a>
                <a href="#credibility" className="footer__link">API Reference</a>
                <a href="#contact" className="footer__link">Contact</a>
              </div>
            </div>
          </div>
          <div className="footer__bottom">
            <p className="footer__copy">&copy; 2026 GridPulse. Energy Intelligence Platform.</p>
            <p className="footer__legal">Signal over noise. Confidence over guesswork.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
