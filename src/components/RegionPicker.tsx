"use client";

import { REGIONS, type RegionCode } from "@/lib/types";

const SHORT_NAMES: Record<RegionCode, string> = {
  ERCO: "Texas",
  CISO: "California",
  PJM: "Mid-Atlantic",
  MISO: "Midwest",
};

interface RegionPickerProps {
  value: RegionCode;
  onChange: (region: RegionCode) => void;
}

export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  return (
    <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-raised)] p-0.5">
      {(Object.keys(REGIONS) as RegionCode[]).map((code) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`relative rounded-md px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-150 ${
            value === code
              ? "bg-[var(--accent-muted)] text-[var(--accent)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <span className="hidden sm:inline">{SHORT_NAMES[code]}</span>
          <span className="sm:hidden">{code}</span>
        </button>
      ))}
    </div>
  );
}
