"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import type { BlogCategoryDTO } from "@/services/blog";

/**
 * Admin: blog category management (separate from scrap categories).
 * Categories with articles can be archived but not deleted.
 */
export default function AdminBlogCategoriesPage() {
  const [categories, setCategories] = useState<BlogCategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BlogCategoryDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogCategoryDTO | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSortOrder, setFormSortOrder] = useState(0);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setCategories([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load categories."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => setReloadKey((key) => key + 1);

  const resetForm = () => {
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormActive(true);
    setFormSortOrder(0);
    setFormError(null);
  };

  const openAdd = () => {
    resetForm();
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (category: BlogCategoryDTO) => {
    resetForm();
    setEditing(category);
    setFormName(category.name);
    setFormSlug(category.slug);
    setFormDescription(category.description ?? "");
    setFormActive(category.isActive);
    setFormSortOrder(category.sortOrder ?? 0);
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || undefined,
        description: formDescription.trim() || undefined,
        isActive: formActive,
        sortOrder: formSortOrder,
      };

      const res = await fetch(
        editing ? `/api/admin/blog-categories/${editing.id}` : "/api/admin/blog-categories",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save the category.");
        return;
      }
      setFormOpen(false);
      setSuccessMsg(
        editing
          ? `"${payload.name}" was updated.`
          : `"${payload.name}" was created.`
      );
      refresh();
    } catch {
      setFormError("Unable to save the category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (category: BlogCategoryDTO) => {
    setTogglingId(category.id);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/blog-categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to update the category.");
        return;
      }
      setSuccessMsg(
        category.isActive
          ? `"${category.name}" was archived.`
          : `"${category.name}" is active again.`
      );
      refresh();
    } catch {
      setActionError("Unable to update the category. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/admin/blog-categories/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to delete the category.");
        return;
      }
      setSuccessMsg(`"${deleteTarget.name}" was deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch {
      setActionError("Unable to delete the category. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Blog Categories"
        subtitle="Organise articles into categories shown on the public blog."
        action={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
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

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-sm text-gray-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading categories…
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

      {!isLoading && !loadError && categories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
          <Tag className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">
            No blog categories yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create a category, then pick it when writing articles.
          </p>
        </div>
      )}

      {!isLoading && !loadError && categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                      category.isActive
                        ? "bg-emerald-50 ring-emerald-100"
                        : "bg-gray-50 ring-gray-200"
                    }`}
                  >
                    <Tag
                      className={`h-5 w-5 ${
                        category.isActive ? "text-emerald-600" : "text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      /blogs/{category.slug} · {category.postCount} article
                      {category.postCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                    category.isActive
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                      : "bg-gray-100 text-gray-600 ring-gray-200"
                  }`}
                >
                  {category.isActive ? "Active" : "Archived"}
                </span>
              </div>

              {category.description && (
                <p className="mt-3 line-clamp-2 text-sm text-gray-500">
                  {category.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
                <button
                  onClick={() => handleToggle(category)}
                  disabled={togglingId === category.id}
                  title={
                    category.isActive
                      ? "Archive category"
                      : "Restore category"
                  }
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                >
                  {togglingId === category.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : category.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(category)}
                  title="Edit category"
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(category)}
                  title={
                    category.postCount > 0
                      ? "Archive instead — articles still use this category"
                      : "Delete category"
                  }
                  disabled={category.postCount > 0}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Blog Category" : "Add Blog Category"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Recycling Guides"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Slug <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={formSlug}
              onChange={(e) =>
                setFormSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                )
              }
              maxLength={80}
              placeholder="auto-from-name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              Leave empty to auto-generate from the name. Existing slugs stay
              stable when editing.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sort order
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={formSortOrder}
                onChange={(e) =>
                  setFormSortOrder(
                    Math.min(9999, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={formActive}
                onClick={() => setFormActive((prev) => !prev)}
                className={`mt-1 inline-flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  formActive
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-gray-300 bg-gray-50 text-gray-600"
                }`}
              >
                {formActive ? "Active" : "Archived"}
                <span
                  className={`ml-2 inline-block h-2 w-2 rounded-full ${
                    formActive ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              </button>
            </div>
          </div>

          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || formName.trim().length < 2}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Category"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Blog Category"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete{" "}
            <span className="font-medium text-gray-900">
              &ldquo;{deleteTarget?.name}&rdquo;
            </span>{" "}
            permanently? Only categories without articles can be deleted.
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
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
