import { ListChecks, CalendarCheck, Truck, Banknote } from "lucide-react";
import Container from "@/components/common/Container";

const steps = [
  {
    number: "01",
    title: "Select Scrap",
    description: "Choose the items you want to hand over.",
    icon: ListChecks,
    delay: "0s",
  },
  {
    number: "02",
    title: "Schedule Pickup",
    description: "Pick a date and time that works for you.",
    icon: CalendarCheck,
    delay: "0.35s",
  },
  {
    number: "03",
    title: "We Collect",
    description: "Our partner arrives at your doorstep.",
    icon: Truck,
    delay: "0.7s",
  },
  {
    number: "04",
    title: "Get Paid",
    description: "Scrap is weighed and you get paid.",
    icon: Banknote,
    delay: "1.05s",
  },
];

export default function HowItWorks() {
  return (
    <section className="overflow-hidden bg-muted-light py-14 sm:py-20 lg:py-24">
      <Container>
        {/* Heading */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            Best Value for your Scrap in{" "}
            <span className="text-primary">4 simple steps</span>
          </h2>
        </div>

        {/* Steps grid */}
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-2 gap-x-5 gap-y-8 sm:mt-14 sm:gap-12 lg:mt-16 lg:grid-cols-4 lg:gap-8">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="flex flex-col items-center text-center">
                {/* Circular pulse icon */}
                <div className="hiw-pulse-wrap">
                  {/* Expanding pulse rings */}
                  <div className="hiw-pulse-ring" style={{ animationDelay: step.delay }} aria-hidden="true" />
                  <div className="hiw-pulse-ring" style={{ animationDelay: step.delay }} aria-hidden="true" />

                  {/* Static concentric rings */}
                  <div className="hiw-ring-outer" aria-hidden="true" />
                  <div className="hiw-ring-mid" aria-hidden="true" />

                  {/* Icon circle */}
                  <div className="hiw-icon-circle">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                </div>

                {/* Step number */}
                <span className="mt-4 text-[10px] font-bold uppercase tracking-widest text-primary sm:mt-6 sm:text-xs">
                  Step {step.number}
                </span>

                {/* Step title */}
                <h3 className="mt-1.5 text-base font-bold text-foreground sm:mt-2 sm:text-lg">
                  {step.title}
                </h3>

                {/* Step description */}
                <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-muted sm:mt-2 sm:text-sm">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
