import Container from "@/components/common/Container";

/** Skeleton shown while the blog listing server-renders (force-dynamic). */
export default function BlogLoading() {
  return (
    <main>
      <section className="bg-gradient-to-br from-primary-dark via-primary to-secondary">
        <Container className="py-12 sm:py-16 lg:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div className="max-w-xl">
              <div className="h-6 w-36 animate-pulse rounded-full bg-white/20" />
              <div className="mt-4 h-10 w-full animate-pulse rounded-lg bg-white/20" />
              <div className="mt-3 h-10 w-3/4 animate-pulse rounded-lg bg-white/20" />
              <div className="mt-4 h-5 w-full animate-pulse rounded bg-white/15" />
              <div className="mt-7 h-14 w-full animate-pulse rounded-2xl bg-white/90" />
              <div className="mt-7 flex gap-5">
                <div className="h-4 w-20 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-20 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-24 animate-pulse rounded bg-white/20" />
              </div>
            </div>
            <div className="aspect-[16/9] animate-pulse rounded-3xl bg-white/20 lg:aspect-[16/10]" />
          </div>
        </Container>
      </section>

      <section>
        <Container className="relative z-10 -mt-7 sm:-mt-9">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-8 w-24 shrink-0 animate-pulse rounded-full bg-muted-light"
              />
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-12 pt-8 sm:pb-16 sm:pt-10">
        <Container>
          <div className="h-4 w-24 animate-pulse rounded bg-muted-light" />
          <div className="mt-2 h-8 w-56 animate-pulse rounded bg-muted-light" />

          <div className="mt-7 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-3xl border border-border bg-card"
              >
                <div className="aspect-[16/10] animate-pulse bg-muted-light" />
                <div className="space-y-3 p-5 sm:p-6">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted-light" />
                  <div className="h-6 w-full animate-pulse rounded bg-muted-light" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted-light" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted-light" />
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
