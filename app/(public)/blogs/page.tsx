import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import Container from "@/components/common/Container";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Read the latest articles and tips about scrap recycling, sustainability, and eco-friendly living from ScrapWala.",
};

export default function BlogsPage() {
  return (
    <>
      <section className="bg-primary-light py-16">
        <Container>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Blogs
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Articles and updates about scrap collection, recycling, and sustainability.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted-light">
              <BookOpen className="h-8 w-8 text-muted" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Coming Soon</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Our blog section is under development. We will share articles about
              recycling best practices, scrap management tips, and platform updates
              in the future.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
