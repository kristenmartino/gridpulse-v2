/* ═══════════════════════════════════════════════════════════
   GridPulse V2 — Interactions & Reveal Animations
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Scroll Reveal ───────────────────────────────────────
  const revealElements = document.querySelectorAll('[data-reveal]');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // ── Nav Scroll State ────────────────────────────────────
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function updateNav() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  // ── Mobile Nav Toggle ───────────────────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', isOpen);

      // Animate hamburger to X
      const spans = navToggle.querySelectorAll('span');
      if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // Close nav on link click
    navLinks.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      });
    });
  }

  // ── Smooth Scroll for Anchor Links ──────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = nav ? nav.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ── Parallax on Hero Visual ─────────────────────────────
  const heroVisual = document.querySelector('.hero__dashboard');
  if (heroVisual) {
    window.addEventListener(
      'scroll',
      () => {
        const scrollY = window.scrollY;
        if (scrollY < window.innerHeight) {
          const progress = scrollY / window.innerHeight;
          heroVisual.style.transform = `translateY(${progress * 30}px)`;
        }
      },
      { passive: true }
    );
  }

  // ── Scenario Bar Animation on Reveal ────────────────────
  const scenarioBars = document.querySelectorAll('.mock__scenario-bar');
  if (scenarioBars.length) {
    const barObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.setProperty(
              '--w',
              entry.target.style.getPropertyValue('--w') || '50%'
            );
            barObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    scenarioBars.forEach((bar) => barObserver.observe(bar));
  }

  // ── Active Nav Link Highlighting ────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav__link[href^="#"]');

  function highlightNav() {
    const scrollPos = window.scrollY + 100;
    sections.forEach((section) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');
      if (scrollPos >= top && scrollPos < top + height) {
        navAnchors.forEach((a) => {
          a.style.color = '';
          if (a.getAttribute('href') === '#' + id) {
            a.style.color = 'var(--text-primary)';
          }
        });
      }
    });
  }

  window.addEventListener('scroll', highlightNav, { passive: true });

  // ── Chart Line Drawing Animation ────────────────────────
  const chartLines = document.querySelectorAll('.mock__line-forecast');
  chartLines.forEach((line) => {
    const length = line.getTotalLength ? line.getTotalLength() : 600;
    line.style.strokeDasharray = length;
    line.style.strokeDashoffset = length;

    const lineObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            line.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.25, 0, 0.3, 1)';
            line.style.strokeDashoffset = '0';
            lineObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    lineObserver.observe(line.closest('.mock') || line);
  });
})();
