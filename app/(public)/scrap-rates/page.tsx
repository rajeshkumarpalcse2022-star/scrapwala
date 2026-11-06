import type { Metadata } from "next";
import ScrapRatesHero from "@/components/scrap-rates/ScrapRatesHero";
import ScrapRatesPageContent from "@/components/scrap-rates/ScrapRatesPageContent";
import AcceptedMaterials from "@/components/scrap-rates/AcceptedMaterials";
import RateCalculationInfo from "@/components/scrap-rates/RateCalculationInfo";
import ScrapRatesCTA from "@/components/scrap-rates/ScrapRatesCTA";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

const description =
  "Explore available scrap material rates on Scrapi. Check material categories and request a convenient scrap pickup.";

export const metadata: Metadata = buildMetadata({
  title: "Scrap Prices & Rates – Check Available Scrap Materials | Scrapi",
  absoluteTitle: true,
  description,
  path: "/scrap-rates",
  keywords: [
    "scrap rates",
    "scrap prices",
    "sell scrap online",
    "scrap pickup service",
  ],
});

export default function ScrapRatesPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Scrap Rates", path: "/scrap-rates" },
        ])}
      />
      <JsonLd
        data={webPageJsonLd({
          name: "Scrap Prices & Rates",
          description,
          path: "/scrap-rates",
        })}
      />
      <ScrapRatesHero />
      <ScrapRatesPageContent />
      <AcceptedMaterials />
      <RateCalculationInfo />
      <ScrapRatesCTA />
    </>
  );
}
