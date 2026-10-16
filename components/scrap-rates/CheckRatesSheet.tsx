"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import LocationSelector from "./LocationSelector";
import ScrapRateSearch from "./ScrapRateSearch";
import ScrapRateFilters from "./ScrapRateFilters";
import ScrapRateCard from "./ScrapRateCard";
import ScrapRateCardSkeleton from "./ScrapRateCardSkeleton";
import type { PublicRateView } from "@/types/rates";

const ALL_CATEGORIES = "All";

/**
 * Slide-up "Check Rates" sheet shown when the user starts scheduling a
 * pickup. Bottom sheet on mobile, centered dialog on desktop — both fully
 * responsive. Continue hands the user to the step-by-step pickup flow.
 */
export default function CheckRatesSheet({
  open,
  onClose,
  onContinue,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [location, setLocation] = useState("");

  const [rates, setRates] = useState<PublicRateView[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [locationNames, setLocationNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Slide in/out: keep the panel mounted during the exit transition.
  // rAF defers the state change so the browser can animate the class swap.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Lock body scroll + Escape-to-close while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        setIsLoading(true);
        const [ratesRes, catsRes, locationsRes] = await Promise.all([
          fetch("/api/rates", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/locations", { cache: "no-store" }),
        ]);
        const ratesJson = await ratesRes.json();
        const catsJson = await catsRes.json();
        if (cancelled) return;
        if (!ratesRes.ok || !ratesJson.success) {
          throw new Error(ratesJson.message || "Failed to load rates.");
        }
        if (!catsRes.ok || !catsJson.success) {
          throw new Error(catsJson.message || "Failed to load categories.");
        }
        const loadedRates: PublicRateView[] = ratesJson.data?.rates || [];
        setRates(loadedRates);

        const publishedCategories = new Set(loadedRates.map((r) => r.category));
        const names: string[] = (catsJson.data?.categories || [])
          .map((c: { name: string }) => c.name)
          .filter((name: string) => publishedCategories.has(name))
          .sort((a: string, b: string) => a.localeCompare(b));
        setCategoryNames(names);

        try {
          const locationsJson = locationsRes.ok
            ? await locationsRes.json()
            : null;
          const options: string[] = locationsJson?.success
            ? (locationsJson.data?.locations || []).map(
                (l: { name: string }) => l.name
              )
            : [];
          setLocationNames(options);
          setLocation((prev) => (options.includes(prev) ? prev : ""));
        } catch {
          setLocationNames([]);
        }

        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setRates([]);
        setCategoryNames([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load rates."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open, reloadKey]);

  const retry = () => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const filterOptions = useMemo(
    () => [ALL_CATEGORIES, ...categoryNames],
    [categoryNames]
  );

  const activeCategory = categoryNames.includes(category)
    ? category
    : ALL_CATEGORIES;

  const filtered = useMemo(() => {
    let items = rates;
    if (activeCategory !== ALL_CATEGORIES) {
      items = items.filter((r) => r.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }
    return items;
  }, [rates, activeCategory, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Check scrap rates">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div
        className={`absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-card shadow-2xl transition-all duration-300 ease-out sm:inset-x-4 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[82dvh] sm:w-full sm:max-w-[760px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl ${
          visible
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-full opacity-100 sm:scale-95"
        }`}
      >
        {/* Drag handle (visual, mobile) */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">
              Check Rates
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Browse current rates for all recyclable items
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rates"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-muted-light hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 sm:px-6">
          <LocationSelector
            locations={locationNames}
            value={location}
            onChange={setLocation}
          />

          <ScrapRateSearch value={search} onChange={setSearch} />

          <div className="flex justify-center">
            <ScrapRateFilters
              categories={filterOptions}
              active={activeCategory}
              onChange={setCategory}
            />
          </div>

          {isLoading && (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4"
              role="status"
              aria-label="Loading current rates"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <ScrapRateCardSkeleton key={index} />
              ))}
            </div>
          )}

          {!isLoading && loadError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 py-10 text-center">
              <p className="text-sm font-semibold text-destructive">
                {loadError}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-3 rounded-lg border border-destructive/40 bg-card px-4 py-2 text-xs font-medium text-destructive hover:bg-card-hover"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !loadError && (
            <>
              {filtered.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {filtered.map((rate) => (
                    <ScrapRateCard key={rate.id} rate={rate} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card py-12 text-center">
                  <p className="text-base font-semibold text-foreground">
                    {rates.length === 0
                      ? "No scrap rates available right now."
                      : "No scrap items found"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {rates.length === 0
                      ? "Please check back soon."
                      : "Try searching for another item."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky footer with Continue */}
        <div className="border-t border-border bg-card px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-auto sm:w-auto"
          >
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
