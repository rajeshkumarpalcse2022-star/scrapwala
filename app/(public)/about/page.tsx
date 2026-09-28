import type { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";
import WhoWeAre from "@/components/about/WhoWeAre";
import MissionSection from "@/components/about/MissionSection";
import WhatWeDo from "@/components/about/WhatWeDo";
import CoreValues from "@/components/about/CoreValues";
import ImpactSection from "@/components/about/ImpactSection";
import AboutCTA from "@/components/about/AboutCTA";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about ScrapWala's mission to make scrap recycling easy, accessible, and rewarding for everyone.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <WhoWeAre />
      <MissionSection />
      <WhatWeDo />
      <CoreValues />
      <ImpactSection />
      <AboutCTA />
    </>
  );
}
