import { Search } from "lucide-react";
import Container from "@/components/common/Container";

export default function ScrapRatesHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-light via-background to-primary-light/30 py-16 sm:py-20">
      <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-16 bottom-10 h-48 w-48 rounded-full bg-primary/[0.04] blur-2xl" aria-hidden="true" />

      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            Scrap Rates
          </span>
          <h1 className="mt-6 text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Check Scrap Rates{" "}
            <span className="text-primary">Before You Sell</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Know the estimated value of your recyclable materials and schedule a
            convenient doorstep pickup with ScrapWala.
          </p>
          <div className="mx-auto mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Search className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Browse rates, search items, and book a pickup</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
