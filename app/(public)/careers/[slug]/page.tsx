"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  IndianRupee,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Container from "@/components/common/Container";
import DynamicHiringFields, {
  RendererField,
  RendererUpload,
} from "@/components/hiring/DynamicHiringFields";
import { useAuth } from "@/hooks/useAuth";
import {
  UPLOAD_KIND_LIMITS,
  formatHiringPrice,
  matchAutofillValues,
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
  /** Application fee in rupees; 0 or missing = free. */
  price?: number;
}

interface PaymentOrderDTO {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  formTitle: string;
  feeLabel: string;
  prefill: {
    name: string;
    email?: string;
    contact?: string;
  };
}

/** Fields Razorpay Checkout passes to the success handler. */
interface RazorpayCheckoutResponse {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

interface RazorpayCheckout {
  open(): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

type UploadKind = "photo" | "signature" | "document";

const RAZORPAY_CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
const BRAND_COLOR = "#1b7a3d";

let razorpayScriptPromise: Promise<boolean> | null = null;

/** Injects Razorpay Checkout.js once; resolves false when it can't load. */
function loadRazorpayCheckout(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      // Allow a retry after a failed download.
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

/** Last Application ID submitted on this device — reused as a suggestion. */
const LAST_APPLICATION_ID_KEY = "scrapwala:hiring:lastApplicationId";

function readLastApplicationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_APPLICATION_ID_KEY);
  } catch {
    // Storage unavailable — suggestion stays empty.
    return null;
  }
}

function subscribeLastApplicationId(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getLastApplicationIdSnapshot() {
  return readLastApplicationId();
}

function getLastApplicationIdServerSnapshot() {
  return null;
}

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
  const [submittedApplicationId, setSubmittedApplicationId] = useState<
    string | null
  >(null);

  const [autofillId, setAutofillId] = useState("");
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [autofillNotice, setAutofillNotice] = useState<string | null>(null);
  const lastApplicationId = useSyncExternalStore(
    subscribeLastApplicationId,
    getLastApplicationIdSnapshot,
    getLastApplicationIdServerSnapshot
  );
  const [copiedId, setCopiedId] = useState(false);

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

  const handleAutofill = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const id = autofillId.trim();
      if (!id || autofillLoading) return;
      setAutofillError(null);
      setAutofillNotice(null);
      setAutofillLoading(true);
      try {
        const response = await fetch(
          `/api/hiring/applications/lookup?applicationId=${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        if (response.status === 401) {
          router.replace(`/login?next=/careers/${slug}`);
          return;
        }
        const json = await response.json().catch(() => null);
        if (!response.ok || !json?.success) {
          setAutofillError(
            json?.message ||
              "No previous application found with this Application ID."
          );
          return;
        }
        const prefilled = matchAutofillValues(
          fields as unknown as HiringFieldConfig[],
          json.data?.answers ?? []
        );
        const count = Object.keys(prefilled).length;
        if (count === 0) {
          setAutofillError(
            "No matching details found for this form. Please fill it manually."
          );
          return;
        }
        setValues((prev) => ({ ...prev, ...prefilled }));
        setErrors({});
        setAutofillNotice(
          `${count} field${count === 1 ? "" : "s"} filled from ${
            json.data?.applicationId ?? id
          }. Review and change anything before submitting — photo, signature and resume still need to be uploaded.`
        );
      } catch {
        setAutofillError(
          "Could not fetch the previous application. Please try again."
        );
      } finally {
        setAutofillLoading(false);
      }
    },
    [autofillId, autofillLoading, fields, router, slug]
  );

  const handleCopyApplicationId = useCallback(async () => {
    if (!submittedApplicationId) return;
    try {
      await navigator.clipboard.writeText(submittedApplicationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      // Clipboard unavailable — the ID stays visible to copy manually.
    }
  }, [submittedApplicationId]);

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

  const validateAndCollectUploads = useCallback(
    (): { uploadIds: Record<string, string> } | null => {
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
        return null;
      }

      const uploadIds: Record<string, string> = {};
      for (const [key, upload] of Object.entries(uploads)) {
        if (upload?.id) uploadIds[key] = upload.id;
      }
      return { uploadIds };
    },
    [uploads, fields, values]
  );

  /** Creates the application. When `payment` is set it is verified server-side. */
  const submitApplication = useCallback(
    async (
      uploadIds: Record<string, string>,
      payment?: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      }
    ): Promise<boolean> => {
      try {
        const response = await fetch("/api/hiring/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            values,
            uploads: uploadIds,
            ...(payment ? { payment } : {}),
          }),
        });
        const json = await response.json().catch(() => null);

        if (response.status === 401) {
          router.replace(`/login?next=/careers/${slug}`);
          return false;
        }
        if (!response.ok || !json?.success) {
          const base =
            json?.message ||
            "Failed to submit the application. Please try again.";
          setSubmitError(
            payment
              ? `${base} Your fee payment already went through (payment ID ${payment.razorpayPaymentId}) — contact support before paying again.`
              : base
          );
          return false;
        }

        const newApplicationId = json.data?.applicationId;
        if (typeof newApplicationId === "string" && newApplicationId) {
          setSubmittedApplicationId(newApplicationId);
          try {
            window.localStorage.setItem(
              LAST_APPLICATION_ID_KEY,
              newApplicationId
            );
          } catch {
            // Storage unavailable — the ID is still shown on screen.
          }
        }
        setSubmitted(true);
        return true;
      } catch {
        setSubmitError(
          payment
            ? `Your fee payment went through (payment ID ${payment.razorpayPaymentId}) but the application could not be submitted. Please check your connection and press Submit again — you will not be charged twice.`
            : "Something went wrong while submitting. Please try again."
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [slug, values, router]
  );

  /** Opens Razorpay Checkout, then submits the application on success. */
  const startPaidSubmit = useCallback(
    async (uploadIds: Record<string, string>): Promise<void> => {
      setSubmitting(true);
      setSubmitError(null);
      try {
        const orderResponse = await fetch("/api/payments/hiring-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const orderJson = await orderResponse.json().catch(() => null);

        if (orderResponse.status === 401) {
          router.replace(`/login?next=/careers/${slug}`);
          return;
        }
        if (!orderResponse.ok || !orderJson?.success) {
          setSubmitting(false);
          setSubmitError(
            orderJson?.message ||
              "Could not start the payment. Please try again."
          );
          return;
        }

        const order = orderJson.data?.order as PaymentOrderDTO | undefined;
        if (!order?.orderId || !order?.keyId || !order?.amount) {
          setSubmitting(false);
          setSubmitError(
            "Payment setup is incomplete. Please refresh and try again."
          );
          return;
        }

        const loaded = await loadRazorpayCheckout();
        if (!loaded || !window.Razorpay) {
          setSubmitting(false);
          setSubmitError(
            "Could not load the payment window. Check your connection and try again."
          );
          return;
        }

        const checkout = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "Scrapi",
          description: order.formTitle,
          prefill: order.prefill ?? {},
          theme: { color: BRAND_COLOR },
          handler: (response: RazorpayCheckoutResponse) => {
            void (async () => {
              if (
                !response.razorpay_order_id ||
                !response.razorpay_payment_id ||
                !response.razorpay_signature
              ) {
                setSubmitting(false);
                setSubmitError(
                  "Payment response is incomplete. If you were charged, contact support before paying again."
                );
                return;
              }
              await submitApplication(uploadIds, {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
            })();
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
              setSubmitError(
                "Payment window was closed before finishing. Your form is still filled in — no amount was charged."
              );
            },
          },
        });
        checkout.open();
      } catch {
        setSubmitError(
          "Could not start the payment. Please check your connection and try again."
        );
        setSubmitting(false);
      }
      // setSubmitting(false) happens in every exit path above or when the
      // submission finishes.
    },
    [slug, router, submitApplication]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!form || submitting) return;
      setSubmitError(null);

      const collected = validateAndCollectUploads();
      if (!collected) return;

      if ((form.price ?? 0) > 0) {
        await startPaidSubmit(collected.uploadIds);
        return;
      }

      setSubmitting(true);
      await submitApplication(collected.uploadIds);
    },
    [form, submitting, validateAndCollectUploads, startPaidSubmit, submitApplication]
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

          {(form.price ?? 0) > 0 && !submitted && (
            <div className="mt-5 rounded-xl border border-primary/20 bg-primary-light/40 p-4">
              <div className="flex items-start gap-3">
                <IndianRupee
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Application fee: {formatHiringPrice(form.price)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    This opening charges a one-time fee per application. After
                    filling the form you pay securely through Razorpay (UPI,
                    cards or netbanking) — the application is submitted only
                    after the payment succeeds.
                  </p>
                </div>
                <ShieldCheck
                  className="ml-auto h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              </div>
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
              {(form.price ?? 0) > 0 && (
                <p className="mt-1 text-sm font-medium text-emerald-800">
                  Application fee of {formatHiringPrice(form.price)} paid
                  successfully.
                </p>
              )}
              {submittedApplicationId && (
                <div className="mx-auto mt-4 max-w-[360px] rounded-xl border border-emerald-300 bg-white px-4 py-3">
                  <p className="text-xs font-medium text-emerald-700">
                    Your Application ID
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="font-mono text-lg font-bold tracking-wide text-emerald-900">
                      {submittedApplicationId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyApplicationId}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      aria-label="Copy Application ID"
                      title="Copy Application ID"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-emerald-700">
                    {copiedId
                      ? "Copied!"
                      : "Save this ID — use it to auto-fill your next application."}
                  </p>
                </div>
              )}
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
            <>
              <div className="mt-8 rounded-2xl border border-primary/20 bg-primary-light/40 p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  Fill from a previous application
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Applied before? Enter your Application ID (e.g. APP-000123)
                  and matching details will be filled automatically. You can
                  still change anything after filling. Photo, signature and
                  resume must be uploaded again.
                </p>
                <form
                  onSubmit={handleAutofill}
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    type="text"
                    value={autofillId}
                    onChange={(event) => {
                      setAutofillId(event.target.value);
                      setAutofillError(null);
                    }}
                    placeholder={
                      lastApplicationId
                        ? `e.g. ${lastApplicationId}`
                        : "APP-000123"
                    }
                    aria-label="Previous Application ID"
                    className="block w-full rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm uppercase tracking-wide text-foreground placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 sm:max-w-[240px]"
                  />
                  <button
                    type="submit"
                    disabled={autofillLoading || !autofillId.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-background px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {autofillLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {autofillLoading ? "Filling…" : "Autofill"}
                  </button>
                </form>
                {autofillError && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {autofillError}
                  </p>
                )}
                {autofillNotice && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {autofillNotice}
                  </p>
                )}
              </div>

            <form
              onSubmit={handleSubmit}
              className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
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
                ) : (form.price ?? 0) > 0 ? (
                  <IndianRupee className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting
                  ? "Processing… do not close this page"
                  : (form.price ?? 0) > 0
                    ? `Pay ${formatHiringPrice(form.price)} & Submit Application`
                    : "Submit Application"}
              </button>
              {(form.price ?? 0) > 0 && (
                <p className="mt-3 text-xs text-muted">
                  Payments are handled by Razorpay with bank-grade security.
                  You will be charged{" "}
                  <span className="font-semibold text-foreground">
                    {formatHiringPrice(form.price)}
                  </span>{" "}
                  exactly once per application.
                </p>
              )}
            </form>
            </>
          )}
        </div>
      </Container>
    </section>
  );
}
