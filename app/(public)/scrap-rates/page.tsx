import type { Metadata } from "next";
import ScrapRatesHero from "@/components/scrap-rates/ScrapRatesHero";
import ScrapRatesPageContent from "@/components/scrap-rates/ScrapRatesPageContent";
import AcceptedMaterials from "@/components/scrap-rates/AcceptedMaterials";
import RateCalculationInfo from "@/components/scrap-rates/RateCalculationInfo";
import ScrapRatesCTA from "@/components/scrap-rates/ScrapRatesCTA";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scrap Rates | Check Scrap Prices | ScrapWala",
  description:
    "Check indicative scrap rates for paper, plastic, metals, e-waste, appliances and more with ScrapWala.",
};

export default function ScrapRatesPage() {
  return (
    <>
      <ScrapRatesHero />
      <ScrapRatesPageContent />
      <AcceptedMaterials />
      <RateCalculationInfo />
      <ScrapRatesCTA />
    </>
  );
}
