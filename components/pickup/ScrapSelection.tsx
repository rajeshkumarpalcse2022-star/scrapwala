"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import ScrapCategoryCard from "./ScrapCategoryCard";
import type { ScrapCatalogGroup } from "@/types/pickup";

interface ScrapSelectionProps {
  groups: ScrapCatalogGroup[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  selectedScrap: string[];
  onNext: (selected: string[]) => void;
  onBack?: () => void;
}

export default function ScrapSelection({
  groups,
  isLoading,
  error,
  onRetry,
  selectedScrap,
  onNext,
  onBack,
}: ScrapSelectionProps) {
  const [selected, setSelected] = useState<string[]>(selectedScrap);
  const [selectionError, setSelectionError] = useState("");

  const visibleGroups = groups.filter((g) => g.subcategories.length > 0);
  const totalSubcategories = visibleGroups.reduce(
    (sum, g) => sum + g.subcategories.length,
    0
  );

  const toggleCategory = (id: string) => {
    setSelectionError("");
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) {
      setSelectionError("Please select at least one scrap item.");
      return;
    }
    onNext(selected);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Select Your Scrap</h2>
      <p className="mt-2 text-muted">
        Choose the categories of scrap you want to hand over. You can select multiple items.
      </p>

      {isLoading && (
        <div
          className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading scrap items…
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-6 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-card px-3 py-1.5 text-xs font-medium text-destructive hover:bg-card-hover"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && totalSubcategories === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <p className="text-sm font-semibold text-foreground">
            No scrap items available right now
          </p>
          <p className="mt-1 text-sm text-muted">
            Please check back later or contact support to find out what we accept.
          </p>
        </div>
      )}

      {!isLoading && !error && totalSubcategories > 0 && (
        <div className="mt-6 space-y-6">
          {visibleGroups.map((group) => (
            <div key={group.id}>
              <div className="mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="mt-0.5 text-xs text-muted">{group.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {group.subcategories.map((sub) => (
                  <ScrapCategoryCard
                    key={sub.id}
                    category={sub}
                    isSelected={selected.includes(sub.id)}
                    onToggle={toggleCategory}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectionError && (
        <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {selectionError}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={!onBack}
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isLoading || Boolean(error)}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
