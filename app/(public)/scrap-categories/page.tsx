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
import JsonLd from "@/components/seo/JsonLd";
import {
  listPublicCategories,
  listPublicSubcategories,
} from "@/services/category";
import {
  breadcrumbJsonLd,
  buildMetadata,
  webPageJsonLd,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

const description =
  "Explore scrap materials accepted by Scrapi, understand available categories, and request a doorstep scrap pickup.";

export const metadata: Metadata = buildMetadata({
  title: "Scrap Categories – Explore Materials You Can Sell | Scrapi",
  absoluteTitle: true,
  description,
  path: "/scrap-categories",
  keywords: [
    "scrap categories",
    "sell scrap online",
    "recyclable materials",
    "scrap pickup service",
  ],
});

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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Scrap Categories", path: "/scrap-categories" },
        ])}
      />
      <JsonLd
        data={webPageJsonLd({
          name: "Scrap Categories",
          description,
          path: "/scrap-categories",
        })}
      />
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

          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Sell scrap online with doorstep pickup
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Scrapi helps you sell scrap online without travelling to a
              kabadiwala. Browse the categories above, check current{" "}
              <Link
                href="/scrap-rates"
                className="font-semibold text-primary hover:underline"
              >
                scrap rates
              </Link>
              , and schedule a doorstep scrap pickup at a time that suits you.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
              Want to understand what happens after booking? Read the{" "}
              <Link
                href="/how-it-works"
                className="font-semibold text-primary hover:underline"
              >
                step-by-step Scrapi pickup process
              </Link>{" "}
              or explore our{" "}
              <Link
                href="/blogs"
                className="font-semibold text-primary hover:underline"
              >
                recycling guides
              </Link>{" "}
              for help preparing your materials.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
