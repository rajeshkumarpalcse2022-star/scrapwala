import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import Container from "@/components/common/Container";
import ContactForm from "@/components/common/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with ScrapWala for any questions about scrap pickup, rates, or recycling.",
};

export default function ContactPage() {
  return (
    <>
      <section className="bg-primary-light py-16">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Contact Us
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Have a question or want to get in touch? Fill out the form below or reach
            out using the contact details provided.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Form */}
            <div className="lg:col-span-3">
              <ContactForm />
            </div>

            {/* Contact info */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Contact Information
                  </h3>
                  <ul className="mt-4 space-y-4">
                    <li className="flex items-start gap-3 text-sm text-muted">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>hello@scrapwala.example</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-muted">
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>hello@scrapwala.example</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-muted">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>Kolkata, West Bengal, India</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Business Hours
                  </h3>
                  <ul className="mt-4 space-y-2 text-sm text-muted">
                    <li>Monday &ndash; Saturday: 9:00 AM &ndash; 6:00 PM</li>
                    <li>Sunday: Closed</li>
                  </ul>
                  <p className="mt-3 text-xs text-muted italic">
                    Hours are indicative and may vary by location.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
