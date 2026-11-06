import type { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";
import WhoWeAre from "@/components/about/WhoWeAre";
import MissionSection from "@/components/about/MissionSection";
import WhatWeDo from "@/components/about/WhatWeDo";
import CoreValues from "@/components/about/CoreValues";
import ImpactSection from "@/components/about/ImpactSection";
import AboutCTA from "@/components/about/AboutCTA";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const description =
  "Learn about Scrapi and our mission to simplify scrap collection, responsible recycling, and convenient doorstep pickup services.";

export const metadata: Metadata = buildMetadata({
  title: "About Scrapi – Making Scrap Collection Easier and Smarter",
  absoluteTitle: true,
  description,
  path: "/about",
  keywords: ["scrap management company", "scrap recycling service"],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <JsonLd
        data={webPageJsonLd({
          name: "About Scrapi",
          description,
          path: "/about",
        })}
      />
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
