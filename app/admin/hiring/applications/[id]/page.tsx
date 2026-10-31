"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  IndianRupee,
  Loader2,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

interface Answer {
  fieldKey: string;
  label: string;
  type: string;
  value: string;
}

interface UploadRef {
  fieldKey: string;
  label: string;
  kind: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface PaymentRef {
  orderId: string;
  paymentId?: string;
  status: string;
  /** Amount in paise, exactly as charged by Razorpay. */
  amount: number;
  currency: string;
  paidAt?: string;
}

interface ApplicationDetail {
  id: string;
  applicationId: string;
  formId: string;
  jobTitle: string;
  jobSlug: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  status: string;
  submittedAt: string;
  answers: Answer[];
  uploads: UploadRef[];
  payment?: PaymentRef;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  shortlisted: "bg-indigo-100 text-indigo-700",
  rejected: "bg-red-100 text-red-700",
  hired: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function HiringApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const applicationId = params.id;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `/api/admin/hiring/applications/${applicationId}`,
          { cache: "no-store" }
        );
        if (response.status === 401) {
          router.push("/");
          return;
        }
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json.success) {
          setLoadError(json.message || "Failed to load the application");
          return;
        }
        setApplication(json.data.application);
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load the application. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, router, reloadKey]);

  const changeStatus = async (status: string) => {
    if (!application || status === application.status) return;
    setUpdating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/hiring/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(json.message || "Failed to update the status");
        return;
      }
      setNotice(`Status updated to ${STATUS_LABELS[status] ?? status}.`);
      setReloadKey((key) => key + 1);
    } catch {
      setError("Failed to update the status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/hiring/applications/${applicationId}`,
        { method: "DELETE" }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        setError(json.message || "Failed to delete the application");
        setDeleting(false);
        return;
      }
      router.push("/admin/hiring?tab=applications");
    } catch {
      setError("Failed to delete the application. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading application…
      </div>
    );
  }

  if (loadError || !application) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError || "Application not found"}
        </p>
        <Link
          href="/admin/hiring?tab=applications"
          className="inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Hiring Management
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Application ${application.applicationId}`}
        subtitle={`${application.jobTitle} · submitted ${new Date(application.submittedAt).toLocaleString()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge
              status={application.status}
              colors={STATUS_COLORS}
              labels={STATUS_LABELS}
            />
            <a
              href={`/api/admin/hiring/applications/${applicationId}/pdf`}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              download
            >
              <Download className="h-4 w-4" />
              PDF Summary
            </a>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        }
      />

      <Link
        href="/admin/hiring?tab=applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="h-4 w-4" />
        All applications
      </Link>

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Applicant */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-900">Applicant</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">
                {application.applicantName}
              </dd>
            </div>
            {application.applicantEmail && (
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="break-all font-medium text-gray-900">
                  {application.applicantEmail}
                </dd>
              </div>
            )}
            {application.applicantPhone && (
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900">
                  {application.applicantPhone}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Job</dt>
              <dd className="font-medium text-gray-900">
                {application.jobTitle}
              </dd>
            </div>
          </dl>

          {application.payment && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  Application Fee
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    application.payment.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : application.payment.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {application.payment.status === "paid"
                    ? "Paid"
                    : application.payment.status === "failed"
                      ? "Failed"
                      : "Awaiting payment"}
                </span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-lg font-bold text-gray-900">
                <IndianRupee className="h-4 w-4 text-gray-400" />
                ₹
                {(application.payment.amount / 100).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </p>
              {application.payment.paidAt && (
                <p className="mt-1 text-xs text-gray-500">
                  Paid on{" "}
                  {new Date(application.payment.paidAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              <p className="mt-2 break-all text-xs text-gray-500">
                Order:{" "}
                <span className="font-mono text-gray-700">
                  {application.payment.orderId}
                </span>
                {application.payment.paymentId && (
                  <>
                    {" · "}Payment:{" "}
                    <span className="font-mono text-gray-700">
                      {application.payment.paymentId}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Reconcile this with the Razorpay dashboard using the order or
                payment ID.
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-gray-100 pt-4">
            <label
              htmlFor="application-status"
              className="block text-sm font-medium text-gray-700"
            >
              Application Status
            </label>
            <select
              id="application-status"
              value={application.status}
              disabled={updating}
              onChange={(event) => changeStatus(event.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            {updating && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving…
              </p>
            )}
          </div>
        </section>

        {/* Answers */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Answers</h2>
          <dl className="mt-4 space-y-4">
            {application.answers.length === 0 && (
              <p className="text-sm text-gray-500">No answers recorded.</p>
            )}
            {application.answers.map((answer) => (
              <div
                key={answer.fieldKey}
                className="rounded-lg bg-gray-50 px-4 py-3"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {answer.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-900">
                  {answer.value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Documents */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Uploaded Documents
        </h2>
        {application.uploads.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {application.uploads.map((upload) => {
              const isImage = upload.mimeType.startsWith("image/");
              const documentUrl = `/api/admin/hiring/applications/${applicationId}/documents/${upload.fieldKey}`;
              return (
                <div
                  key={upload.fieldKey}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex items-start gap-2">
                    {isImage ? (
                      <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {upload.label}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {upload.fileName} · {formatBytes(upload.size)}
                      </p>
                    </div>
                  </div>

                  {isImage ? (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 block"
                    >
                      {/* Follows a 302 to a short-lived signed URL. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={documentUrl}
                        alt={upload.label}
                        className="h-40 w-full rounded-md border border-gray-100 object-cover"
                      />
                    </a>
                  ) : (
                    <a
                      href={documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View PDF
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AdminModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete application"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Delete application{" "}
            <span className="font-medium">{application.applicationId}</span> for{" "}
            {application.jobTitle}? Uploaded documents will be removed
            permanently. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
