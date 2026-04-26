"use client";

import { useEffect, useRef, useState } from "react";
import {
  REGIONS,
  REGION_CATEGORIES,
  CATEGORY_ORDER,
  type RegionCode,
} from "@/lib/types";

const SHORT_NAMES: Record<RegionCode, string> = {
  ERCO: "Texas",
  CISO: "California",
  PJM: "Mid-Atlantic",
  MISO: "Midwest",
  SWPP: "Central Plains",
  NYIS: "New York",
  ISNE: "New England",
};

interface RegionPickerProps {
  value: RegionCode;
  onChange: (region: RegionCode) => void;
}

export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group regions by category, preserving CATEGORY_ORDER and skipping empty groups.
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    regions: (Object.keys(REGIONS) as RegionCode[]).filter(
      (code) => REGION_CATEGORIES[code] === category,
    ),
  })).filter((g) => g.regions.length > 0);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSelect(code: RegionCode) {
    onChange(code);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <span>{REGIONS[value]}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-20 w-64 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] py-1 shadow-lg"
        >
          {grouped.map(({ category, regions }) => (
            <div key={category} className="py-1">
              <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {category}
              </div>
              {regions.map((code) => {
                const selected = code === value;
                return (
                  <button
                    key={code}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(code)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      selected
                        ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--border)]/30 hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <span>{SHORT_NAMES[code]}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                      {code}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
