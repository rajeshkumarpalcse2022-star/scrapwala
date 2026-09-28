import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  Package,
  Atom,
  CircleDot,
  Shield,
  Wrench,
  Cpu,
  Zap,
  Layers,
  Calendar,
} from "lucide-react";
import Container from "@/components/common/Container";
import {
  listPublicCategories,
  listPublicSubcategories,
} from "@/services/category";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scrap Categories",
  description:
    "Explore the types of scrap materials accepted by ScrapWala — paper, plastic, metals, e-waste, appliances, and more.",
};

const ICONS: { test: RegExp; icon: React.ElementType }[] = [
  { test: /paper|book|news|cardboard/i, icon: FileText },
  { test: /carton|box|package/i, icon: Package },
  { test: /plastic|pet|bottle/i, icon: Atom },
  { test: /metal|iron|steel/i, icon: CircleDot },
  { test: /copper|brass|alumin|wire/i, icon: Wrench },
  { test: /e-?waste|electronic|gadget/i, icon: Cpu },
  { test: /appliance|fan|cooler/i, icon: Zap },
  { test: /glass/i, icon: Shield },
];

function iconFor(name: string): React.ElementType {
  return ICONS.find((entry) => entry.test.test(name))?.icon || Layers;
}

export default async function ScrapCategoriesPage() {
  const parents = await listPublicCategories();
  const categories = await Promise.all(
    parents.map(async (parent) => ({
      ...parent,
      subcategories: await listPublicSubcategories(parent.id),
    }))
  );

  return (
    <>
      <section className="bg-primary-light py-16">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Scrap Categories
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            We accept a wide range of recyclable materials. Browse the categories below
            to see what you can hand over for responsible recycling.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
              <p className="text-base font-semibold text-foreground">
                No scrap categories published yet
              </p>
              <p className="mt-2 text-sm text-muted">
                Please check back soon — our accepted scrap list is being updated.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const Icon = iconFor(cat.name);
                return (
                  <div
                    key={cat.id}
                    className="rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
                      <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {cat.name}
                      </h2>
                      <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                        {cat.subcategoryCount} item
                        {cat.subcategoryCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted">{cat.description}</p>
                    {cat.subcategories.length > 0 && (
                      <p className="mt-2 text-xs text-muted">
                        <span className="font-medium">Includes:</span>{" "}
                        {cat.subcategories.map((sub) => sub.name).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link
              href="/pickup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/30"
            >
              <Calendar className="h-5 w-5" aria-hidden="true" />
              Schedule a Pickup
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
