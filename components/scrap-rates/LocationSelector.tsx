"use client";

import { MapPin } from "lucide-react";

interface LocationSelectorProps {
  locations: string[];
  value: string;
  onChange: (location: string) => void;
}

export default function LocationSelector({
  locations,
  value,
  onChange,
}: LocationSelectorProps) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
        Rates for
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Select location"
        className="w-full max-w-[220px] rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
      >
        <option value="">Select Location</option>
        {locations.map((loc) => (
          <option key={loc} value={loc}>
            {loc}
          </option>
        ))}
      </select>
    </div>
  );
}
