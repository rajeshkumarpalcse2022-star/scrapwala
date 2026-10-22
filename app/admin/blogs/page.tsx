"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import RemoteImage from "@/components/common/RemoteImage";
import type {
  AdminBlogListItemDTO,
  BlogCategoryDTO,
} from "@/services/blog";
import type { BlogPostStatus } from "@/models/BlogPost";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Unpublished" },
];

const STATUS_STYLES: Record<BlogPostStatus, string> = {
  draft: "bg-gray-100 text-gray-600 ring-gray-200",
  scheduled: "bg-blue-50 text-blue-700 ring-blue-100",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  archived: "bg-amber-50 text-amber-700 ring-amber-100",
};

const STATUS_LABELS: Record<BlogPostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Unpublished",
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBlogsPage() {
  const [posts, setPosts] = useState<AdminBlogListItemDTO[]>([]);
  const [categories, setCategories] = useState<BlogCategoryDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminBlogListItemDTO | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (q) params.set("q", q);
        if (categoryFilter) params.set("category", categoryFilter);
        if (statusFilter) params.set("status", statusFilter);

        const [postsRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/blogs?${params.toString()}`, {
            cache: "no-store",
          }),
          fetch("/api/admin/blog-categories", { cache: "no-store" }),
        ]);

        const postsJson = await postsRes.json();
        if (cancelled) return;
        if (!postsRes.ok || !postsJson.success) {
          throw new Error(postsJson.message || "Failed to load articles.");
        }

        setPosts(postsJson.data?.posts || []);
        setTotal(postsJson.data?.total ?? 0);
        setTotalPages(postsJson.data?.totalPages ?? 1);
        setLoadError(null);

        if (categoriesRes.ok) {
          const categoriesJson = await categoriesRes.json();
          if (categoriesJson.success) {
            setCategories(categoriesJson.data?.categories || []);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setPosts([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load articles."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, q, categoryFilter, statusFilter, reloadKey]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setQ("");
    setCategoryFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const hasFilters = Boolean(q || categoryFilter || statusFilter);

  const runStatusAction = async (
    post: AdminBlogListItemDTO,
    status: BlogPostStatus
  ) => {
    setActionId(post.id);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/blogs/${post.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to update the article.");
        return;
      }
      setSuccessMsg(
        status === "published"
          ? `"${post.title}" is live.`
          : `"${post.title}" was unpublished.`
      );
      refresh();
    } catch {
      setActionError("Unable to update the article. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const runFeatureAction = async (post: AdminBlogListItemDTO) => {
    setActionId(post.id);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/blogs/${post.id}/feature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: !post.isFeatured }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to update the featured flag.");
        return;
      }
      setSuccessMsg(
        post.isFeatured
          ? `"${post.title}" removed from featured.`
          : `"${post.title}" is now featured on the blog page.`
      );
      refresh();
    } catch {
      setActionError("Unable to update the featured flag. Please try again.");
    } finally {
      setActionId(null);
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/blogs/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to delete the article.");
        return;
      }
      setSuccessMsg(`"${deleteTarget.title}" was deleted permanently.`);
      setDeleteTarget(null);
      refresh();
    } catch {
      setActionError("Unable to delete the article. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Management"
        subtitle="Write, schedule and publish articles for the public blog."
        action={
          <Link
            href="/admin/blogs/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Link>
        }
      />

      {successMsg && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            title="Dismiss"
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            title="Dismiss"
            className="rounded-lg p-1 text-red-600 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, excerpt or author…"
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-sm text-gray-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading articles…
        </div>
      )}

      {!isLoading && loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            onClick={refresh}
            className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !loadError && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
          <FileText className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">
            {hasFilters ? "No articles match these filters" : "No articles yet"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {hasFilters
              ? "Try different keywords or clear the filters."
              : "Create your first article to populate the public blog."}
          </p>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="mt-6 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Clear filters
            </button>
          ) : (
            <Link
              href="/admin/blogs/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              New Article
            </Link>
          )}
        </div>
      )}

      {!isLoading && !loadError && posts.length > 0 && (
        <>
          <p className="text-sm text-gray-500">
            {total} article{total === 1 ? "" : "s"}
          </p>

          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/80 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Article</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map((post) => (
                  <tr key={post.id} className="transition hover:bg-gray-50/60">
                    <td className="max-w-md px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {post.coverImage?.url ? (
                            <RemoteImage
                              src={post.coverImage.url}
                              alt={post.coverImage.alt || post.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText className="h-4 w-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
                            {post.title}
                            {post.isFeatured && (
                              <Star
                                className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                                aria-label="Featured"
                              />
                            )}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            /blogs/{post.slug} · {post.authorName}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {post.category?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[post.status]}`}
                      >
                        {STATUS_LABELS[post.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {post.status === "scheduled" && post.scheduledAt
                        ? `Schedules ${formatDate(post.scheduledAt)}`
                        : post.status === "published" && post.publishedAt
                          ? formatDate(post.publishedAt)
                          : formatDate(post.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {actionId === post.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            {post.status !== "published" && (
                              <button
                                onClick={() => runStatusAction(post, "published")}
                                title="Publish now"
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            {post.status === "published" && (
                              <button
                                onClick={() => runStatusAction(post, "archived")}
                                title="Unpublish"
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600"
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            )}
                            {post.status === "published" && (
                              <button
                                onClick={() => runFeatureAction(post)}
                                title={
                                  post.isFeatured
                                    ? "Remove from featured"
                                    : "Feature on blog page"
                                }
                                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-amber-50 hover:text-amber-600"
                              >
                                <Star
                                  className={`h-4 w-4 ${post.isFeatured ? "fill-amber-400 text-amber-500" : ""}`}
                                />
                              </button>
                            )}
                            <Link
                              href={`/admin/blogs/${post.id}`}
                              title="Edit article"
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(post)}
                              title="Delete article"
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 lg:hidden">
            {posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {post.coverImage?.url ? (
                      <RemoteImage
                        src={post.coverImage.url}
                        alt={post.coverImage.alt || post.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-4 w-4 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 font-medium text-gray-900">
                      <span className="truncate">{post.title}</span>
                      {post.isFeatured && (
                        <Star
                          className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                          aria-label="Featured"
                        />
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {post.category?.name ?? "No category"} ·{" "}
                      {post.status === "scheduled" && post.scheduledAt
                        ? `Schedules ${formatDate(post.scheduledAt)}`
                        : formatDate(post.publishedAt ?? post.updatedAt)}
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${STATUS_STYLES[post.status]}`}
                    >
                      {STATUS_LABELS[post.status]}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  {actionId === post.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <>
                      {post.status !== "published" && (
                        <button
                          onClick={() => runStatusAction(post, "published")}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Publish
                        </button>
                      )}
                      {post.status === "published" && (
                        <>
                          <button
                            onClick={() => runStatusAction(post, "archived")}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                            Unpublish
                          </button>
                          <button
                            onClick={() => runFeatureAction(post)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            <Star
                              className={`h-3.5 w-3.5 ${post.isFeatured ? "fill-amber-400 text-amber-500" : ""}`}
                            />
                            {post.isFeatured ? "Featured" : "Feature"}
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/blogs/${post.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(post)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <AdminModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Article"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete{" "}
            <span className="font-medium text-gray-900">
              &ldquo;{deleteTarget?.title}&rdquo;
            </span>{" "}
            permanently? This removes the article from the public blog and
            cannot be undone.
          </p>
          {actionError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {actionError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={runDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete Permanently"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
