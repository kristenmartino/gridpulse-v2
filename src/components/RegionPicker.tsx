"use client";

import { REGIONS, type RegionCode } from "@/lib/types";

interface RegionPickerProps {
  value: RegionCode;
  onChange: (region: RegionCode) => void;
}

export default function RegionPicker({ value, onChange }: RegionPickerProps) {
  return (
    <div className="flex gap-1.5">
      {(Object.keys(REGIONS) as RegionCode[]).map((code) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === code
              ? "bg-blue-500/20 text-blue-400"
              : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
