import { Mail, Phone, MapPin } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

export default function ImpactSection() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <FadeIn className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Get in Touch
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            Have a question or want to partner with us? We would love to hear from you.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Email</h3>
            <p className="text-sm text-muted">hello@scrapwala.example</p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Phone</h3>
            <p className="text-sm text-muted">hello@scrapwala.example</p>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-6 w-6 text-primary" strokeWidth={1.8} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Location</h3>
            <p className="text-sm text-muted">India</p>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
