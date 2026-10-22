import { revalidatePath } from "next/cache";

/**
 * Refresh every public surface that renders blog content after a mutation.
 * The article page is ISR-cached (`revalidate`), so an explicit purge keeps
 * publishes, edits and unpublishes visible immediately. Failures are logged,
 * never propagated — revalidation must not fail an admin action.
 */
export function revalidateBlogPages(slugs: (string | null | undefined)[] = []): void {
  try {
    revalidatePath("/blogs");
    for (const slug of slugs) {
      if (slug) revalidatePath(`/blogs/${slug}`);
    }
    revalidatePath("/sitemap.xml");
  } catch (error) {
    console.error("Blog revalidation failed:", error);
  }
}
