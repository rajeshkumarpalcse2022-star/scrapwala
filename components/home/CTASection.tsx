import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "@/components/common/Container";

export default function CTASection() {
  return (
    <section className="py-14 sm:py-20 lg:py-24">
      <Container>
        <div className="flex flex-col items-center text-center">
          {/* Heading */}
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Recyclables we pick
          </h2>

          {/* Subheading */}
          <p className="mt-3 max-w-xs text-sm font-normal text-muted sm:max-w-none sm:text-lg">
            Paper | Plastic | Metals | E-Waste | Appliances &amp; More
          </p>

          {/* Image */}
          <div className="mt-8 w-full max-w-[750px] sm:mt-10">
            <Image
              src="/images/recyclables-we-pick.png"
              alt="Recyclables we pick — Paper, Plastic, Clothes, Metal, E-Waste and more recyclable items"
              width={772}
              height={323}
              sizes="(max-width: 750px) 100vw, 750px"
              className="h-auto w-full"
            />
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row sm:gap-4">
            <Link
              href="/scrap-rates"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-foreground/90 sm:px-8 sm:py-3.5 sm:text-base"
            >
              See Full Price List
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/scrap-categories"
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-card px-7 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-light sm:px-8 sm:py-3.5 sm:text-base"
            >
              Browse Scrap Categories
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
