import { Recycle, Leaf, Package, Cpu } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

export default function WhoWeAre() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-start lg:gap-20">
          {/* Left — Text */}
          <FadeIn className="flex-1 text-center lg:text-left">
            <div className="mx-auto max-w-lg lg:mx-0">
              <div className="mb-6 h-1 w-12 rounded-full bg-primary" />
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Who We Are
              </h2>
              <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
                ScrapWala is a modern doorstep scrap collection platform built to make
                recycling convenient, transparent, and accessible.
              </p>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                From newspapers and cardboard to plastics, metals, e-waste and old
                appliances, ScrapWala helps people give their recyclable materials
                a more responsible next step.
              </p>
            </div>
          </FadeIn>

          {/* Right — Visual */}
          <FadeIn delay={0.15} className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Recycle, label: "Recycling" },
                { icon: Leaf, label: "Eco-Friendly" },
                { icon: Package, label: "Materials" },
                { icon: Cpu, label: "Technology" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <item.icon className="h-7 w-7 text-primary" strokeWidth={1.8} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
