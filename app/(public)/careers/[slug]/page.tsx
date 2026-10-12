"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import Container from "@/components/common/Container";
import DynamicHiringFields, {
  RendererField,
  RendererUpload,
} from "@/components/hiring/DynamicHiringFields";
import { useAuth } from "@/hooks/useAuth";
import {
  UPLOAD_KIND_LIMITS,
  validateApplicationValues,
  type HiringFieldConfig,
} from "@/lib/utils/hiring-fields";

interface PublicForm {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  fields: RendererField[];
}

type UploadKind = "photo" | "signature" | "document";

function uploadKindForType(type: string): UploadKind | null {
  if (type === "photo_upload") return "photo";
  if (type === "signature_upload") return "signature";
  if (type === "resume_upload") return "document";
  return null;
}

function clientUploadError(field: RendererField, file: File): string | null {
  const limit =
    UPLOAD_KIND_LIMITS[field.type as keyof typeof UPLOAD_KIND_LIMITS];
  if (!limit) return null;
  if (!limit.accept.includes(file.type as never)) {
    return `${field.label}: only ${limit.acceptLabel} files are allowed.`;
  }
  if (file.size > limit.maxBytes) {
    const mb = (limit.maxBytes / (1024 * 1024)).toFixed(0);
    return `${field.label}: file must be ${mb} MB or smaller.`;
  }
  return null;
}

export default function HiringApplyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<
    Record<string, RendererUpload | null>
  >({});
  const [uploadingKeys, setUploadingKeys] = useState<Record<string, boolean>>(
    {}
  );

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const objectUrlsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (isLoading || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/hiring/forms/${slug}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (response.status === 401) {
          router.replace(`/login?next=/careers/${slug}`);
          return;
        }
        const json = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !json?.success) {
          setLoadError(
            json?.message ||
              "This job opening is not available right now."
          );
          return;
        }
        setForm(json.data?.form ?? null);
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load this job opening. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, user, slug, router]);

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=/careers/${slug}`);
  }, [isLoading, user, slug, router]);

  const roleDenied = !isLoading && !!user && user.role !== "user";

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
    };
  }, []);

  const fields = useMemo(() => form?.fields ?? [], [form]);

  const handleValueChange = useCallback((fieldKey: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey]: value }));
    setErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const handleUpload = useCallback(
    (fieldKey: string, file: File) => {
      const field = fields.find((f) => f.key === fieldKey);
      if (!field) return;
      const kind = uploadKindForType(field.type);
      if (!kind) return;

      const clientError = clientUploadError(field, file);
      if (clientError) {
        setErrors((prev) => ({ ...prev, [fieldKey]: clientError }));
        return;
      }

      setUploadingKeys((prev) => ({ ...prev, [fieldKey]: true }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });

      (async () => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("kind", kind);

          const response = await fetch("/api/hiring/uploads", {
            method: "POST",
            body: formData,
          });
          const json = await response.json().catch(() => null);

          if (response.status === 401) {
            router.replace(`/login?next=/careers/${slug}`);
            return;
          }
          if (!response.ok || !json?.success) {
            setErrors((prev) => ({
              ...prev,
              [fieldKey]:
                json?.message || "Upload failed. Please try a different file.",
            }));
            return;
          }

          const staged = json.data;
          const previewUrl =
            kind === "document"
              ? undefined
              : URL.createObjectURL(file);
          if (previewUrl) {
            const previous = objectUrlsRef.current.get(fieldKey);
            if (previous) URL.revokeObjectURL(previous);
            objectUrlsRef.current.set(fieldKey, previewUrl);
          }

          setUploads((prev) => ({
            ...prev,
            [fieldKey]: {
              id: String(staged.id),
              fileName: String(staged.fileName ?? file.name),
              size: Number(staged.size ?? file.size),
              previewUrl,
            },
          }));
        } catch {
          setErrors((prev) => ({
            ...prev,
            [fieldKey]: "Upload failed. Please check your connection and retry.",
          }));
        } finally {
          setUploadingKeys((prev) => ({ ...prev, [fieldKey]: false }));
        }
      })();
    },
    [fields, router, slug]
  );

  const handleRemoveUpload = useCallback((fieldKey: string) => {
    const previous = objectUrlsRef.current.get(fieldKey);
    if (previous) {
      URL.revokeObjectURL(previous);
      objectUrlsRef.current.delete(fieldKey);
    }

    const current = uploads[fieldKey];
    if (current?.id) {
      // Best-effort cleanup of the staged file on the server.
      void fetch("/api/hiring/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: current.id }),
      }).catch(() => undefined);
    }

    setUploads((prev) => ({ ...prev, [fieldKey]: null }));
  }, [uploads]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!form || submitting) return;
      setSubmitError(null);

      const uploadsByField: Record<string, { id: string } | undefined> = {};
      for (const [key, upload] of Object.entries(uploads)) {
        uploadsByField[key] = upload ? { id: upload.id } : undefined;
      }

      const nextErrors = validateApplicationValues(
        fields as unknown as HiringFieldConfig[],
        values,
        uploadsByField
      );
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        const firstKey = Object.keys(nextErrors)[0];
        document
          .querySelector(`[data-field="${firstKey}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      setSubmitting(true);
      try {
        const uploadIds: Record<string, string> = {};
        for (const [key, upload] of Object.entries(uploads)) {
          if (upload?.id) uploadIds[key] = upload.id;
        }

        const response = await fetch("/api/hiring/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, values, uploads: uploadIds }),
        });
        const json = await response.json().catch(() => null);

        if (response.status === 401) {
          router.replace(`/login?next=/careers/${slug}`);
          return;
        }
        if (!response.ok || !json?.success) {
          setSubmitError(
            json?.message || "Failed to submit the application. Please try again."
          );
          return;
        }
        setSubmitted(true);
      } catch {
        setSubmitError(
          "Something went wrong while submitting. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [form, submitting, fields, values, uploads, slug, router]
  );

  if (roleDenied) {
    return (
      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-[640px] space-y-4 text-center">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Only customer accounts can apply for a job.
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all openings
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-16">
        <Container>
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading job opening…
          </div>
        </Container>
      </section>
    );
  }

  if (loadError || !form) {
    return (
      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-[640px] space-y-4 text-center">
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError || "This job opening is not available right now."}
            </p>
            <Link
              href="/careers"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all openings
            </Link>
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <Container>
        <div className="mx-auto max-w-[760px]">
          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All openings
          </Link>

          <div className="mt-4">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {form.title}
            </h1>
            {form.subtitle && (
              <p className="mt-1 text-sm text-muted">{form.subtitle}</p>
            )}
          </div>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-muted sm:text-base">
            {form.description}
          </p>

          {form.instructions && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Instructions for applicants
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-amber-800">
                {form.instructions}
              </p>
            </div>
          )}

          {submitted ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
              <CheckCircle2
                className="mx-auto h-10 w-10 text-emerald-600"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-lg font-bold text-emerald-900">
                Application submitted!
              </h2>
              <p className="mt-2 text-sm text-emerald-800">
                Thank you for applying to{" "}
                <span className="font-semibold">{form.title}</span>. Our team
                will review your application and get back to you on your
                contact number or email.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/careers"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  View other openings
                </Link>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted-light"
                >
                  Back to home
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              noValidate
            >
              <h2 className="text-lg font-semibold text-foreground">
                Application form
              </h2>
              <p className="mt-1 text-xs text-muted">
                Fields marked with * are required.
              </p>

              <div className="mt-6">
                <DynamicHiringFields
                  fields={fields}
                  values={values}
                  errors={errors}
                  uploads={uploads}
                  uploadingKeys={uploadingKeys}
                  disabled={submitting}
                  onValueChange={handleValueChange}
                  onUpload={handleUpload}
                  onRemoveUpload={handleRemoveUpload}
                />
              </div>

              {submitError && (
                <p className="mt-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting ? "Submitting…" : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </Container>
    </section>
  );
}
