import { BadgeIndianRupee, Truck, CalendarCheck, Leaf } from "lucide-react";
import Container from "@/components/common/Container";
import SectionHeading from "@/components/common/SectionHeading";

const principles = [
  {
    title: "Clear Pricing",
    description: "Rates are displayed before booking. You know what you will earn before the pickup happens.",
    icon: BadgeIndianRupee,
  },
  {
    title: "Convenient Pickup",
    description: "Choose your preferred date and time. We come to you, so you do not have to travel.",
    icon: Truck,
  },
  {
    title: "Simple Booking",
    description: "A straightforward online process that takes only a few minutes to complete.",
    icon: CalendarCheck,
  },
  {
    title: "Responsible Recycling",
    description: "We work with verified recycling partners to ensure your scrap is processed properly.",
    icon: Leaf,
  },
];

export default function TrustSection() {
  return (
    <section className="py-20">
      <Container>
        <SectionHeading
          title="Built on Trust"
          subtitle="Our platform is designed around transparency, convenience, and environmental responsibility."
        />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light">
                  <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
