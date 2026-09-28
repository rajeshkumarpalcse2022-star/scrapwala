"use client";

import { Search, X } from "lucide-react";

interface ScrapRateSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ScrapRateSearch({ value, onChange }: ScrapRateSearchProps) {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      <Search
        className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search scrap items..."
        aria-label="Search scrap items"
        className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-10 text-sm text-foreground shadow-sm placeholder:text-muted/60 transition-colors hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-primary/10 hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
