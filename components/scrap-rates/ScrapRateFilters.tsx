"use client";

interface ScrapRateFiltersProps {
  categories: string[];
  active: string;
  onChange: (category: string) => void;
}

export default function ScrapRateFilters({
  categories,
  active,
  onChange,
}: ScrapRateFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Filter by category">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          role="tab"
          aria-selected={active === cat}
          onClick={() => onChange(cat)}
          className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all ${
            active === cat
              ? "bg-primary text-white shadow-sm"
              : "border border-border bg-card text-muted hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
