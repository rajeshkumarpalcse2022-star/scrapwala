import Image from "next/image";
import Container from "@/components/common/Container";

export default function CircularJourney() {
  return (
    <section className="relative py-12 sm:py-16 lg:py-20">
      {/* Heading */}
      <Container>
        <div className="text-center">
          <h2 className="px-2 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            From Pickup to Recycling:{" "}
            <span className="text-primary">The Scrapi Circular Journey</span>
          </h2>
        </div>
      </Container>

      {/* Journey image — full-bleed on desktop, swipeable on mobile */}
      <div className="relative mt-8 w-full sm:mt-10">
        {/* Mobile: horizontal scroll so the wide infographic stays legible */}
        <div className="overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] lg:overflow-visible lg:pb-0">
          <div className="relative min-w-[760px] px-4 sm:min-w-[900px] sm:px-6 lg:min-w-0 lg:px-0">
                {/* Edge blending — left */}
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 sm:w-10"
              style={{
                background: "linear-gradient(to right, var(--background, #eef7f0) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />
            {/* Edge blending — right */}
            <div
              className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 sm:w-16"
              style={{
                background: "linear-gradient(to left, var(--background, #eef7f0) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />
            {/* Edge blending — top */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 sm:h-16"
              style={{
                background: "linear-gradient(to bottom, var(--background, #eef7f0) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />
            {/* Edge blending — bottom */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 sm:h-16"
              style={{
                background: "linear-gradient(to top, var(--background, #eef7f0) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />

            <Image
              src="/images/scrapwala-journey.png"
              alt="Scrapi circular journey — from doorstep pickup to collection point, partner recyclers, and recycled products resold"
              width={2172}
              height={724}
              priority
              className="relative z-0 h-auto w-full"
            />
          </div>
        </div>

        {/* Mobile-only swipe hint */}
        <p className="mt-1 px-6 text-center text-xs text-muted lg:hidden">
          ← Swipe to see the full journey →
        </p>
      </div>
    </section>
  );
}
