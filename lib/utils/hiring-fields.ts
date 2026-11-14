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
  /**
   * Whether the field is included on the form. Admins toggle fields on/off in
   * the builder; a toggled-off field keeps its full configuration but is
   * excluded from the public form, validation and stored answers.
   * Missing/undefined counts as enabled (backward compatible).
   */
  enabled?: boolean;
  options?: HiringFieldOption[];
  /** Numeric bounds for `number` fields. */
  min?: number;
  max?: number;
  /** Character budget for text-ish fields. */
  maxLength?: number;
}

/** A field is part of the form unless the admin explicitly toggled it off. */
export function isFieldEnabled(field: Pick<HiringFieldConfig, "enabled">): boolean {
  return field.enabled !== false;
}

/** Only the fields an admin left switched on. */
export function enabledHiringFields(
  fields: HiringFieldConfig[]
): HiringFieldConfig[] {
  return fields.filter(isFieldEnabled);
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
  fatherName: "father_name",
  motherName: "mother_name",
  age: "age",
  gender: "gender",
  socialCategory: "social_category",
  contactNumber: "contact_number",
  email: "gmail_email",
  idProof: "id_proof_number",
  presentAddress: "present_address",
  permanentAddress: "permanent_address",
  landmark: "landmark",
  district: "district",
  state: "state",
  city: "city",
  pincode: "pincode",
  nearestRailwayStation: "nearest_railway_station",
  bloodGroup: "blood_group",
  matricBoardName: "matric_board_name",
  matricFullMarks: "matric_full_marks",
  matricObtainedMarks: "matric_obtained_marks",
  matricSchool: "matric_school_name_address",
  hsBoardName: "hs_board_name",
  hsFullMarks: "hs_full_marks",
  hsObtainedMarks: "hs_obtained_marks",
  hsSchool: "hs_school_name_address",
  lastQualification: "last_qualification",
  extraQualification: "extra_qualification",
  familyMembers: "family_members",
  familyIncome: "family_income",
  experienceYears: "experience_years",
  experienceWhere: "experience_where",
  heardFrom: "heard_from",
  declaration: "declaration",
  photo: "photo_upload",
  signature: "signature_upload",
  resume: "resume_upload",
  marksheet: "marksheet_upload",
} as const;

const GENDER_OPTIONS: HiringFieldOption[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const SOCIAL_CATEGORY_OPTIONS: HiringFieldOption[] = [
  { label: "General", value: "general" },
  { label: "OBC", value: "obc" },
  { label: "SC", value: "sc" },
  { label: "ST", value: "st" },
  { label: "EWS", value: "ews" },
];

const BLOOD_GROUP_OPTIONS: HiringFieldOption[] = [
  { label: "A+", value: "a_positive" },
  { label: "A-", value: "a_negative" },
  { label: "B+", value: "b_positive" },
  { label: "B-", value: "b_negative" },
  { label: "O+", value: "o_positive" },
  { label: "O-", value: "o_negative" },
  { label: "AB+", value: "ab_positive" },
  { label: "AB-", value: "ab_negative" },
];

const HEARD_FROM_OPTIONS: HiringFieldOption[] = [
  { label: "Website", value: "website" },
  { label: "Social Media", value: "social_media" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Newspaper", value: "newspaper" },
  { label: "Friend / Relative", value: "friend_relative" },
  { label: "Other", value: "other" },
];

const DECLARATION_OPTIONS: HiringFieldOption[] = [
  {
    label:
      "I hereby declare that the information provided above is true and correct to the best of my knowledge.",
    value: "declared_true",
  },
];

/**
 * The full default template from the hiring requirements. New forms start
 * with every field switched ON; admins then toggle fields on/off, mark which
 * ones are mandatory, and can add any number of custom fields on top.
 */
export function defaultHiringFields(): HiringFieldConfig[] {
  return [
    // ── Personal details ──
    {
      key: DEFAULT_FIELD_KEYS.fullName,
      label: "Full Name",
      type: "short_text",
      placeholder: "Enter your full name",
      required: true,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.fatherName,
      label: "Father's Name",
      type: "short_text",
      placeholder: "Enter your father's name",
      required: false,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.motherName,
      label: "Mother's Name",
      type: "short_text",
      placeholder: "Enter your mother's name",
      required: false,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.age,
      label: "Age",
      type: "number",
      placeholder: "e.g. 24",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.gender,
      label: "Gender",
      type: "select",
      options: GENDER_OPTIONS,
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.socialCategory,
      label: "Social Category",
      type: "select",
      options: SOCIAL_CATEGORY_OPTIONS,
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.contactNumber,
      label: "Mobile Number",
      type: "phone",
      placeholder: "10-digit mobile number",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.email,
      label: "Email ID",
      type: "email",
      placeholder: "you@example.com",
      required: true,
    },
    {
      key: DEFAULT_FIELD_KEYS.idProof,
      label: "ID Proof Number (Aadhaar / PAN / Voter ID)",
      type: "short_text",
      placeholder: "Enter your ID number",
      required: false,
      maxLength: 40,
    },

    // ── Address details ──
    {
      key: DEFAULT_FIELD_KEYS.presentAddress,
      label: "Present Address",
      type: "long_text",
      placeholder: "House / Street / Area, full present address",
      required: false,
      maxLength: 400,
    },
    {
      key: DEFAULT_FIELD_KEYS.permanentAddress,
      label: "Permanent Address",
      type: "long_text",
      placeholder: "House / Street / Area, full permanent address",
      required: false,
      maxLength: 400,
    },
    {
      key: DEFAULT_FIELD_KEYS.landmark,
      label: "Landmark",
      type: "short_text",
      placeholder: "e.g. Near City Mall",
      required: false,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.district,
      label: "District",
      type: "short_text",
      placeholder: "e.g. Howrah",
      required: false,
      maxLength: 60,
    },
    {
      key: DEFAULT_FIELD_KEYS.state,
      label: "State",
      type: "short_text",
      placeholder: "e.g. West Bengal",
      required: false,
      maxLength: 60,
    },
    {
      key: DEFAULT_FIELD_KEYS.city,
      label: "City",
      type: "short_text",
      placeholder: "e.g. Kolkata",
      required: false,
      maxLength: 60,
    },
    {
      key: DEFAULT_FIELD_KEYS.pincode,
      label: "PIN Code",
      type: "short_text",
      placeholder: "6-digit PIN code",
      required: false,
      maxLength: 6,
    },
    {
      key: DEFAULT_FIELD_KEYS.nearestRailwayStation,
      label: "Nearest Railway Station",
      type: "short_text",
      placeholder: "e.g. Howrah Junction",
      required: false,
      maxLength: 120,
    },
    {
      key: DEFAULT_FIELD_KEYS.bloodGroup,
      label: "Blood Group",
      type: "select",
      options: BLOOD_GROUP_OPTIONS,
      required: false,
    },

    // ── Education: Matriculation (10th) ──
    {
      key: DEFAULT_FIELD_KEYS.matricBoardName,
      label: "Matriculation (10th) — Board Name",
      type: "short_text",
      placeholder: "e.g. WBBSE, CBSE, ICSE",
      required: false,
      maxLength: 80,
    },
    {
      key: DEFAULT_FIELD_KEYS.matricFullMarks,
      label: "Matriculation (10th) — Full Marks",
      type: "number",
      placeholder: "e.g. 100",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.matricObtainedMarks,
      label: "Matriculation (10th) — Obtained Marks",
      type: "number",
      placeholder: "e.g. 78",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.matricSchool,
      label: "Matriculation (10th) — School Name & Address",
      type: "long_text",
      placeholder: "School name with full address",
      required: false,
      maxLength: 400,
    },

    // ── Education: Higher Secondary (12th) ──
    {
      key: DEFAULT_FIELD_KEYS.hsBoardName,
      label: "Higher Secondary (12th) — Board Name",
      type: "short_text",
      placeholder: "e.g. WBCHSE, CBSE, ISC",
      required: false,
      maxLength: 80,
    },
    {
      key: DEFAULT_FIELD_KEYS.hsFullMarks,
      label: "Higher Secondary (12th) — Full Marks",
      type: "number",
      placeholder: "e.g. 100",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.hsObtainedMarks,
      label: "Higher Secondary (12th) — Obtained Marks",
      type: "number",
      placeholder: "e.g. 72",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.hsSchool,
      label: "Higher Secondary (12th) — School Name & Address",
      type: "long_text",
      placeholder: "School name with full address",
      required: false,
      maxLength: 400,
    },

    // ── Education: higher qualifications ──
    {
      key: DEFAULT_FIELD_KEYS.lastQualification,
      label: "Last Qualification",
      type: "short_text",
      placeholder: "e.g. Graduation — B.A. (2024)",
      required: false,
      maxLength: 160,
    },
    {
      key: DEFAULT_FIELD_KEYS.extraQualification,
      label: "Additional / Extra Qualification",
      type: "short_text",
      placeholder: "e.g. ITI, Diploma, Computer Course",
      required: false,
      maxLength: 200,
    },

    // ── Family ──
    {
      key: DEFAULT_FIELD_KEYS.familyMembers,
      label: "Total Family Members",
      type: "number",
      placeholder: "e.g. 4",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.familyIncome,
      label: "Total Family Income (Annual, ₹)",
      type: "number",
      placeholder: "e.g. 180000",
      required: false,
    },

    // ── Experience ──
    {
      key: DEFAULT_FIELD_KEYS.experienceYears,
      label: "Experience (Years)",
      type: "number",
      placeholder: "e.g. 2 (0 for freshers)",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.experienceWhere,
      label: "Experience — Where (Company / Organisation)",
      type: "short_text",
      placeholder: "e.g. 2 years at XYZ Logistics, Delhi",
      required: false,
      maxLength: 200,
    },

    // ── Others ──
    {
      key: DEFAULT_FIELD_KEYS.heardFrom,
      label: "Where did you hear about this job?",
      type: "radio",
      options: HEARD_FROM_OPTIONS,
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.declaration,
      label: "Declaration",
      type: "checkbox",
      options: DECLARATION_OPTIONS,
      required: true,
    },

    // ── Uploads ──
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
      label: "CV / Resume Upload",
      type: "resume_upload",
      helpText: "PDF only, up to 3 MB.",
      required: false,
    },
    {
      key: DEFAULT_FIELD_KEYS.marksheet,
      label: "Last Qualification Marksheet Upload",
      type: "resume_upload",
      helpText: "PDF only, up to 3 MB.",
      required: false,
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
    // A field the admin toggled OFF is not part of the form at all.
    if (!isFieldEnabled(field)) continue;

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

/** Collect the set of enabled upload field keys present on a form. */
export function uploadFieldKeys(fields: HiringFieldConfig[]): string[] {
  return fields
    .filter((field) => isFieldEnabled(field) && isUploadFieldType(field.type))
    .map((f) => f.key);
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
    if (!isFieldEnabled(field)) continue;

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

/**
 * "₹99" / "₹1,250.50" — used by admin and public UIs whenever an application
 * fee is displayed.
 */
export function formatHiringPrice(price: number | undefined | null): string {
  const amount = Number(price ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "Free";
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
