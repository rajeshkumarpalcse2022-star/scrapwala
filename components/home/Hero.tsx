import Image from "next/image";
import { Leaf } from "lucide-react";
import Container from "@/components/common/Container";
import SchedulePickupButton from "@/components/home/SchedulePickupButton";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Background decorative blurs — behind everything */}
      <div className="pointer-events-none absolute -right-40 top-0 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/[0.04] blur-3xl" aria-hidden="true" />

      <Container className="relative">
        <div className="flex flex-col items-center gap-10 pb-14 pt-4 sm:gap-12 sm:pb-16 lg:min-h-[580px] lg:flex-row lg:items-center lg:gap-4 lg:py-0">
          {/* ── LEFT — Content ── */}
          <div className="flex-1 text-center lg:text-left">
            {/* Pill badge */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 sm:mb-6">
              <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="text-xs font-medium text-primary">A Cleaner India Starts With You</span>
            </div>

            {/* Headline */}
            <h1 className="text-[1.75rem] font-bold leading-[1.12] tracking-tight text-foreground min-[400px]:text-4xl sm:text-5xl lg:text-6xl">
              Turn your scrap into value,{" "}
              <span className="text-primary">right from your doorstep</span>
            </h1>

            {/* Supporting text */}
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted sm:mt-6 sm:text-lg lg:mx-0">
              Schedule a doorstep scrap pickup, choose a convenient time, and get
              paid after collection.
            </p>

            {/* CTA pill container */}
            <div className="mx-auto mt-8 w-full max-w-[420px] sm:mt-10 lg:mx-0 lg:max-w-[460px]">
              <SchedulePickupButton />

              {/* Rating badge */}
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                  ⭐ 4.0 | 1M Users
                </span>
              </div>
            </div>
          </div>

          {/* ── RIGHT — Hero Image ── */}
          <div className="relative flex w-full flex-1 justify-center lg:justify-end lg:pl-4">
            {/* Very subtle soft glow behind image */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-primary/[0.05] blur-3xl sm:h-[560px] sm:w-[560px] lg:h-[640px] lg:w-[640px]" aria-hidden="true" />

            {/* Hero image — clean, no border */}
            <div className="relative z-10 h-[300px] w-full max-w-[420px] sm:h-[460px] sm:max-w-[600px] lg:h-[560px] lg:max-w-[650px]">
              <Image
                src="/images/scrapwala-hero.png"
                alt="Scrapi recycling worker collecting recyclable materials for doorstep scrap pickup"
                fill
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 600px, 650px"
                className="object-contain object-center"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
