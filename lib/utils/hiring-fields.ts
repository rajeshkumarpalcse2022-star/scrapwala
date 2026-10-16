/**
 * Pure, framework-free hiring form logic.
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested with the repo's `node --test` runner and reused by both the Zod
 * schemas and the application-submission service.
 */

export const HIRING_FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "date",
  "select",
  "radio",
  "checkbox",
  "photo_upload",
  "signature_upload",
  "resume_upload",
] as const;

export type HiringFieldType = (typeof HIRING_FIELD_TYPES)[number];

export const UPLOAD_FIELD_TYPES: readonly HiringFieldType[] = [
  "photo_upload",
  "signature_upload",
  "resume_upload",
];

export type HiringFieldOption = { label: string; value: string };

export interface HiringFieldConfig {
  /** Stable machine key. Never derived from the visible label. */
  key: string;
  label: string;
  type: HiringFieldType;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: HiringFieldOption[];
  /** Numeric bounds for `number` fields. */
  min?: number;
  max?: number;
  /** Character budget for text-ish fields. */
  maxLength?: number;
}

/** System-enforced upload limits. Admins may tighten, never exceed, these. */
export const UPLOAD_KIND_LIMITS = {
  photo_upload: {
    label: "Photo Upload",
    accept: ["image/jpeg", "image/png", "image/webp"],
    acceptLabel: "JPEG, PNG or WebP",
    maxBytes: 2 * 1024 * 1024,
  },
  signature_upload: {
    label: "Signature Upload",
    accept: ["image/jpeg", "image/png", "image/webp"],
    acceptLabel: "JPEG, PNG or WebP",
    maxBytes: 1 * 1024 * 1024,
  },
  resume_upload: {
    label: "Resume Upload",
    accept: ["application/pdf"],
    acceptLabel: "PDF",
    maxBytes: 3 * 1024 * 1024,
  },
} as const;

/** Stable keys used by the default template shipped with every new form. */
export const DEFAULT_FIELD_KEYS = {
  fullName: "full_name",
  contactNumber: "contact_number",
  whatsappNumber: "whatsapp_number",
  email: "gmail_email",
  education: "education",
  age: "age",
  photo: "photo_upload",
  signature: "signature_upload",
  resume: "resume_upload",
} as const;

/**
 * The nine default fields from the hiring requirements. New forms start from
 * this template; admins may then edit, reorder, add or remove fields.
 */
export function defaultHiringFields(): HiringFieldConfig[] {
  return [
    {
      key: DEFAULT_FIELD_KEYS.fullName,
      label: "Full Name",
      type: "short_text",
      placeholder: "Enter your full name",
      required: true,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.contactNumber,
      label: "Contact Number",
      type: "phone",
      placeholder: "10-digit mobile number",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.whatsappNumber,
      label: "WhatsApp Number",
      type: "phone",
      placeholder: "10-digit WhatsApp number",
      helpText: "Optional — fill only if it differs from your contact number.",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.email,
      label: "Gmail / Email",
      type: "email",
      placeholder: "you@gmail.com",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.education,
      label: "Education",
      type: "short_text",
      placeholder: "e.g. B.A., Class 12, ITI",
      required: true,
      maxLength: 160,
    },
    {
      key: DEFAULT_FIELD_KEYS.age,
      label: "Age",
      type: "number",
      placeholder: "e.g. 24",
      helpText: "Optional — must be between 18 and 70 if provided.",
      required: false,
      min: 18,
      max: 70,
    },
    {
      key: DEFAULT_FIELD_KEYS.photo,
      label: "Photo Upload",
      type: "photo_upload",
      helpText: "JPEG, PNG or WebP, up to 2 MB.",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.signature,
      label: "Signature Upload",
      type: "signature_upload",
      helpText: "JPEG, PNG or WebP, up to 1 MB.",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.resume,
      label: "Resume Upload",
      type: "resume_upload",
      helpText: "PDF only, up to 3 MB.",
      required: true,
    },
  ];
}

export function isUploadFieldType(type: HiringFieldType): boolean {
  return UPLOAD_FIELD_TYPES.includes(type);
}

/** Human-friendly slug from a job title, with a guaranteed non-empty result. */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "job-application";
}

/** Append `-2`, `-3`… until the slug is unique against `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}

/**
 * Normalise + validate a raw phone value to a bare 10-digit Indian mobile.
 * Returns the normalised value or null when invalid.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().replace(/[\s\-().]/g, "");
  if (value.startsWith("+91")) value = value.slice(3);
  else if (value.startsWith("0")) value = value.slice(1);
  if (!/^[6-9]\d{9}$/.test(value)) return null;
  return value;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  if (value.length > 254 || !EMAIL_RE.test(value)) return null;
  return value;
}

/**
 * Validate submitted answers against a concrete field configuration.
 *
 * Returns a map of `fieldKey -> message` for every invalid/missing value.
 * An empty object means the submission is valid.
 *
 * `uploadsByField` supplies the upload metadata already validated by the
 * upload service, so upload fields are checked by presence instead of value.
 */
export function validateApplicationValues(
  fields: HiringFieldConfig[],
  values: Record<string, unknown>,
  uploadsByField: Record<string, { id: string } | undefined> = {}
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = values[field.key];
    const upload = uploadsByField[field.key];

    if (isUploadFieldType(field.type)) {
      if (field.required && !upload) {
        errors[field.key] = `${field.label} is required.`;
      }
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : raw;
    const isEmpty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value === "") ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      if (field.required) errors[field.key] = `${field.label} is required.`;
      continue;
    }

    switch (field.type) {
      case "email": {
        if (normalizeEmail(value) === null) {
          errors[field.key] = "Please enter a valid email address.";
        }
        break;
      }
      case "phone": {
        if (normalizePhone(value) === null) {
          errors[field.key] =
            "Please enter a valid 10-digit mobile number (starts with 6-9).";
        }
        break;
      }
      case "number": {
        const num =
          typeof value === "number" ? value : Number(String(value).trim());
        if (!Number.isFinite(num) || String(value).trim() === "") {
          errors[field.key] = "Please enter a valid number.";
        } else {
          if (field.min !== undefined && num < field.min) {
            errors[field.key] = `Must be at least ${field.min}.`;
          } else if (field.max !== undefined && num > field.max) {
            errors[field.key] = `Must be at most ${field.max}.`;
          }
        }
        break;
      }
      case "date": {
        const text = String(value).trim();
        const parsed = new Date(text);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime())) {
          errors[field.key] = "Please enter a valid date.";
        }
        break;
      }
      case "select":
      case "radio": {
        const allowed = (field.options ?? []).map((option) => option.value);
        if (!allowed.includes(String(value))) {
          errors[field.key] = "Please choose one of the listed options.";
        }
        break;
      }
      case "checkbox": {
        const picked = Array.isArray(value) ? value.map(String) : [String(value)];
        const allowed = (field.options ?? []).map((option) => option.value);
        const invalid = picked.some((item) => !allowed.includes(item));
        if (invalid) {
          errors[field.key] = "Please choose only from the listed options.";
        }
        break;
      }
      case "long_text":
      case "short_text":
      default: {
        const text = String(value);
        const limit = field.maxLength ?? (field.type === "long_text" ? 4000 : 300);
        if (text.length > limit) {
          errors[field.key] = `Must be ${limit} characters or fewer.`;
        }
        break;
      }
    }
  }

  return errors;
}

/** Sanitise a submitted value into the plain-text form we persist. */
export function normalizeFieldValue(
  field: HiringFieldConfig,
  raw: unknown
): string {
  if (raw === undefined || raw === null) return "";

  switch (field.type) {
    case "email":
      return normalizeEmail(raw) ?? String(raw).trim();
    case "phone":
      return normalizePhone(raw) ?? String(raw).trim();
    case "checkbox":
      return Array.isArray(raw) ? raw.map(String).join(", ") : String(raw);
    case "long_text":
      return String(raw).replace(/\r\n/g, "\n").trim();
    default:
      return String(raw).trim();
  }
}

/** Collect the set of upload field keys present on a form. */
export function uploadFieldKeys(fields: HiringFieldConfig[]): string[] {
  return fields.filter((field) => isUploadFieldType(field.type)).map((f) => f.key);
}

/** A stored answer from a previously submitted application. */
export interface AutofillAnswer {
  fieldKey: string;
  label: string;
  type: string;
  value: string;
}

function normalizeLabelKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match answers from a previous application against the current form so the
 * applicant's common details (name, phone, email, …) can be pre-filled.
 *
 * Rules:
 * - Upload fields are never auto-filled — files must be re-attached manually.
 * - A field is filled only when the previous answer has the same type, and
 *   matches by field key first, then by case-insensitive label.
 * - `select`/`radio` values are reused only when they exist in the new form's
 *   options; `checkbox` values only when every picked option still exists.
 * - Values are trimmed to the new field's character limit.
 *
 * Returns `fieldKey -> value` for the fields that matched; everything else
 * stays empty for the user to fill manually.
 */
export function matchAutofillValues(
  fields: HiringFieldConfig[],
  answers: AutofillAnswer[]
): Record<string, string> {
  const byKey = new Map<string, AutofillAnswer>();
  const byLabel = new Map<string, AutofillAnswer>();
  for (const answer of answers) {
    if (answer.value.trim() === "") continue;
    if (!byKey.has(answer.fieldKey)) byKey.set(answer.fieldKey, answer);
    const labelKey = normalizeLabelKey(answer.label);
    if (labelKey && !byLabel.has(labelKey)) byLabel.set(labelKey, answer);
  }

  const result: Record<string, string> = {};
  for (const field of fields) {
    if (isUploadFieldType(field.type)) continue;

    const answer = [byKey.get(field.key), byLabel.get(normalizeLabelKey(field.label))].find(
      (candidate) => candidate !== undefined && candidate.type === field.type
    );
    if (!answer) continue;

    const value = answer.value.trim();
    if (value === "") continue;

    if (field.type === "select" || field.type === "radio") {
      const allowed = (field.options ?? []).map((option) => option.value);
      if (!allowed.includes(value)) continue;
    } else if (field.type === "checkbox") {
      const allowed = (field.options ?? []).map((option) => option.value);
      const picked = value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
      if (picked.length === 0 || picked.some((item) => !allowed.includes(item))) {
        continue;
      }
    } else {
      const limit = field.maxLength ?? (field.type === "long_text" ? 4000 : 300);
      if (value.length > limit) continue;
    }

    result[field.key] = value;
  }
  return result;
}
