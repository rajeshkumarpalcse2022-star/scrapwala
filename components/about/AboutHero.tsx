import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "@/components/common/Container";
import ScrapMaterialIconCloud from "@/components/home/ScrapMaterialIconCloud";

export default function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-light via-background to-primary-light/30 py-20 sm:py-28">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-primary/[0.04] blur-2xl" aria-hidden="true" />

      <Container>
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              About ScrapWala
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Making Scrap Collection{" "}
              <span className="text-primary">Simple &amp; Sustainable</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
              ScrapWala makes it easier for households and businesses to schedule
              scrap pickups, get transparent value for recyclable materials, and
              contribute to a cleaner tomorrow.
            </p>
            <div className="mt-8 flex justify-center lg:justify-start">
              <Link
                href="/pickup"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-xl"
              >
                Schedule a Pickup
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className="relative flex flex-1 justify-center">
            <ScrapMaterialIconCloud />
          </div>
        </div>
      </Container>
    </section>
  );
}
