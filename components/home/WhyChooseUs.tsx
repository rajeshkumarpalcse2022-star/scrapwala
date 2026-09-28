import {
  MapPin,
  BadgeIndianRupee,
  CalendarClock,
  Leaf,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import Container from "@/components/common/Container";
import SectionHeading from "@/components/common/SectionHeading";

const features = [
  {
    title: "Doorstep Pickup",
    description: "No need to travel. We come to your location to collect the scrap.",
    icon: MapPin,
  },
  {
    title: "Transparent Rates",
    description: "View rates upfront before you schedule. No hidden charges or surprises.",
    icon: BadgeIndianRupee,
  },
  {
    title: "Convenient Scheduling",
    description: "Pick a date and time slot that fits your routine.",
    icon: CalendarClock,
  },
  {
    title: "Responsible Recycling",
    description: "Your scrap is processed through verified recycling partners.",
    icon: Leaf,
  },
  {
    title: "Easy Online Booking",
    description: "Book your pickup in minutes through a simple digital interface.",
    icon: Smartphone,
  },
  {
    title: "Secure Payments",
    description: "Payments are completed digitally with proper confirmation.",
    icon: ShieldCheck,
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          title="Why Choose ScrapWala"
          subtitle="We make the scrap collection experience simple, fair, and dependable."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
