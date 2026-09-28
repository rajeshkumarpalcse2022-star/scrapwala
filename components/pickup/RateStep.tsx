"use client";

import { Info, Loader2, IndianRupee, Tag } from "lucide-react";
import type { ScrapRate } from "@/types/pickup";

interface RateStepProps {
  selectedScrap: string[];
  itemNames: Record<string, string>;
  rates: ScrapRate[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onNext: () => void;
  onBack: () => void;
}

function unitLabel(unit: string): string {
  if (unit === "kg") return "Kg";
  if (unit === "piece") return "Piece";
  return "Unit";
}

export function formatRate(rate: ScrapRate): string {
  const unit = unitLabel(rate.unit);
  if (rate.minRate === rate.maxRate) {
    return `₹${rate.minRate} / ${unit}`;
  }
  return `₹${rate.minRate} – ₹${rate.maxRate} / ${unit}`;
}

export default function RateStep({
  selectedScrap,
  itemNames,
  rates,
  isLoading,
  error,
  onRetry,
  onNext,
  onBack,
}: RateStepProps) {
  const rateBySub = new Map(rates.map((r) => [r.subcategoryId, r]));

  const rows = selectedScrap.map((id) => ({
    id,
    name: itemNames[id] ?? "Unknown item",
    rate: rateBySub.get(id) ?? null,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Expected Rates</h2>
      <p className="mt-2 text-muted">
        Current scrap rates for your selected items.
      </p>

      {isLoading ? (
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-card p-8 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          Loading rates…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted-light"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light">
                  <Tag className="h-4 w-4 text-primary" aria-hidden="true" />
                </span>
                <span className="truncate text-sm font-medium text-foreground">
                  {row.name}
                </span>
              </div>
              {row.rate ? (
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
                  <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
                  {formatRate(row.rate).replace(/^₹/, "")}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-muted-light px-2.5 py-1 text-xs font-medium text-muted">
                  Rate not set yet
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-light p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-primary">
            Final amount after weighing
          </h3>
          <p className="mt-1 text-sm text-muted">
            Rates above are indicative. The final amount is calculated after
            actual weighing of your scrap at pickup.
          </p>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLoading}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
