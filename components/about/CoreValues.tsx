import { Leaf, ShieldCheck, BadgeIndianRupee, Cpu } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

const values = [
  {
    icon: Leaf,
    title: "Environmental Responsibility",
    text: "Reducing unnecessary waste and encouraging responsible recycling practices.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Reliability",
    text: "Building a clear and dependable experience for every customer interaction.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Fair Pricing",
    text: "Keeping pricing transparent, honest and easy to understand.",
  },
  {
    icon: Cpu,
    title: "Technological Innovation",
    text: "Using technology to make scrap collection more convenient and efficient.",
  },
];

export default function CoreValues() {
  return (
    <section className="bg-primary-light/40 py-20 sm:py-24">
      <Container>
        <FadeIn className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Our Core Values
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            The principles that guide everything we do at ScrapWala.
          </p>
        </FadeIn>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2">
          {values.map((v, i) => (
            <FadeIn key={v.title} delay={i * 0.1}>
              <div className="flex items-start gap-5 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <v.icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{v.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{v.text}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
