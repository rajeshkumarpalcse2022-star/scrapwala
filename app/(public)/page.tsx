import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import HomepageAdBanner from "@/components/home/HomepageAdBanner";
import WeighingAccuracy from "@/components/home/WeighingAccuracy";
import HowItWorks from "@/components/home/HowItWorks";
import CTASection from "@/components/home/CTASection";
import CircularJourney from "@/components/home/CircularJourney";
import ContactFloat from "@/components/common/ContactFloat";

export const metadata: Metadata = {
  title: "Doorstep Scrap Pickup & Recycling",
  description:
    "Schedule a convenient doorstep scrap pickup and turn your recyclable items into value with ScrapWala.",
};

export default function HomePage() {
  return (
    <>
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
