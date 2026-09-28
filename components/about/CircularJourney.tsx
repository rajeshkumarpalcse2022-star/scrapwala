import Image from "next/image";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

export default function CircularJourney() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <FadeIn className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From Pickup to Recycling:{" "}
            <span className="text-primary">The ScrapWala Circular Journey</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            Every pickup is a small step toward a more circular future.
          </p>
        </FadeIn>
      </Container>

      {/* Full-bleed journey image */}
      <FadeIn delay={0.15} className="relative mx-auto mt-8 w-full max-w-[1400px]">
        {/* Edge blending */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 sm:w-16"
          style={{ background: "linear-gradient(to right, var(--background, #eef7f0) 0%, transparent 100%)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 sm:w-16"
          style={{ background: "linear-gradient(to left, var(--background, #eef7f0) 0%, transparent 100%)" }}
          aria-hidden="true"
        />

        <Image
          src="/images/scrapwala-journey.png"
          alt="ScrapWala circular journey — from doorstep pickup to collection point, partner recyclers, and recycled products resold"
          width={2172}
          height={724}
          priority
          className="h-auto w-full"
        />
      </FadeIn>
    </section>
  );
}
