"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import DynamicHiringFields, {
  RendererField,
} from "@/components/hiring/DynamicHiringFields";

interface FieldOption {
  label: string;
  value: string;
}

interface FormField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  maxLength?: number;
}

interface FormState {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  instructions: string;
  isFeatured: boolean;
  status: "draft" | "published" | "closed";
  fields: FormField[];
  applicationCount: number;
}

const FIELD_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "short_text", label: "Short Text" },
  { value: "long_text", label: "Long Text / Textarea" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone Number" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown / Select" },
  { value: "radio", label: "Radio Group" },
  { value: "checkbox", label: "Checkbox Group" },
  { value: "photo_upload", label: "Photo Upload" },
  { value: "signature_upload", label: "Signature Upload" },
  { value: "resume_upload", label: "Resume / Document Upload" },
];

const OPTION_TYPES = ["select", "radio", "checkbox"];
const NUMBER_TYPES = ["number"];
const TEXT_TYPES = ["short_text", "long_text"];
const UPLOAD_TYPES = ["photo_upload", "signature_upload", "resume_upload"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  closed: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
};

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const LABEL_CLASS = "block text-sm font-medium text-gray-700 mb-1";

function generateKey(label: string, existing: FormField[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";
  const keys = new Set(existing.map((field) => field.key));
  if (!keys.has(base)) return base;
  let counter = 2;
  while (keys.has(`${base}_${counter}`)) counter += 1;
  return `${base}_${counter}`;
}

export default function HiringFormBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const formId = params.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [state, setState] = useState<FormState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`/api/admin/hiring/forms/${formId}`, {
          cache: "no-store",
        });
        if (response.status === 401) {
          router.push("/");
          return;
        }
        const json = await response.json();
        if (cancelled) return;
        if (!response.ok || !json.success) {
          setLoadError(json.message || "Failed to load the form");
          return;
        }
        const form = json.data.form;
        setState({
          title: form.title,
          slug: form.slug,
          subtitle: form.subtitle ?? "",
          description: form.description,
          instructions: form.instructions ?? "",
          isFeatured: Boolean(form.isFeatured),
          status: form.status,
          fields: (form.fields ?? []).map((field: FormField) => ({
            ...field,
            options: field.options ?? [],
          })),
          applicationCount: form.applicationCount ?? 0,
        });
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load the form. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [formId, router, reloadKey]);

  const patch = useCallback((changes: Partial<FormState>) => {
    setState((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  const patchField = useCallback(
    (index: number, changes: Partial<FormField>) => {
      setState((prev) => {
        if (!prev) return prev;
        const fields = prev.fields.map((field, i) =>
          i === index ? { ...field, ...changes } : field
        );
        return { ...prev, fields };
      });
    },
    []
  );

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    setState((prev) => {
      if (!prev) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.fields.length) return prev;
      const fields = [...prev.fields];
      [fields[index], fields[target]] = [fields[target], fields[index]];
      return { ...prev, fields };
    });
  }, []);

  const removeField = useCallback((index: number) => {
    setState((prev) => {
      if (!prev) return prev;
      return { ...prev, fields: prev.fields.filter((_, i) => i !== index) };
    });
  }, []);

  const addField = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const key = generateKey("new_field", prev.fields);
      return {
        ...prev,
        fields: [
          ...prev.fields,
          {
            key,
            label: "New Field",
            type: "short_text",
            placeholder: "",
            helpText: "",
            required: false,
            options: [],
            maxLength: TEXT_TYPES.includes("short_text") ? 300 : undefined,
          },
        ],
      };
    });
  }, []);

  const duplicateKeys = useMemo(() => {
    if (!state) return [] as string[];
    const seen = new Set<string>();
    const dupes = new Set<string>();
    for (const field of state.fields) {
      if (seen.has(field.key)) dupes.add(field.key);
      seen.add(field.key);
    }
    return [...dupes];
  }, [state]);

  const save = useCallback(
    async (
      nextStatus?: "draft" | "published" | "closed"
    ): Promise<boolean> => {
      if (!state) return false;
      setSaveError(null);
      setSavedNotice(null);

      if (state.title.trim().length < 3) {
        setSaveError("Job title must be at least 3 characters.");
        return false;
      }
      if (state.description.trim().length < 10) {
        setSaveError("Please write a hiring description (10+ characters).");
        return false;
      }
      if (state.fields.length === 0) {
        setSaveError("A form needs at least one field.");
        return false;
      }
      if (duplicateKeys.length > 0) {
        setSaveError(
          `Duplicate field keys: ${duplicateKeys.join(", ")}. Every field needs a unique key.`
        );
        return false;
      }
      for (const field of state.fields) {
        if (!field.label.trim()) {
          setSaveError("Every field needs a label.");
          return false;
        }
        if (
          OPTION_TYPES.includes(field.type) &&
          (!field.options || field.options.filter((o) => o.value).length === 0)
        ) {
          setSaveError(
            `"${field.label}" needs at least one option (label + value).`
          );
          return false;
        }
      }

      setSaving(true);
      try {
        const status = nextStatus ?? state.status;
        const payload = {
          title: state.title.trim(),
          subtitle: state.subtitle.trim() || undefined,
          description: state.description.trim(),
          instructions: state.instructions.trim() || undefined,
          isFeatured: state.isFeatured,
          status,
          fields: state.fields.map((field) => ({
            key: field.key.trim(),
            label: field.label.trim(),
            type: field.type,
            placeholder: field.placeholder?.trim() || undefined,
            helpText: field.helpText?.trim() || undefined,
            required: field.required,
            options: OPTION_TYPES.includes(field.type)
              ? (field.options ?? []).filter((option) => option.value)
              : undefined,
            min: NUMBER_TYPES.includes(field.type) ? field.min : undefined,
            max: NUMBER_TYPES.includes(field.type) ? field.max : undefined,
            maxLength:
              TEXT_TYPES.includes(field.type) ? field.maxLength : undefined,
          })),
        };

        const response = await fetch(`/api/admin/hiring/forms/${formId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (!response.ok || !json.success) {
          setSaveError(json.message || "Failed to save the form");
          return false;
        }

        // Status transitions (publish/close/reopen) go through the status API
        // so the server re-validates before publishing.
        if (nextStatus && nextStatus !== state.status) {
          const statusResponse = await fetch(
            `/api/admin/hiring/forms/${formId}/status`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: nextStatus }),
            }
          );
          const statusJson = await statusResponse.json();
          if (!statusResponse.ok || !statusJson.success) {
            setSaveError(statusJson.message || "Failed to update the status");
            return false;
          }
          patch({ status: nextStatus });
        }

        setSavedNotice(
          nextStatus === "published"
            ? "Form saved and published. It is now live for applications."
            : "Form saved."
        );
        setReloadKey((key) => key + 1);
        return true;
      } catch {
        setSaveError("Something went wrong while saving. Please try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [state, duplicateKeys, formId, patch]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading form builder…
      </div>
    );
  }

  if (loadError || !state) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError || "Form not found"}
        </p>
        <Link
          href="/admin/hiring"
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
        title="Form Builder"
        subtitle={`${state.title} · /careers/${state.slug} · ${state.applicationCount} application(s)`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminStatusBadge
              status={state.status}
              colors={STATUS_COLORS}
              labels={STATUS_LABELS}
            />
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
            {state.status !== "published" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save("published")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {state.status === "closed" ? "Reopen" : "Publish"}
              </button>
            )}
            {state.status === "published" && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save("closed")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Close Form
              </button>
            )}
          </div>
        }
      />

      {saveError && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveError}
        </p>
      )}
      {savedNotice && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {savedNotice}
        </p>
      )}

      {/* Form information */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold text-gray-900">Form Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Job Title *</label>
            <input
              type="text"
              value={state.title}
              onChange={(event) => patch({ title: event.target.value })}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>Subtitle</label>
            <input
              type="text"
              value={state.subtitle}
              onChange={(event) => patch({ subtitle: event.target.value })}
              placeholder="e.g. Full-time · Bengaluru"
              className={INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Hiring Description *</label>
            <textarea
              rows={5}
              value={state.description}
              onChange={(event) => patch({ description: event.target.value })}
              className={`${INPUT_CLASS} resize-none`}
            />
            <p className="mt-1 text-xs text-gray-500">
              Shown on the public application page exactly as written (plain
              text, multi-line).
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>Instructions for Applicants</label>
            <textarea
              rows={3}
              value={state.instructions}
              onChange={(event) => patch({ instructions: event.target.value })}
              placeholder="e.g. Carry an ID proof for the interview…"
              className={`${INPUT_CLASS} resize-none`}
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-3 sm:col-span-2">
            <button
              type="button"
              role="switch"
              aria-checked={state.isFeatured}
              onClick={() => patch({ isFeatured: !state.isFeatured })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                state.isFeatured ? "bg-emerald-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  state.isFeatured ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Featured (homepage Apply Now prefers the featured published form)
            </span>
          </label>
        </div>
      </section>

      {/* Fields */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Form Fields</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {state.fields.length} field(s) · keys are stable identifiers used
              to store answers
            </p>
          </div>
          <button
            type="button"
            onClick={addField}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {state.fields.map((field, index) => (
            <div
              key={`${field.key}-${index}`}
              className="rounded-lg border border-gray-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-xs text-gray-400">
                    {field.key}
                  </span>
                  {UPLOAD_TYPES.includes(field.type) && (
                    <span className="rounded bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-600">
                      upload
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    aria-label="Move field up"
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={index === state.fields.length - 1}
                    onClick={() => moveField(index, 1)}
                    aria-label="Move field down"
                    className="rounded p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    aria-label="Remove field"
                    className="rounded p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className={LABEL_CLASS}>Label *</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(event) =>
                      patchField(index, { label: event.target.value })
                    }
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Field Key *</label>
                  <input
                    type="text"
                    value={field.key}
                    onChange={(event) =>
                      patchField(index, {
                        key: event.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9_]/g, "_"),
                      })
                    }
                    className={`${INPUT_CLASS} font-mono`}
                  />
                  {duplicateKeys.includes(field.key) && (
                    <p className="mt-1 text-xs text-red-600">Duplicate key</p>
                  )}
                </div>
                <div>
                  <label className={LABEL_CLASS}>Type *</label>
                  <select
                    value={field.type}
                    onChange={(event) =>
                      patchField(index, {
                        type: event.target.value,
                        options:
                          OPTION_TYPES.includes(event.target.value) ??
                          field.options
                            ? field.options ?? []
                            : undefined,
                      })
                    }
                    className={INPUT_CLASS}
                  >
                    {FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!UPLOAD_TYPES.includes(field.type) && (
                  <>
                    <div>
                      <label className={LABEL_CLASS}>Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder ?? ""}
                        onChange={(event) =>
                          patchField(index, { placeholder: event.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>Helper Text</label>
                      <input
                        type="text"
                        value={field.helpText ?? ""}
                        onChange={(event) =>
                          patchField(index, { helpText: event.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </>
                )}

                {TEXT_TYPES.includes(field.type) && (
                  <div>
                    <label className={LABEL_CLASS}>Max Length</label>
                    <input
                      type="number"
                      min={10}
                      max={4000}
                      value={field.maxLength ?? ""}
                      onChange={(event) =>
                        patchField(index, {
                          maxLength: event.target.value
                            ? Number(event.target.value)
                            : undefined,
                        })
                      }
                      className={INPUT_CLASS}
                    />
                  </div>
                )}

                {NUMBER_TYPES.includes(field.type) && (
                  <>
                    <div>
                      <label className={LABEL_CLASS}>Min</label>
                      <input
                        type="number"
                        value={field.min ?? ""}
                        onChange={(event) =>
                          patchField(index, {
                            min: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS}>Max</label>
                      <input
                        type="number"
                        value={field.max ?? ""}
                        onChange={(event) =>
                          patchField(index, {
                            max: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })
                        }
                        className={INPUT_CLASS}
                      />
                    </div>
                  </>
                )}

                {UPLOAD_TYPES.includes(field.type) && (
                  <p className="text-xs text-gray-500 sm:col-span-3">
                    System limits apply and cannot be exceeded:{" "}
                    {field.type === "resume_upload"
                      ? "PDF only, up to 3 MB."
                      : field.type === "signature_upload"
                        ? "JPEG/PNG/WebP, up to 1 MB."
                        : "JPEG/PNG/WebP, up to 2 MB."}{" "}
                    You can rename the label, make it optional or remove the
                    field.
                  </p>
                )}

                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(event) =>
                      patchField(index, { required: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Required
                </label>
              </div>

              {OPTION_TYPES.includes(field.type) && (
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-600">
                    Options (label shown to applicant / stored value)
                  </p>
                  <div className="mt-2 space-y-2">
                    {(field.options ?? []).map((option, optionIndex) => (
                      <div
                        key={optionIndex}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input
                          type="text"
                          value={option.label}
                          placeholder="Label"
                          onChange={(event) => {
                            const options = [...(field.options ?? [])];
                            options[optionIndex] = {
                              ...options[optionIndex],
                              label: event.target.value,
                              value:
                                options[optionIndex].value ||
                                event.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]+/g, "_")
                                  .replace(/^_+|_+$/g, ""),
                            };
                            patchField(index, { options });
                          }}
                          className={`${INPUT_CLASS} w-40`}
                        />
                        <input
                          type="text"
                          value={option.value}
                          placeholder="value"
                          onChange={(event) => {
                            const options = [...(field.options ?? [])];
                            options[optionIndex] = {
                              ...options[optionIndex],
                              value: event.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]/g, ""),
                            };
                            patchField(index, { options });
                          }}
                          className={`${INPUT_CLASS} w-32 font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const options = (field.options ?? []).filter(
                              (_, i) => i !== optionIndex
                            );
                            patchField(index, { options });
                          }}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                          aria-label="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const options = field.options ?? [];
                        patchField(index, {
                          options: [
                            ...options,
                            { label: "", value: "" },
                          ],
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-white"
                    >
                      <Plus className="h-3 w-3" />
                      Add Option
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {state.fields.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No fields yet. Add at least one field before saving.
            </p>
          )}
        </div>
      </section>

      {/* Preview modal */}
      <AdminModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Form Preview"
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{state.title}</h3>
            {state.subtitle && (
              <p className="text-sm text-gray-500">{state.subtitle}</p>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {state.description}
          </p>
          {state.instructions && (
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Instructions</p>
              <p className="mt-1 whitespace-pre-wrap">{state.instructions}</p>
            </div>
          )}
          <DynamicHiringFields
            fields={state.fields as RendererField[]}
            values={{}}
            errors={{}}
            uploads={{}}
            uploadingKeys={{}}
            disabled
            onValueChange={() => undefined}
            onUpload={() => undefined}
            onRemoveUpload={() => undefined}
          />
        </div>
      </AdminModal>
    </div>
  );
}
