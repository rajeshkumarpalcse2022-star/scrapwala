import Image from "next/image";
import Container from "@/components/common/Container";

export default function WeighingAccuracy() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:justify-center lg:gap-20">
          {/* LEFT — Image */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative h-[280px] w-[280px] sm:h-[320px] sm:w-[320px] lg:h-[380px] lg:w-[380px]">
              <Image
                src="/images/scrapuncle-weighing.png"
                alt="ScrapWala smart digital weighing scale for accurate scrap weighing"
                fill
                priority
                sizes="(max-width: 1024px) 320px, 380px"
                className="object-contain"
              />
            </div>
          </div>

          {/* RIGHT — Text */}
          <div className="flex-1 max-w-[520px] text-center lg:text-left">
            {/* Main heading */}
            <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
              <span className="text-primary">100%</span>{" "}
              <span className="text-foreground">weighing</span>
              <br />
              <span className="text-foreground">accuracy guaranteed</span>
            </h2>

            {/* Subheading */}
            <p className="mt-5 max-w-[680px] text-base font-normal leading-relaxed text-muted sm:text-lg lg:mx-0 mx-auto">
              Powered by ScrapWala&apos;s Smart Digital Weighing Scales
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
