"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BlogEditor from "@/components/admin/blog/BlogEditor";
import type { BlogCategoryDTO } from "@/services/blog";

/** Admin: create a new blog article (starts as a draft). */
export default function AdminNewBlogPage() {
  const [categories, setCategories] = useState<BlogCategoryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/blog-categories", {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load categories.");
        }
        setCategories(json.data?.categories || []);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unable to load categories."
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="New Article"
        subtitle="Write and schedule a new article for the public blog."
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Link
            href="/admin/blog-categories"
            className="mt-2 inline-block text-xs font-medium text-red-700 underline"
          >
            Manage blog categories
          </Link>
        </div>
      )}

      {categories === null && !error && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-sm text-gray-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading editor…
        </div>
      )}

      {categories !== null && <BlogEditor categories={categories} post={null} />}
    </div>
  );
}
