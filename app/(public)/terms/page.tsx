import type { Metadata } from "next";
import Container from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions governing the use of ScrapWala services.",
};

export default function TermsPage() {
  return (
    <>
      <section className="bg-primary-light py-16">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Please read these terms carefully before using ScrapWala services.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-3xl space-y-8 text-base leading-relaxed text-muted">
            <p>
              Welcome to ScrapWala. By accessing or using our platform and services,
              you agree to be bound by these Terms &amp; Conditions.
            </p>

            <h2 className="text-xl font-bold text-foreground">1. Service Overview</h2>
            <p>
              ScrapWala is a digital platform that connects customers with scrap
              collection partners for doorstep pickup of recyclable materials.
            </p>

            <h2 className="text-xl font-bold text-foreground">2. User Eligibility</h2>
            <p>
              You must be at least 18 years of age to use our services. By using
              ScrapWala, you confirm that you meet this eligibility requirement.
            </p>

            <h2 className="text-xl font-bold text-foreground">3. Booking &amp; Cancellation</h2>
            <p>
              Pickup bookings are subject to availability. We reserve the right to
              cancel or reschedule pickups as necessary. You may cancel a booking
              before the scheduled pickup time.
            </p>

            <h2 className="text-xl font-bold text-foreground">4. Pricing &amp; Payment</h2>
            <p>
              Scrap rates are displayed on our platform and may vary. Payment is made
              at the time of collection based on the actual weight and type of
              materials provided.
            </p>

            <h2 className="text-xl font-bold text-foreground">5. Limitation of Liability</h2>
            <p>
              ScrapWala acts as an intermediary between customers and collection
              partners. We are not liable for any issues arising from the collection
              process beyond our direct control.
            </p>

            <p className="text-sm text-muted/70">
              Last updated: September 2026
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
