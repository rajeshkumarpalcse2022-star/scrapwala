import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Container from "@/components/common/Container";

export default function CTASection() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-center text-center">
          {/* Heading */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Recyclables we pick
          </h2>

          {/* Subheading */}
          <p className="mt-3 text-base font-normal text-muted sm:text-lg">
            Paper | Plastic | Metals | E-Waste | Appliances &amp; More
          </p>

          {/* Image */}
          <div className="mt-10 w-full max-w-[750px]">
            <Image
              src="/images/recyclables-we-pick.png"
              alt="Recyclables we pick — Paper, Plastic, Clothes, Metal, E-Waste and more recyclable items"
              width={772}
              height={323}
              priority
              className="h-auto w-full"
            />
          </div>

          {/* CTA Button */}
          <Link
            href="/scrap-rates"
            className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-foreground/90"
          >
            See Full Price List
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
