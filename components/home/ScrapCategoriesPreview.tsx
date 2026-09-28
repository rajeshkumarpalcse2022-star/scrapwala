import Link from "next/link";
import {
  FileText,
  Package,
  Atom,
  CircleDot,
  Cpu,
  Zap,
  ArrowRight,
} from "lucide-react";
import Container from "@/components/common/Container";

const categories = [
  { name: "Paper", icon: FileText },
  { name: "Plastic", icon: Atom },
  { name: "Metal", icon: CircleDot },
  { name: "Cardboard", icon: Package },
  { name: "E-Waste", icon: Cpu },
  { name: "Appliances", icon: Zap },
];

export default function ScrapCategoriesPreview() {
  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What can you recycle with us?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted">
            We accept a wide range of recyclable materials from your home or office.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.name}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light transition-colors group-hover:bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold text-foreground">{cat.name}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/scrap-categories"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-dark"
          >
            View All Categories
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
