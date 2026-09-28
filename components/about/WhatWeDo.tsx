import { Calendar, Truck, IndianRupee, Recycle, UserCheck, HeartHandshake } from "lucide-react";
import Container from "@/components/common/Container";
import FadeIn from "./FadeIn";

const features = [
  {
    icon: Calendar,
    title: "Convenient Scheduling",
    text: "Book a pickup at a date and time that works best for you.",
  },
  {
    icon: Truck,
    title: "Door-to-Door Collection",
    text: "Our collection partners come directly to your doorstep.",
  },
  {
    icon: IndianRupee,
    title: "Transparent Pricing",
    text: "Clear, upfront rates based on scrap category and quantity.",
  },
  {
    icon: Recycle,
    title: "Responsible Recycling",
    text: "Your recyclables are channelled toward proper recovery and reuse.",
  },
  {
    icon: UserCheck,
    title: "Professional Collection",
    text: "Verified and trained collection partners for a dependable experience.",
  },
  {
    icon: HeartHandshake,
    title: "Easy Customer Experience",
    text: "A smooth, hassle-free process from request to final collection.",
  },
];

export default function WhatWeDo() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <FadeIn className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What We Do
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg">
            Everything you need for a simpler scrap collection experience.
          </p>
        </FadeIn>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.08}>
              <div className="group flex h-full flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
                  <f.icon className="h-7 w-7 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}
