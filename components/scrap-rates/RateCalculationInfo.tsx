import { ClipboardList, Search, Scale, IndianRupee } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "@/components/about/FadeIn";

const steps = [
  {
    icon: ClipboardList,
    title: "Select Your Material",
    text: "Choose the scrap category and item you want to sell.",
  },
  {
    icon: Search,
    title: "Check the Indicative Rate",
    text: "Review the estimated rate shown for that material.",
  },
  {
    icon: Scale,
    title: "Our Team Weighs the Scrap",
    text: "A verified collection partner weighs the items at pickup.",
  },
  {
    icon: IndianRupee,
    title: "Final Value Is Calculated",
    text: "You receive payment based on the actual measured weight.",
  },
];

export default function RateCalculationInfo() {
  return (
    <section className="bg-primary-light/40 py-16 sm:py-20">
      <Container>
        <FadeIn className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            How ScrapWala Rates Work
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
            The final amount can depend on material type, quality, quantity and
            the measured weight at pickup.
          </p>
        </FadeIn>

        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <FadeIn key={step.title} delay={i * 0.08}>
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-5 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" strokeWidth={1.8} />
                </div>
                <span className="text-xs font-bold text-primary">Step {i + 1}</span>
                <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs leading-relaxed text-muted">{step.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
