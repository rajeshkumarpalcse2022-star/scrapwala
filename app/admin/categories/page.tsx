"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Tag,
  ChevronDown,
  ChevronUp,
  Loader2,
  ImagePlus,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import RemoteImage from "@/components/common/RemoteImage";
import type { AdminCategoryDTO, SubcategoryDTO } from "@/services/category";

type Status = "active" | "inactive";

interface DeleteTarget {
  kind: "category" | "subcategory";
  id: string;
  name: string;
  parentId?: string;
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        status === "active"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-gray-100 text-gray-600 ring-gray-200"
      }`}
    >
      {status === "active" ? "Active" : "Hidden"}
    </span>
  );
}

function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: Status;
  onChange: (next: Status) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value === "active"}
      aria-label={value === "active" ? "Active" : "Hidden"}
      disabled={disabled}
      onClick={() => onChange(value === "active" ? "inactive" : "active")}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        value === "active" ? "bg-emerald-600" : "bg-gray-300"
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          value === "active" ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const [addCatOpen, setAddCatOpen] = useState(false);
  const [editCatOpen, setEditCatOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [editSubOpen, setEditSubOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selectedCat, setSelectedCat] = useState<AdminCategoryDTO | null>(null);
  const [selectedSub, setSelectedSub] = useState<SubcategoryDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("active");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formImageId, setFormImageId] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/categories", { cache: "no-store" });
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

  const loadCategories = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const refresh = () => {
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const resetForm = () => {
    setFormName("");
    setFormDesc("");
    setFormStatus("active");
    setFormImageUrl("");
    setFormImageId("");
    setFormError(null);
    setUploadError(null);
  };

  const openAddCat = () => {
    resetForm();
    setActionError(null);
    setAddCatOpen(true);
  };

  const openEditCat = (cat: AdminCategoryDTO) => {
    resetForm();
    setActionError(null);
    setSelectedCat(cat);
    setFormName(cat.name);
    setFormStatus(cat.status);
    setEditCatOpen(true);
  };

  const openAddSub = (cat: AdminCategoryDTO) => {
    resetForm();
    setActionError(null);
    setSelectedCat(cat);
    setAddSubOpen(true);
  };

  const openEditSub = (cat: AdminCategoryDTO, sub: SubcategoryDTO) => {
    resetForm();
    setActionError(null);
    setSelectedCat(cat);
    setSelectedSub(sub);
    setFormName(sub.name);
    setFormDesc(sub.description);
    setFormStatus(sub.status);
    setFormImageUrl(sub.imageUrl || "");
    setFormImageId(sub.cloudinaryPublicId || "");
    setEditSubOpen(true);
  };

  const openDelete = (target: DeleteTarget) => {
    setDeleteTarget(target);
    setFormError(null);
    setActionError(null);
    setDeleteOpen(true);
  };

  const handleImageFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/uploads/svg", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to upload image.");
      }
      setFormImageUrl(json.data.imageUrl);
      setFormImageId(json.data.cloudinaryPublicId);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCat = async () => {
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          isActive: formStatus === "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save category.");
        return;
      }
      setAddCatOpen(false);
      setSuccessMsg(`"${formName.trim()}" was created.`);
      refresh();
    } catch {
      setFormError("Unable to save category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCat = async () => {
    if (!selectedCat) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/categories/${selectedCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          isActive: formStatus === "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save category.");
        return;
      }
      setEditCatOpen(false);
      setSuccessMsg(`"${formName.trim()}" was updated.`);
      refresh();
    } catch {
      setFormError("Unable to save category. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cat: AdminCategoryDTO) => {
    const nextActive = cat.status !== "active";
    setTogglingId(cat.id);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to update category status.");
        return;
      }
      setSuccessMsg(
        nextActive
          ? `"${cat.name}" is now visible to customers.`
          : `"${cat.name}" is now hidden from customers.`
      );
      refresh();
    } catch {
      setActionError("Unable to update category status. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleCreateSub = async () => {
    if (!selectedCat) return;
    if (!formImageUrl) {
      setUploadError("Please upload an SVG image for the subcategory.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/admin/categories/${selectedCat.id}/subcategories`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim(),
            imageUrl: formImageUrl,
            cloudinaryPublicId: formImageId,
            isActive: formStatus === "active",
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save subcategory.");
        return;
      }
      setAddSubOpen(false);
      setSuccessMsg(`"${formName.trim()}" was added under "${selectedCat.name}".`);
      refresh();
    } catch {
      setFormError("Unable to save subcategory. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSub = async () => {
    if (!selectedSub) return;
    if (!formImageUrl) {
      setUploadError("An image is required — replace it instead of removing it.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        description: formDesc.trim(),
        isActive: formStatus === "active",
        imageUrl: formImageUrl,
        cloudinaryPublicId: formImageId,
      };

      const res = await fetch(`/api/admin/subcategories/${selectedSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save subcategory.");
        return;
      }
      setEditSubOpen(false);
      setSuccessMsg(`"${formName.trim()}" was updated.`);
      refresh();
    } catch {
      setFormError("Unable to save subcategory. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setFormError(null);
    try {
      const url =
        deleteTarget.kind === "category"
          ? `/api/admin/categories/${deleteTarget.id}`
          : `/api/admin/subcategories/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to delete.");
        return;
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      if (deleteTarget.kind === "subcategory") {
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === deleteTarget.parentId
              ? {
                  ...cat,
                  subcategories: cat.subcategories.filter(
                    (s) => s.id !== deleteTarget.id
                  ),
                  subcategoryCount: Math.max(0, cat.subcategoryCount - 1),
                }
              : cat
          )
        );
        setExpandedCatId(deleteTarget.parentId ?? expandedCatId);
        setSuccessMsg(`"${deleteTarget.name}" was deleted permanently.`);
      } else {
        setExpandedCatId(null);
        setSuccessMsg(`"${deleteTarget.name}" was deleted.`);
      }
      refresh();
    } catch {
      setFormError("Unable to delete. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const expandedCat = categories.find((c) => c.id === expandedCatId) || null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scrap Categories"
        subtitle="Manage categories, subcategories and their images."
        action={
          <button
            onClick={openAddCat}
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
            onClick={loadCategories}
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
            No categories yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Add your first category, then add subcategories under it.
          </p>
        </div>
      )}

      {!isLoading && !loadError && categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((cat) => {
            const isActive = cat.status === "active";
            const isExpanded = expandedCatId === cat.id;
            return (
              <div
                key={cat.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition ${
                  isActive
                    ? "border-gray-200 hover:border-emerald-200 hover:shadow-md"
                    : "border-gray-200 opacity-90 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                        isActive
                          ? "bg-emerald-50 ring-emerald-100"
                          : "bg-gray-50 ring-gray-200"
                      }`}
                    >
                      <Tag
                        className={`h-5 w-5 ${
                          isActive ? "text-emerald-600" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-gray-900">
                        {cat.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {cat.subcategoryCount} subcategor
                        {cat.subcategoryCount === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={cat.status} />
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
                  >
                    {isExpanded ? (
                      <>
                        Hide subcategories{" "}
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        View subcategories{" "}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      disabled={togglingId === cat.id}
                      title={
                        isActive
                          ? "Hide category from customers"
                          : "Show category to customers"
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                        isActive
                          ? "border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {togglingId === cat.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isActive ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => openEditCat(cat)}
                      title="Edit category"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    {cat.subcategoryCount === 0 && (
                      <button
                        onClick={() =>
                          openDelete({
                            kind: "category",
                            id: cat.id,
                            name: cat.name,
                          })
                        }
                        title="Delete category"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {expandedCat && !isLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Subcategories of {expandedCat.name}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                Manage the scrap items available under this category
              </p>
            </div>
            <button
              onClick={() => openAddSub(expandedCat)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Subcategory
            </button>
          </div>

          {expandedCat.subcategories.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
              No subcategories yet. Add one with an SVG image.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {expandedCat.subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2.5 transition hover:border-gray-200 hover:bg-white"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                    {sub.imageUrl ? (
                      <RemoteImage
                        src={sub.imageUrl}
                        alt={sub.name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <ImagePlus className="h-4 w-4 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {sub.name}
                    </p>
                    {sub.description && (
                      <p className="truncate text-xs text-gray-500">
                        {sub.description}
                      </p>
                    )}
                  </div>
                  <StatusPill status={sub.status} />
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => openEditSub(expandedCat, sub)}
                      title="Edit subcategory"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        openDelete({
                          kind: "subcategory",
                          id: sub.id,
                          name: sub.name,
                          parentId: expandedCat.id,
                        })
                      }
                      title="Delete permanently"
                      className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AdminModal
        open={addCatOpen}
        onClose={() => setAddCatOpen(false)}
        title="Add Category"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. Plastic"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  formStatus === "active" ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {formStatus === "active" ? "Active" : "Hidden"}
              </span>
              <StatusToggle value={formStatus} onChange={setFormStatus} />
            </div>
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setAddCatOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCat}
              disabled={saving || !formName.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create Category"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={editCatOpen}
        onClose={() => setEditCatOpen(false)}
        title="Edit Category"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Category Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  formStatus === "active" ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {formStatus === "active" ? "Active" : "Hidden"}
              </span>
              <StatusToggle value={formStatus} onChange={setFormStatus} />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Hiding a category also hides all of its subcategories from customers.
            No data is deleted.
          </p>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setEditCatOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateCat}
              disabled={saving || !formName.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={addSubOpen}
        onClose={() => setAddSubOpen(false)}
        title={`Add Subcategory — ${selectedCat?.name || ""}`}
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. PET Bottles"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="What can customers hand over?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image (SVG)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {formImageUrl ? (
                  <RemoteImage
                    src={formImageUrl}
                    alt="Subcategory preview"
                    className="h-full w-full object-contain p-1"
                    loading="eager"
                  />
                ) : (
                  <ImagePlus className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : formImageUrl ? (
                    "Replace image"
                  ) : (
                    "Upload SVG"
                  )}
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleImageFile(file);
                    }}
                  />
                </label>
                {formImageUrl && !uploading && (
                  <button
                    onClick={() => {
                      setFormImageUrl("");
                      setFormImageId("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              SVG only, up to 2 MB. An image is required when creating a
              subcategory.
            </p>
            {uploadError && (
              <p className="mt-1 text-xs text-red-600">{uploadError}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  formStatus === "active" ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {formStatus === "active" ? "Active" : "Hidden"}
              </span>
              <StatusToggle value={formStatus} onChange={setFormStatus} />
            </div>
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setAddSubOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateSub}
              disabled={
                saving || uploading || !formName.trim() || !formDesc.trim() || !formImageUrl
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={editSubOpen}
        onClose={() => setEditSubOpen(false)}
        title={`Edit Subcategory — ${selectedSub?.name || ""}`}
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Image (SVG)
            </label>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                {formImageUrl ? (
                  <RemoteImage
                    src={formImageUrl}
                    alt="Subcategory preview"
                    className="h-full w-full object-contain p-1"
                    loading="eager"
                  />
                ) : (
                  <ImagePlus className="h-5 w-5 text-gray-300" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading…
                    </>
                  ) : formImageUrl ? (
                    "Replace image"
                  ) : (
                    "Upload SVG"
                  )}
                  <input
                    type="file"
                    accept=".svg,image/svg+xml"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handleImageFile(file);
                    }}
                  />
                </label>
                {formImageUrl && !uploading && (
                  <button
                    onClick={() => {
                      setFormImageUrl("");
                      setFormImageId("");
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              SVG only, up to 2 MB. Removing the image is not allowed — replace
              it instead.
            </p>
            {uploadError && (
              <p className="mt-1 text-xs text-red-600">{uploadError}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  formStatus === "active" ? "text-emerald-700" : "text-gray-500"
                }`}
              >
                {formStatus === "active" ? "Active" : "Hidden"}
              </span>
              <StatusToggle value={formStatus} onChange={setFormStatus} />
            </div>
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setEditSubOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateSub}
              disabled={
                saving || uploading || !formName.trim() || !formDesc.trim() || !formImageUrl
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={
          deleteTarget?.kind === "subcategory"
            ? "Delete Subcategory Permanently"
            : "Delete Category"
        }
      >
        <div className="space-y-4">
          {deleteTarget?.kind === "subcategory" ? (
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                Delete{" "}
                <span className="font-medium text-gray-900">
                  &ldquo;{deleteTarget.name}&rdquo;
                </span>{" "}
                permanently?
              </p>
              <p>
                This will permanently remove this subcategory. This action
                cannot be undone.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget?.name}
              </span>
              ? This action cannot be undone.
            </p>
          )}
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving
                ? "Deleting…"
                : deleteTarget?.kind === "subcategory"
                  ? "Delete Permanently"
                  : "Delete"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
