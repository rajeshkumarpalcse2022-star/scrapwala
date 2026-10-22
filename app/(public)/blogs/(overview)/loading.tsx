import Container from "@/components/common/Container";

/** Skeleton shown while the blog listing server-renders (force-dynamic). */
export default function BlogLoading() {
  return (
    <main>
      <section className="border-b border-border bg-primary-light">
        <Container className="py-10 sm:py-14 lg:py-16">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-xl">
              <div className="h-6 w-36 animate-pulse rounded-full bg-foreground/10" />
              <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-foreground/10" />
              <div className="mt-3 h-6 w-3/4 animate-pulse rounded-lg bg-foreground/10" />
              <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-foreground/10" />
            </div>
            <div className="aspect-[16/9] animate-pulse rounded-2xl bg-foreground/10" />
          </div>
        </Container>
      </section>

      <section className="py-8 sm:py-10">
        <Container>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-8 w-24 animate-pulse rounded-full bg-muted-light"
              />
            ))}
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="aspect-[16/10] animate-pulse bg-muted-light" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted-light" />
                  <div className="h-5 w-full animate-pulse rounded bg-muted-light" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted-light" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
