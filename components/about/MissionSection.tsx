import { Recycle } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

export default function MissionSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary to-secondary py-20 sm:py-24">
      {/* Decorative shapes */}
      <div className="pointer-events-none absolute left-10 top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-10 right-16 h-52 w-52 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

      <Container>
        <FadeIn className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-white/15">
            <Recycle className="h-10 w-10 text-white" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Our Mission
          </h2>
          <p className="mt-6 text-xl leading-relaxed text-white/90 sm:text-2xl">
            To make responsible waste disposal simple while helping recyclable
            materials move back into the circular economy.
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70">
            We believe recycling should not be complicated. By combining
            technology, convenient pickup services and transparent processes,
            ScrapWala aims to make responsible recycling a simple part of everyday life.
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
