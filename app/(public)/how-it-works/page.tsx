import type { Metadata } from "next";
import Link from "next/link";
import {
  ListChecks,
  MapPin,
  MapPinned,
  CalendarCheck,
  Clock,
  ClipboardCheck,
  UserCheck,
  Scale,
  Calculator,
  Banknote,
  Calendar,
} from "lucide-react";
import Container from "@/components/common/Container";
import JsonLd from "@/components/seo/JsonLd";
import {
  breadcrumbJsonLd,
  buildMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const description =
  "Discover how Scrapi makes scrap collection simple. Select materials, schedule a pickup, and let our team handle the collection process.";

export const metadata: Metadata = buildMetadata({
  title: "How Scrapi Works – Simple Doorstep Scrap Pickup Process",
  absoluteTitle: true,
  description,
  path: "/how-it-works",
  keywords: [
    "doorstep scrap pickup",
    "scrap pickup service",
    "book scrap pickup",
  ],
});

const steps = [
  {
    number: 1,
    title: "Select Your Scrap",
    description: "Browse through our scrap categories and select the items you want to hand over.",
    icon: ListChecks,
  },
  {
    number: 2,
    title: "Enter Your Address",
    description: "Provide your pickup address so our collection partner can reach you.",
    icon: MapPin,
  },
  {
    number: 3,
    title: "Check Serviceability",
    description: "We verify whether your location is within our serviceable areas.",
    icon: MapPinned,
  },
  {
    number: 4,
    title: "Choose Pickup Date",
    description: "Select a convenient date for the scrap collection.",
    icon: CalendarCheck,
  },
  {
    number: 5,
    title: "Choose Time Slot",
    description: "Pick an available time slot that fits your schedule.",
    icon: Clock,
  },
  {
    number: 6,
    title: "Confirm Pickup",
    description: "Review your booking details and confirm the pickup request.",
    icon: ClipboardCheck,
  },
  {
    number: 7,
    title: "Collector Visits",
    description: "Our verified collection partner arrives at your doorstep at the scheduled time.",
    icon: UserCheck,
  },
  {
    number: 8,
    title: "Scrap Is Weighed",
    description: "Your scrap items are weighed on-site using calibrated equipment.",
    icon: Scale,
  },
  {
    number: 9,
    title: "Amount Is Calculated",
    description: "The final amount is calculated based on weight and applicable scrap rates.",
    icon: Calculator,
  },
  {
    number: 10,
    title: "Payment Completed",
    description: "Payment is completed digitally and you receive a confirmation.",
    icon: Banknote,
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "How It Works", path: "/how-it-works" },
        ])}
      />
      <JsonLd
        data={webPageJsonLd({
          name: "How Scrapi Works",
          description,
          path: "/how-it-works",
        })}
      />
      <section className="bg-primary-light py-16">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            From scheduling a pickup to receiving payment, here is the complete
            step-by-step process of how Scrapi works.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              The doorstep scrap pickup process
            </h2>
            <div className="relative space-y-1">
              {/* Vertical line */}
              <div
                className="absolute left-6 top-0 bottom-0 w-px bg-border md:left-8"
                aria-hidden="true"
              />
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.number} className="relative flex gap-6 py-6 md:gap-8">
                    <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card md:h-16 md:w-16">
                      <Icon className="h-5 w-5 text-primary md:h-6 md:w-6" aria-hidden="true" />
                    </div>
                    <div className="pt-1 md:pt-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">
                        Step {step.number}
                      </span>
                      <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/pickup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
            >
              <Calendar className="h-5 w-5" aria-hidden="true" />
              Schedule a Pickup
            </Link>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">
            Before booking, you can review the{" "}
            <Link
              href="/scrap-categories"
              className="font-semibold text-primary hover:underline"
            >
              scrap categories we accept
            </Link>{" "}
            and check the latest{" "}
            <Link
              href="/scrap-rates"
              className="font-semibold text-primary hover:underline"
            >
              indicative scrap rates
            </Link>
            .
          </p>
        </Container>
      </section>
    </>
  );
}
