"use client";

import { useRef } from "react";
import { Loader2, Upload, X, FileText } from "lucide-react";

export interface RendererField {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export interface RendererUpload {
  id: string;
  fileName: string;
  size: number;
  /** Local object URL for instant client-side preview (never a storage URL). */
  previewUrl?: string;
}

interface DynamicHiringFieldsProps {
  fields: RendererField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  uploads: Record<string, RendererUpload | null>;
  uploadingKeys: Record<string, boolean>;
  disabled?: boolean;
  onValueChange: (fieldKey: string, value: string) => void;
  onUpload: (fieldKey: string, file: File) => void;
  onRemoveUpload: (fieldKey: string) => void;
}

const INPUT_CLASS =
  "mt-2 block w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";
const TEXTAREA_CLASS =
  "mt-2 block w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60";
const LABEL_CLASS = "block text-sm font-medium text-foreground";

function uploadAcceptForType(type: string): string {
  if (type === "resume_upload") return "application/pdf";
  return "image/jpeg,image/png,image/webp";
}

function uploadHintForType(field: RendererField): string {
  if (field.type === "resume_upload") return "PDF only, up to 3 MB";
  if (field.type === "signature_upload") return "JPEG, PNG or WebP, up to 1 MB";
  return "JPEG, PNG or WebP, up to 2 MB";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FieldLabel({ field }: { field: RendererField }) {
  return (
    <label className={LABEL_CLASS}>
      {field.label}
      {field.required ? (
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      ) : (
        <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
      )}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function FieldHelp({ text }: { text?: string }) {
  if (!text) return null;
  return <p className="mt-1.5 text-xs text-muted">{text}</p>;
}

function UploadField({
  field,
  upload,
  uploading,
  disabled,
  error,
  onUpload,
  onRemove,
}: {
  field: RendererField;
  upload: RendererUpload | null;
  uploading: boolean;
  disabled?: boolean;
  error?: string;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <FieldLabel field={field} />
      {upload ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-light px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {field.type === "resume_upload" || !upload.previewUrl ? (
              <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview; next/image cannot optimize blob: URLs
              <img
                src={upload.previewUrl}
                alt=""
                className="h-10 w-10 rounded-md border border-border object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {upload.fileName}
              </p>
              <p className="text-xs text-muted">{formatBytes(upload.size)}</p>
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Remove ${field.label}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept={uploadAcceptForType(field.type)}
            disabled={disabled || uploading}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-light/40 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {uploading ? "Uploading..." : `Choose file`}
          </button>
          <FieldHelp text={uploadHintForType(field)} />
        </>
      )}
      <FieldError message={error} />
    </div>
  );
}

/**
 * Renders a hiring form's configured fields — used by the public application
 * page and by the admin form preview. Nothing here is hardcoded to the
 * default nine fields; the published configuration drives everything.
 */
export default function DynamicHiringFields({
  fields,
  values,
  errors,
  uploads,
  uploadingKeys,
  disabled,
  onValueChange,
  onUpload,
  onRemoveUpload,
}: DynamicHiringFieldsProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {fields.map((field) => {
        const isWide =
          field.type === "long_text" ||
          field.type === "photo_upload" ||
          field.type === "signature_upload" ||
          field.type === "resume_upload" ||
          field.type === "radio" ||
          field.type === "checkbox";

        if (
          field.type === "photo_upload" ||
          field.type === "signature_upload" ||
          field.type === "resume_upload"
        ) {
          return (
            <div
              key={field.key}
              data-field={field.key}
              className={isWide ? "sm:col-span-2" : ""}
            >
              <UploadField
                field={field}
                upload={uploads[field.key] ?? null}
                uploading={Boolean(uploadingKeys[field.key])}
                disabled={disabled}
                error={errors[field.key]}
                onUpload={(file) => onUpload(field.key, file)}
                onRemove={() => onRemoveUpload(field.key)}
              />
            </div>
          );
        }

        if (field.type === "long_text") {
          return (
            <div key={field.key} data-field={field.key} className="sm:col-span-2">
              <FieldLabel field={field} />
              <textarea
                rows={4}
                maxLength={field.maxLength ?? 4000}
                value={values[field.key] ?? ""}
                disabled={disabled}
                placeholder={field.placeholder}
                onChange={(e) => onValueChange(field.key, e.target.value)}
                className={TEXTAREA_CLASS}
              />
              <FieldHelp text={field.helpText} />
              <FieldError message={errors[field.key]} />
            </div>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.key} data-field={field.key}>
              <FieldLabel field={field} />
              <select
                value={values[field.key] ?? ""}
                disabled={disabled}
                onChange={(e) => onValueChange(field.key, e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select an option</option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FieldHelp text={field.helpText} />
              <FieldError message={errors[field.key]} />
            </div>
          );
        }

        if (field.type === "radio") {
          return (
            <div key={field.key} data-field={field.key} className="sm:col-span-2">
              <FieldLabel field={field} />
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {(field.options ?? []).map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="radio"
                      name={field.key}
                      value={option.value}
                      checked={values[field.key] === option.value}
                      disabled={disabled}
                      onChange={() => onValueChange(field.key, option.value)}
                      className="h-4 w-4 border-border text-primary focus:ring-primary"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <FieldHelp text={field.helpText} />
              <FieldError message={errors[field.key]} />
            </div>
          );
        }

        if (field.type === "checkbox") {
          const selected = (values[field.key] ?? "")
            .split(",")
            .filter((item) => item !== "");
          return (
            <div key={field.key} data-field={field.key} className="sm:col-span-2">
              <FieldLabel field={field} />
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {(field.options ?? []).map((option) => {
                  const checked = selected.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="inline-flex cursor-pointer items-center gap-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          const next = checked
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value];
                          onValueChange(field.key, next.join(","));
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
              <FieldHelp text={field.helpText} />
              <FieldError message={errors[field.key]} />
            </div>
          );
        }

        const inputType =
          field.type === "email"
            ? "email"
            : field.type === "phone"
              ? "tel"
              : field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : "text";

        return (
          <div key={field.key} data-field={field.key}>
            <FieldLabel field={field} />
            <input
              type={inputType}
              value={values[field.key] ?? ""}
              disabled={disabled}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              min={field.type === "number" ? field.min : undefined}
              max={field.type === "number" ? field.max : undefined}
              onChange={(e) => onValueChange(field.key, e.target.value)}
              className={INPUT_CLASS}
            />
            <FieldHelp text={field.helpText} />
            <FieldError message={errors[field.key]} />
          </div>
        );
      })}
    </div>
  );
}
