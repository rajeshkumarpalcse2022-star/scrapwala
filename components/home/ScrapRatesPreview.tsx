"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, Loader2 } from "lucide-react";
import Container from "@/components/common/Container";
import SectionHeading from "@/components/common/SectionHeading";

interface PreviewRate {
  id: string;
  name: string;
  category: string;
  minRate: number;
  maxRate: number;
  unit: string;
}

export default function ScrapRatesPreview() {
  const [rates, setRates] = useState<PreviewRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/rates", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load rates");
        }
        setRates(json.data?.rates || []);
      } catch {
        if (!cancelled) setHasError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatRate = (rate: PreviewRate) =>
    rate.maxRate && rate.maxRate !== rate.minRate
      ? `\u20B9${rate.minRate} \u2013 \u20B9${rate.maxRate}/${rate.unit}`
      : `\u20B9${rate.minRate}/${rate.unit}`;

  return (
    <section className="bg-muted-light py-20">
      <Container>
        <SectionHeading
          title="Scrap Rates"
          subtitle="Check our current rates for common scrap materials."
        />
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading current rates…
              </div>
            ) : hasError || rates.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted">
                {hasError
                  ? "Rates are temporarily unavailable."
                  : "No scrap rates published yet. Check back soon."}
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-primary-light">
                    <th className="px-6 py-4 text-sm font-semibold text-foreground">Material</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">
                      Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((item, i) => (
                    <tr
                      key={item.id}
                      className={i < rates.length - 1 ? "border-b border-border" : ""}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-primary">
                        {formatRate(item)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-card p-4 text-xs text-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              Rates shown are indicative and may vary based on material quality,
              quantity, condition and final weighing.
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/scrap-rates"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
            >
              View All Scrap Rates
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
