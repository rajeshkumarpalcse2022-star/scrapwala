"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import Container from "@/components/common/Container";
import LocationSelector from "./LocationSelector";
import ScrapRateSearch from "./ScrapRateSearch";
import ScrapRateFilters from "./ScrapRateFilters";
import ScrapRateCard from "./ScrapRateCard";
import RateNotice from "./RateNotice";
import { type Location } from "@/lib/constants/scrapRates";
import type { PublicRateView } from "@/types/rates";

const ALL_CATEGORIES = "All";

export default function ScrapRatesPageContent() {
  const [location, setLocation] = useState<Location | "">("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  const [rates, setRates] = useState<PublicRateView[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [ratesRes, catsRes] = await Promise.all([
          fetch("/api/rates", { cache: "no-store" }),
          fetch("/api/categories", { cache: "no-store" }),
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
        setRates(ratesJson.data?.rates || []);
        const names: string[] = (catsJson.data?.categories || [])
          .map((c: { name: string }) => c.name)
          .sort((a: string, b: string) => a.localeCompare(b));
        setCategoryNames(names);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setRates([]);
        setCategoryNames([]);
        setLoadError(err instanceof Error ? err.message : "Unable to load rates.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const retry = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const filterOptions = useMemo(
    () => [ALL_CATEGORIES, ...categoryNames],
    [categoryNames]
  );

  const filtered = useMemo(() => {
    let items = rates;

    if (category !== ALL_CATEGORIES) {
      items = items.filter((r) => r.category === category);
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
  }, [rates, category, search]);

  return (
    <section className="py-10 sm:py-14">
      <Container>
        <div className="space-y-6">
          {/* Location */}
          <LocationSelector value={location} onChange={setLocation} />

          {!location && (
            <p className="text-center text-sm text-muted">
              Select your location to view applicable rates.
            </p>
          )}

          {location && (
            <p className="text-center text-sm text-muted">
              Showing rates for <span className="font-semibold text-foreground">{location}</span>
            </p>
          )}

          {/* Search */}
          <ScrapRateSearch value={search} onChange={setSearch} />

          {/* Filters */}
          <div className="flex justify-center">
            <ScrapRateFilters
              categories={filterOptions}
              active={category}
              onChange={setCategory}
            />
          </div>

          {/* Notice */}
          <RateNotice />

          {isLoading && (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-16 text-sm text-muted"
              role="status"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading current rates…
            </div>
          )}

          {!isLoading && loadError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 py-10 text-center">
              <p className="text-sm font-semibold text-destructive">{loadError}</p>
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((rate) => (
                    <ScrapRateCard key={rate.id} rate={rate} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card py-16 text-center">
                  <p className="text-base font-semibold text-foreground">
                    {rates.length === 0
                      ? "No scrap rates published yet"
                      : "No scrap items found"}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {rates.length === 0
                      ? "Rates will appear here as soon as they are configured."
                      : "Try searching for another item."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
