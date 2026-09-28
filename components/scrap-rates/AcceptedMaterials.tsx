import { Check, X } from "lucide-react";
import Container from "@/components/common/Container";
import { NOT_ACCEPTED_MATERIALS } from "@/lib/constants/scrapRates";
import {
  listPublicCategories,
  listPublicSubcategories,
} from "@/services/category";
import FadeIn from "@/components/about/FadeIn";

export default async function AcceptedMaterials() {
  const parents = await listPublicCategories();
  const groups = await Promise.all(
    parents.map((parent) => listPublicSubcategories(parent.id))
  );
  const accepted = groups.flat().map((sub) => sub.name);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2">
          {/* Accepted */}
          <FadeIn>
            <h3 className="text-lg font-bold text-foreground">Materials We Accept</h3>
            {accepted.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {accepted.map((mat) => (
                  <li key={mat} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-foreground">{mat}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Our accepted materials list is being updated. Check the scrap
                categories page for the latest.
              </p>
            )}
          </FadeIn>

          {/* Not accepted */}
          <FadeIn delay={0.1}>
            <h3 className="text-lg font-bold text-foreground">Items We May Not Accept</h3>
            <ul className="mt-4 space-y-3">
              {NOT_ACCEPTED_MATERIALS.map((mat) => (
                <li key={mat} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <X className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                  </span>
                  <span className="text-sm text-muted">{mat}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">
              Some materials may not be eligible for pickup depending on location
              and condition.
            </p>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}
