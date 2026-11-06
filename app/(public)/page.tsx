import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import HomepageAdBanner from "@/components/home/HomepageAdBanner";
import WeighingAccuracy from "@/components/home/WeighingAccuracy";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import CircularJourney from "@/components/home/CircularJourney";
import ContactFloat from "@/components/common/ContactFloat";
import JsonLd from "@/components/seo/JsonLd";
import { buildMetadata, webPageJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title:
    "Scrapi – Online Scrap Pickup & Doorstep Scrap Collection in India",
  absoluteTitle: true,
  description:
    "Sell your scrap online with Scrapi. Request convenient doorstep scrap pickup, get your materials weighed, and connect with our scrap collection team.",
  path: "/",
  keywords: [
    "scrap pickup service",
    "scrap collection near me",
    "sell scrap online",
    "doorstep scrap pickup",
    "kabadiwala near me",
  ],
});

const homePageSchema = webPageJsonLd({
  name: "Scrapi – Online Scrap Pickup & Doorstep Scrap Collection in India",
  description:
    "Sell your scrap online with Scrapi. Request a doorstep scrap pickup, get your materials weighed, and connect with the Scrapi collection team.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageSchema} />
      <Hero />
      <HomepageAdBanner />
      <WeighingAccuracy />
      <HowItWorks />
      <CTASection />
      <CircularJourney />
      <ContactFloat />
    </>
  );
}
