"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BlogEditor from "@/components/admin/blog/BlogEditor";
import type {
  AdminBlogDetailDTO,
  BlogCategoryDTO,
} from "@/services/blog";

/** Admin: edit an existing blog article. */
export default function AdminEditBlogPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [post, setPost] = useState<AdminBlogDetailDTO | null>(null);
  const [categories, setCategories] = useState<BlogCategoryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const [postRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/blogs/${id}`, { cache: "no-store" }),
          fetch("/api/admin/blog-categories", { cache: "no-store" }),
        ]);

        const postJson = await postRes.json();
        if (cancelled) return;
        if (postRes.status === 404) {
          setNotFound(true);
          return;
        }
        if (!postRes.ok || !postJson.success) {
          throw new Error(postJson.message || "Failed to load the article.");
        }
        setPost(postJson.data?.post ?? null);

        const categoriesJson = await categoriesRes.json().catch(() => null);
        if (!cancelled) {
          setCategories(
            categoriesRes.ok && categoriesJson?.success
              ? categoriesJson.data?.categories || []
              : []
          );
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unable to load the article."
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Edit Article" subtitle="Update content, media and publishing settings." />

      {notFound && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-14 text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900">
            Article not found
          </p>
          <p className="mt-1 text-sm text-gray-500">
            It may have been deleted, or the link is incorrect.
          </p>
          <Link
            href="/admin/blogs"
            className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Back to articles
          </Link>
        </div>
      )}

      {error && !notFound && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {!error && !notFound && (post === null || categories === null) && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-sm text-gray-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading article…
        </div>
      )}

      {post !== null && categories !== null && (
        <BlogEditor categories={categories} post={post} />
      )}
    </div>
  );
}
