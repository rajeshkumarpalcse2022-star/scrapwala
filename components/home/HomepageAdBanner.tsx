"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/common/Container";
import RemoteImage from "@/components/common/RemoteImage";

interface ActiveAd {
  title: string;
  imageUrl: string;
  imageAlt: string;
  linkUrl: string | null;
}

/**
 * Homepage promotional banner. Fetches the currently live ad from
 * /api/homepage-ad; renders nothing when no ad is active, so the
 * homepage layout is unchanged for visitors.
 */
export default function HomepageAdBanner() {
  const [ad, setAd] = useState<ActiveAd | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/homepage-ad", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success || !json.data?.ad) return;
        setAd(json.data.ad as ActiveAd);
      } catch {
        /* ad is optional — silently skip */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ad || failed) return null;

  const banner = (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary-light/40 via-white to-amber-50/60 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] sm:rounded-3xl">
      <RemoteImage
        src={ad.imageUrl}
        alt={ad.imageAlt || ad.title}
        className="block h-auto w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );

  return (
    <section
      aria-label="Promotion"
      className="pb-2 pt-6 sm:pb-4 sm:pt-8 lg:pt-10"
    >
      <Container>
        {ad.linkUrl ? (
          <Link
            href={ad.linkUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {banner}
          </Link>
        ) : (
          banner
        )}
      </Container>
    </section>
  );
}
