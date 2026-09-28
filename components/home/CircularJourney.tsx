import Image from "next/image";
import Container from "@/components/common/Container";

export default function CircularJourney() {
  return (
    <section className="relative py-16 sm:py-20">
      {/* Heading */}
      <Container>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            From Pickup to Recycling:{" "}
            <span className="text-primary">The ScrapWala Circular Journey</span>
          </h2>
        </div>
      </Container>

      {/* Full-bleed journey image — embedded into section */}
      <div className="relative mx-auto mt-10 w-full max-w-[1400px]">
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
          alt="ScrapWala circular journey — from doorstep pickup to collection point, partner recyclers, and recycled products resold"
          width={2172}
          height={724}
          priority
          className="relative z-0 h-auto w-full"
        />
      </div>
    </section>
  );
}
