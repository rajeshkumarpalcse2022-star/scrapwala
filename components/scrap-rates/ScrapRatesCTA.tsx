import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "@/components/about/FadeIn";

export default function ScrapRatesCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary py-16 sm:py-20">
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-0 right-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />

      <Container>
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Turn Your Scrap Into Value?
          </h2>
          <p className="mt-4 text-base text-white/80 sm:text-lg">
            Schedule a pickup and let ScrapWala handle the collection.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/pickup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              Schedule a Pickup
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              View How It Works
            </Link>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
