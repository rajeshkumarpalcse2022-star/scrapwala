import Container from "@/components/common/Container";

/** Skeleton for the article page while the post is fetched. */
export default function BlogArticleLoading() {
  return (
    <main>
      <section className="border-b border-border bg-gradient-to-b from-primary-light/80 via-background to-background">
        <Container className="pb-8 pt-7 sm:pb-10 sm:pt-9">
          <div className="h-4 w-56 animate-pulse rounded bg-muted-light" />

          <div className="mx-auto mt-7 max-w-4xl text-center sm:mt-9">
            <div className="mx-auto h-7 w-24 animate-pulse rounded-full bg-muted-light" />
            <div className="mx-auto mt-4 h-10 w-full max-w-3xl animate-pulse rounded-lg bg-muted-light" />
            <div className="mx-auto mt-3 h-10 w-2/3 animate-pulse rounded-lg bg-muted-light" />
            <div className="mx-auto mt-4 h-5 w-1/2 animate-pulse rounded bg-muted-light" />
            <div className="mx-auto mt-6 flex items-center justify-center gap-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted-light" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted-light" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted-light" />
            </div>
          </div>

          <div className="mx-auto mt-8 aspect-[16/9] max-w-5xl animate-pulse rounded-2xl bg-muted-light sm:mt-10 sm:rounded-3xl" />
        </Container>
      </section>

      <Container className="py-9 sm:py-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-12">
          <div className="max-w-3xl space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-muted-light" />
            <div className="h-4 w-full animate-pulse rounded bg-muted-light" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted-light" />
            <div className="h-4 w-full animate-pulse rounded bg-muted-light" />
            <div className="h-8 w-1/2 animate-pulse rounded bg-muted-light" />
            <div className="h-4 w-full animate-pulse rounded bg-muted-light" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted-light" />
          </div>
          <div className="hidden lg:block">
            <div className="h-64 animate-pulse rounded-2xl bg-muted-light" />
          </div>
        </div>
      </Container>
    </main>
  );
}
