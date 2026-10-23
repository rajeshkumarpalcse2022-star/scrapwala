"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import RemoteImage from "@/components/common/RemoteImage";

interface AdImage {
  url: string;
  publicId?: string;
  alt: string;
}

interface HomepageAd {
  id: string;
  title: string;
  image: AdImage;
  linkUrl: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed client-side after fetch: active AND inside its schedule window. */
  isLive: boolean;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Admin: homepage advertisement management (the banner below the hero). */
export default function AdminHomepageAdsPage() {
  const [ads, setAds] = useState<HomepageAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HomepageAd | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomepageAd | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formImage, setFormImage] = useState<AdImage | null>(null);
  const [formActive, setFormActive] = useState(false);
  const [formStartsAt, setFormStartsAt] = useState("");
  const [formEndsAt, setFormEndsAt] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

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
        const res = await fetch("/api/admin/homepage-ads", {
          cache: "no-store",
        });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load ads.");
        }
        const now = Date.now();
        const rawAds: Omit<HomepageAd, "isLive">[] = json.data?.ads || [];
        setAds(
          rawAds.map((ad) => ({
            ...ad,
            isLive:
              ad.isActive &&
              (!ad.startsAt || Date.parse(ad.startsAt) <= now) &&
              (!ad.endsAt || Date.parse(ad.endsAt) >= now),
          }))
        );
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setAds([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load ads."
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
    setFormTitle("");
    setFormLinkUrl("");
    setFormImage(null);
    setFormActive(false);
    setFormStartsAt("");
    setFormEndsAt("");
    setFormError(null);
  };

  const openAdd = () => {
    resetForm();
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (ad: HomepageAd) => {
    resetForm();
    setEditing(ad);
    setFormTitle(ad.title);
    setFormLinkUrl(ad.linkUrl ?? "");
    setFormImage(ad.image);
    setFormActive(ad.isActive);
    setFormStartsAt(toLocalInput(ad.startsAt));
    setFormEndsAt(toLocalInput(ad.endsAt));
    setFormOpen(true);
  };

  const handleUpload = async (file: File) => {
    setUploadingImage(true);
    setFormError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/blog-image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to upload the image.");
      }
      setFormImage({
        url: json.data.imageUrl,
        publicId: json.data.cloudinaryPublicId,
        alt: formTitle.trim(),
      });
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to upload the image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      if (!formImage?.url) {
        setFormError("Please upload a banner image.");
        setSaving(false);
        return;
      }
      const payload = {
        title: formTitle.trim(),
        image: {
          url: formImage.url,
          publicId: formImage.publicId,
          alt: formImage.alt || formTitle.trim(),
        },
        linkUrl: formLinkUrl.trim() || null,
        isActive: formActive,
        startsAt: formStartsAt
          ? new Date(formStartsAt).toISOString()
          : null,
        endsAt: formEndsAt ? new Date(formEndsAt).toISOString() : null,
      };

      const res = await fetch(
        editing ? `/api/admin/homepage-ads/${editing.id}` : "/api/admin/homepage-ads",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save the ad.");
        return;
      }
      setFormOpen(false);
      setSuccessMsg(
        editing
          ? `"${payload.title}" was updated.`
          : `"${payload.title}" was created.`
      );
      refresh();
    } catch {
      setFormError("Unable to save the ad. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (ad: HomepageAd) => {
    setTogglingId(ad.id);
    setActionError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/admin/homepage-ads/${ad.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to update the ad.");
        return;
      }
      setSuccessMsg(
        ad.isActive
          ? `"${ad.title}" is now off.`
          : `"${ad.title}" is now live on the homepage.`
      );
      refresh();
    } catch {
      setActionError("Unable to update the ad. Please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/homepage-ads/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setActionError(json.message || "Failed to delete the ad.");
        return;
      }
      setSuccessMsg(`"${deleteTarget.title}" was deleted.`);
      setDeleteTarget(null);
      refresh();
    } catch {
      setActionError("Unable to delete the ad. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Homepage Ads"
        subtitle="Run a promotional banner on the homepage — below the hero. Only one ad shows at a time."
        action={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            New Ad
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
          Loading ads…
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

      {!isLoading && !loadError && ads.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
          <Megaphone className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-900">
            No homepage ads yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Upload a banner image and go live — it appears right below the
            homepage hero.
          </p>
        </div>
      )}

      {!isLoading && !loadError && ads.length > 0 && (
        <div className="space-y-4">
          {ads.map((ad) => {
            return (
              <div
                key={ad.id}
                className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                <div className="w-full shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 sm:w-56">
                  <RemoteImage
                    src={ad.image.url}
                    alt={ad.image.alt || ad.title}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-medium text-gray-900">
                      {ad.title}
                    </h3>
                    {ad.isLive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    ) : ad.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Scheduled / Ended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Off
                      </span>
                    )}
                  </div>
                  {ad.linkUrl && (
                    <p className="mt-1 truncate text-xs text-gray-500">
                      Opens: {ad.linkUrl}
                    </p>
                  )}
                  {(ad.startsAt || ad.endsAt) && (
                    <p className="mt-1 text-xs text-gray-500">
                      {ad.startsAt
                        ? `From ${new Date(ad.startsAt).toLocaleDateString()}`
                        : "Always"}
                      {" – "}
                      {ad.endsAt
                        ? `until ${new Date(ad.endsAt).toLocaleDateString()}`
                        : "no end"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleToggle(ad)}
                    disabled={togglingId === ad.id}
                    title={ad.isActive ? "Turn off" : "Go live"}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  >
                    {togglingId === ad.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : ad.isActive ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(ad)}
                    title="Edit"
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(ad)}
                    title="Delete"
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Homepage Ad" : "New Homepage Ad"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Monsoon Sale — Extra 10% on scrap"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Banner image
            </label>
            {formImage ? (
              <div className="space-y-2">
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <RemoteImage
                    src={formImage.url}
                    alt={formImage.alt || formTitle || "Ad preview"}
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-gray-400">
                    Recommended: wide banner, around 1440 × 480 px, max 5 MB
                    (JPG/PNG/WebP).
                  </p>
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" />
                    )}
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingImage}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-8 text-sm text-gray-500 transition hover:border-emerald-400 hover:text-emerald-600">
                {uploadingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ImagePlus className="h-5 w-5" />
                )}
                {uploadingImage
                  ? "Uploading…"
                  : "Click to upload the banner image"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Link URL{" "}
              <span className="font-normal text-gray-400">
                (optional — banner is clickable)
              </span>
            </label>
            <input
              type="url"
              value={formLinkUrl}
              onChange={(e) => setFormLinkUrl(e.target.value)}
              maxLength={2048}
              placeholder="https://…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start date{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End date{" "}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
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
              {formActive ? "Live (when inside schedule)" : "Off"}
              <span
                className={`ml-2 inline-block h-2 w-2 rounded-full ${
                  formActive ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
            </button>
            <p className="mt-1 text-xs text-gray-400">
              Going live automatically turns off any other live ad.
            </p>
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
              disabled={
                saving || uploadingImage || formTitle.trim().length < 2 || !formImage
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Ad"}
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Homepage Ad"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete{" "}
            <span className="font-medium text-gray-900">
              &ldquo;{deleteTarget?.title}&rdquo;
            </span>{" "}
            permanently? Visitors will no longer see this banner.
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
