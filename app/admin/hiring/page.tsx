"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface FormRow {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  status: "draft" | "published" | "closed";
  isFeatured: boolean;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ApplicationRow {
  id: string;
  applicationId: string;
  formId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  status: string;
  submittedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const FORM_STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const FORM_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

const APP_STATUS_COLORS: Record<string, string> = {
  submitted: "bg-sky-100 text-sky-700",
  under_review: "bg-amber-100 text-amber-700",
  shortlisted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  hired: "bg-green-100 text-green-700",
};

const APP_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminHiringPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"forms" | "applications">("forms");

  const [forms, setForms] = useState<FormRow[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [formsError, setFormsError] = useState<string | null>(null);

  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    title: "",
    subtitle: "",
    description: "",
  });

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refreshLists = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function loadForms() {
      setFormsLoading(true);
      setFormsError(null);
      try {
        const response = await fetch("/api/admin/hiring/forms", {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.push("/");
          return;
        }
        if (response.status === 403) {
          setFormsError("Admin access required");
          return;
        }
        const json = await response.json();
        if (cancelled) return;
        if (!json.success) {
          setFormsError(json.message || "Failed to load hiring forms");
          return;
        }
        setForms(json.data?.forms ?? []);
      } catch {
        if (!cancelled) {
          setFormsError("Failed to load hiring forms. Please try again.");
        }
      } finally {
        if (!cancelled) setFormsLoading(false);
      }
    }

    loadForms();
    return () => {
      cancelled = true;
    };
  }, [router, reloadKey]);

  useEffect(() => {
    if (tab !== "applications") return;
    let cancelled = false;

    async function loadApplications() {
      setAppsLoading(true);
      setAppsError(null);
      try {
        const query = new URLSearchParams({
          page: String(pagination.page),
          limit: String(pagination.limit),
        });
        if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());

        const response = await fetch(`/api/admin/hiring/applications?${query}`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.push("/");
          return;
        }
        if (response.status === 403) {
          setAppsError("Admin access required");
          return;
        }
        const json = await response.json();
        if (cancelled) return;
        if (!json.success) {
          setAppsError(json.message || "Failed to load applications");
          return;
        }
        setApplications(json.data?.items ?? []);
        setPagination((prev) => json.data?.pagination ?? prev);
      } catch {
        if (!cancelled) {
          setAppsError("Failed to load applications. Please try again.");
        }
      } finally {
        if (!cancelled) setAppsLoading(false);
      }
    }

    loadApplications();
    return () => {
      cancelled = true;
    };
  }, [tab, router, pagination.page, pagination.limit, debouncedSearch, reloadKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  }, []);

  const handleCreateForm = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    if (newForm.title.trim().length < 3) {
      setCreateError("Job title must be at least 3 characters.");
      return;
    }
    if (newForm.description.trim().length < 10) {
      setCreateError("Please write a short hiring description (10+ characters).");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/hiring/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newForm.title.trim(),
          subtitle: newForm.subtitle.trim() || undefined,
          description: newForm.description.trim(),
          status: "draft",
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setCreateError(json.message || "Failed to create the form");
        return;
      }
      setCreateOpen(false);
      setNewForm({ title: "", subtitle: "", description: "" });
      flash("Form created with the default hiring fields.");
      router.push(`/admin/hiring/forms/${json.data.form.id}`);
    } catch {
      setCreateError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const setFormStatus = async (formId: string, status: string) => {
    setActionBusyId(formId);
    try {
      const response = await fetch(`/api/admin/hiring/forms/${formId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        flash(json.message || "Failed to update the form status");
        return;
      }
      flash(`Form is now ${status}.`);
      refreshLists();
    } catch {
      flash("Failed to update the form status");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    setActionBusyId(formId);
    try {
      const response = await fetch(`/api/admin/hiring/forms/${formId}`, {
        method: "DELETE",
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        flash(json.message || "Failed to delete the form");
        setConfirmDeleteId(null);
        return;
      }
      flash("Form deleted.");
      setConfirmDeleteId(null);
      refreshLists();
    } catch {
      flash("Failed to delete the form");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteApplication = async (applicationId: string) => {
    setActionBusyId(applicationId);
    try {
      const response = await fetch(
        `/api/admin/hiring/applications/${applicationId}`,
        { method: "DELETE" }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        flash(json.message || "Failed to delete the application");
        setConfirmDeleteId(null);
        return;
      }
      flash("Application deleted.");
      setConfirmDeleteId(null);
      refreshLists();
    } catch {
      flash("Failed to delete the application");
    } finally {
      setActionBusyId(null);
    }
  };

  const totalApplications = useMemo(
    () => forms.reduce((sum, form) => sum + form.applicationCount, 0),
    [forms]
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Hiring Management"
        subtitle="Create application forms, publish openings and review submitted applications."
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create Form
          </button>
        }
      />

      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(
          [
            { key: "forms", label: `Hiring Forms (${forms.length})` },
            {
              key: "applications",
              label: `Applications (${pagination.total || totalApplications})`,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Forms tab ── */}
      {tab === "forms" && (
        <div className="space-y-4">
          {formsError && (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {formsError}
            </p>
          )}

          {formsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : formsError ? null : forms.length === 0 ? (
            <AdminEmptyState
              title="No hiring forms yet"
              description="Create your first form to start accepting applications. It will start with the default nine hiring fields."
              icon={BriefcaseBusiness}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Desktop table */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Job Title</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Applications</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forms.map((form) => (
                    <tr key={form.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{form.title}</p>
                        {form.subtitle && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {form.subtitle}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-gray-400">
                          /careers/{form.slug}
                          {form.isFeatured && " · featured"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge
                          status={form.status}
                          colors={FORM_STATUS_COLORS}
                          labels={FORM_STATUS_LABELS}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {form.applicationCount}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(form.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <FormActions
                          form={form}
                          busy={actionBusyId === form.id}
                          confirmDelete={confirmDeleteId === form.id}
                          onSetStatus={setFormStatus}
                          onDelete={() => setConfirmDeleteId(form.id)}
                          onConfirmDelete={() => handleDeleteForm(form.id)}
                          onCancelDelete={() => setConfirmDeleteId(null)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="divide-y divide-gray-100 md:hidden">
                {forms.map((form) => (
                  <div key={form.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{form.title}</p>
                        {form.subtitle && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {form.subtitle}
                          </p>
                        )}
                      </div>
                      <AdminStatusBadge
                        status={form.status}
                        colors={FORM_STATUS_COLORS}
                        labels={FORM_STATUS_LABELS}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      /careers/{form.slug} · {form.applicationCount} application(s)
                      · updated {formatDate(form.updatedAt)}
                    </p>
                    <FormActions
                      form={form}
                      busy={actionBusyId === form.id}
                      confirmDelete={confirmDeleteId === form.id}
                      onSetStatus={setFormStatus}
                      onDelete={() => setConfirmDeleteId(form.id)}
                      onConfirmDelete={() => handleDeleteForm(form.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      stacked
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Applications tab ── */}
      {tab === "applications" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by application ID, name, email or phone…"
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {appsError && (
            <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {appsError}
            </p>
          )}

          {appsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl border border-gray-200 bg-white"
                />
              ))}
            </div>
          ) : appsError ? null : applications.length === 0 ? (
            <AdminEmptyState
              title="No applications yet"
              description="Submitted applications will appear here once candidates start applying."
              icon={FileText}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="hidden w-full text-left text-sm md:table">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Application</th>
                    <th className="px-4 py-3 font-medium">Applicant</th>
                    <th className="px-4 py-3 font-medium">Position</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {applications.map((application) => (
                    <tr key={application.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {application.applicationId}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {application.applicantName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {application.applicantEmail || application.applicantPhone || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {application.jobTitle}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(application.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <AdminStatusBadge
                          status={application.status}
                          colors={APP_STATUS_COLORS}
                          labels={APP_STATUS_LABELS}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/hiring/applications/${application.id}`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                          <a
                            href={`/api/admin/hiring/applications/${application.id}/pdf`}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                          >
                            <Download className="h-3.5 w-3.5" />
                            PDF
                          </a>
                          {confirmDeleteId === application.id ? (
                            <span className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={actionBusyId === application.id}
                                onClick={() => handleDeleteApplication(application.id)}
                                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                              >
                                {actionBusyId === application.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(application.id)}
                              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="divide-y divide-gray-100 md:hidden">
                {applications.map((application) => (
                  <div key={application.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-gray-500">
                          {application.applicationId}
                        </p>
                        <p className="font-medium text-gray-900">
                          {application.applicantName}
                        </p>
                      </div>
                      <AdminStatusBadge
                        status={application.status}
                        colors={APP_STATUS_COLORS}
                        labels={APP_STATUS_LABELS}
                      />
                    </div>
                    <p className="text-sm text-gray-700">{application.jobTitle}</p>
                    <p className="text-xs text-gray-500">
                      {application.applicantEmail || application.applicantPhone || "—"} ·{" "}
                      {formatDate(application.submittedAt)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        href={`/admin/hiring/applications/${application.id}`}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </Link>
                      <a
                        href={`/api/admin/hiring/applications/${application.id}/pdf`}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </a>
                      {confirmDeleteId === application.id ? (
                        <>
                          <button
                            type="button"
                            disabled={actionBusyId === application.id}
                            onClick={() => handleDeleteApplication(application.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            {actionBusyId === application.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md px-3 py-1.5 text-xs text-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(application.id)}
                          className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>
                Page {pagination.page} of {pagination.totalPages} ·{" "}
                {pagination.total} total
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create form modal */}
      <AdminModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Hiring Form"
      >
        <form onSubmit={handleCreateForm} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Job Title *
            </label>
            <input
              type="text"
              value={newForm.title}
              onChange={(event) =>
                setNewForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="e.g. Field Collection Executive"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Subtitle
            </label>
            <input
              type="text"
              value={newForm.subtitle}
              onChange={(event) =>
                setNewForm((prev) => ({ ...prev, subtitle: event.target.value }))
              }
              placeholder="e.g. Full-time · Bengaluru"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hiring Description *
            </label>
            <textarea
              rows={4}
              value={newForm.description}
              onChange={(event) =>
                setNewForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder="Describe the role, responsibilities and who should apply…"
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Saved as a draft with the default nine fields. You can customise
              every field before publishing.
            </p>
          </div>

          {createError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create &amp; Open Builder
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

function FormActions({
  form,
  busy,
  confirmDelete,
  onSetStatus,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  stacked,
}: {
  form: FormRow;
  busy: boolean;
  confirmDelete: boolean;
  onSetStatus: (formId: string, status: string) => void;
  onDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  stacked?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 ${stacked ? "" : "justify-end"}`}
    >
      <Link
        href={`/admin/hiring/forms/${form.id}`}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Link>

      {form.status === "published" && (
        <Link
          href={`/careers/${form.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Link>
      )}

      {form.status === "draft" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSetStatus(form.id, "published")}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Publish
        </button>
      )}

      {form.status === "published" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSetStatus(form.id, "closed")}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      )}

      {form.status === "closed" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSetStatus(form.id, "published")}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Reopen
        </button>
      )}

      {confirmDelete ? (
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirmDelete}
            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Confirm
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={form.applicationCount > 0 || busy}
          title={
            form.applicationCount > 0
              ? "Close the form instead — applications must stay intact"
              : "Delete form"
          }
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}
