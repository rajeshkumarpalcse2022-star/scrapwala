import mongoose from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { ApiError } from "@/lib/utils/api-error";
import HiringForm, { IHiringForm } from "@/models/HiringForm";
import HiringApplication, {
  IHiringAnswer,
  IHiringApplication,
  IHiringApplicationUpload,
} from "@/models/HiringApplication";
import HiringUpload from "@/models/HiringUpload";
import HiringPayment, { IHiringPayment } from "@/models/HiringPayment";
import Counter from "@/models/Counter";
import {
  HiringFieldConfig,
  defaultHiringFields,
  formatHiringPrice,
  isUploadFieldType,
  normalizeFieldValue,
  slugifyTitle,
  uniqueSlug,
  validateApplicationValues,
} from "@/lib/utils/hiring-fields";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyRazorpayPaymentSignature,
} from "@/lib/razorpay";
import { buildApplicationSummaryPdf } from "@/lib/utils/hiring-pdf";
import {
  createHiringDeliveryUrl,
  destroyHiringAsset,
  hiringUploadLimits,
  uploadHiringDocument,
  HiringUploadKind,
} from "@/services/cloudinary";

/* ── Types ── */

export interface HiringFormDTO {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  fields: HiringFieldConfig[];
  /** Application fee in rupees. 0 = free; > 0 requires a Razorpay payment. */
  price: number;
  status: "draft" | "published" | "closed";
  isFeatured: boolean;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicHiringFormDTO {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  instructions?: string;
  fields: HiringFieldConfig[];
  /** Application fee in rupees. 0 = free; > 0 requires a Razorpay payment. */
  price: number;
}

export interface HiringApplicationListItem {
  id: string;
  applicationId: string;
  formId: string;
  jobTitle: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  status: string;
  submittedAt: string;
  answerCount: number;
  uploadCount: number;
  /** Present when the application was submitted against a paid form. */
  payment?: {
    status: string;
    amount: number;
    currency: string;
    paidAt?: string;
  };
}

export interface HiringApplicationDetailDTO {
  id: string;
  applicationId: string;
  formId: string;
  jobTitle: string;
  jobSlug: string;
  applicantUserId: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  status: string;
  submittedAt: string;
  answers: { fieldKey: string; label: string; type: string; value: string }[];
  uploads: {
    fieldKey: string;
    label: string;
    kind: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
  /** Verified payment when this application carried a fee. */
  payment?: {
    orderId: string;
    paymentId?: string;
    status: string;
    amount: number;
    currency: string;
    paidAt?: string;
  } | null;
  formSnapshot: {
    title: string;
    slug: string;
    subtitle?: string;
    description: string;
    instructions?: string;
    fields: { key: string; label: string; type: string; required: boolean }[];
  };
}

/* ── Helpers ── */

function toIso(value: Date | undefined | null): string {
  return value ? new Date(value).toISOString() : new Date(0).toISOString();
}

const UPLOAD_KIND_BY_FIELD_TYPE: Record<string, HiringUploadKind> = {
  photo_upload: "photo",
  signature_upload: "signature",
  resume_upload: "document",
};

async function generateApplicationId(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "hiring_application" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  ).lean<{ sequence: number }>();
  return `APP-${String(counter?.sequence ?? 1).padStart(6, "0")}`;
}

/** Reject invalid field configurations before save/publish. */
function assertFormConfig(fields: HiringFieldConfig[]): void {
  if (fields.length === 0) {
    throw new ApiError(400, "A form needs at least one field", "INVALID_FORM");
  }
  if (fields.length > 40) {
    throw new ApiError(
      400,
      "A form can have at most 40 fields",
      "INVALID_FORM"
    );
  }

  const seen = new Set<string>();
  for (const field of fields) {
    if (seen.has(field.key)) {
      throw new ApiError(
        400,
        `Duplicate field key "${field.key}" — every field needs a unique key`,
        "INVALID_FORM"
      );
    }
    seen.add(field.key);

    if (
      (field.type === "select" ||
        field.type === "radio" ||
        field.type === "checkbox") &&
      (!field.options || field.options.length === 0)
    ) {
      throw new ApiError(
        400,
        `"${field.label}" needs at least one option`,
        "INVALID_FORM"
      );
    }

    if (
      field.type === "number" &&
      field.min !== undefined &&
      field.max !== undefined &&
      field.min > field.max
    ) {
      throw new ApiError(
        400,
        `"${field.label}" has a minimum greater than its maximum`,
        "INVALID_FORM"
      );
    }

    if (isUploadFieldType(field.type)) {
      const limits = hiringUploadLimits(UPLOAD_KIND_BY_FIELD_TYPE[field.type]);
      if (field.maxLength !== undefined) {
        throw new ApiError(
          400,
          `Upload field "${field.label}" cannot override the system size limit`,
          "INVALID_FORM"
        );
      }
      if (!limits) {
        throw new ApiError(
          400,
          `Upload field "${field.label}" has an unsupported type`,
          "INVALID_FORM"
        );
      }
    }
  }
}

function serializeForm(
  form: IHiringForm,
  applicationCount = 0
): HiringFormDTO {
  return {
    id: String(form._id),
    title: form.title,
    slug: form.slug,
    subtitle: form.subtitle,
    description: form.description,
    instructions: form.instructions,
    fields: (form.fields as unknown as HiringFieldConfig[]) ?? [],
    price: form.price ?? 0,
    status: form.status,
    isFeatured: form.isFeatured,
    applicationCount,
    createdAt: toIso(form.createdAt),
    updatedAt: toIso(form.updatedAt),
  };
}

function serializePublicForm(form: IHiringForm): PublicHiringFormDTO {
  return {
    id: String(form._id),
    title: form.title,
    slug: form.slug,
    subtitle: form.subtitle,
    description: form.description,
    instructions: form.instructions,
    fields: (form.fields as unknown as HiringFieldConfig[]) ?? [],
    price: form.price ?? 0,
  };
}

/* ── Form services (admin) ── */

export async function listAdminHiringForms(): Promise<HiringFormDTO[]> {
  await connectDB();
  const forms = await HiringForm.find()
    .sort({ updatedAt: -1 })
    .select("-__v")
    .lean<IHiringForm[]>();

  const counts = await HiringApplication.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $group: { _id: "$form", count: { $sum: 1 } } },
  ]);
  const countByForm = new Map(
    counts.map((entry) => [String(entry._id), entry.count])
  );

  return forms.map((form) =>
    serializeForm(form, countByForm.get(String(form._id)) ?? 0)
  );
}

export async function getAdminHiringForm(id: string): Promise<HiringFormDTO> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Hiring form not found", "NOT_FOUND");
  }
  const form = await HiringForm.findById(id).select("-__v");
  if (!form) throw new ApiError(404, "Hiring form not found", "NOT_FOUND");

  const count = await HiringApplication.countDocuments({ form: form._id });
  return serializeForm(form, count);
}

/** Rupees rounded to 2 decimals — Razorpay charges get computed in paise. */
function normalizePrice(price: number): number {
  return Math.round((price ?? 0) * 100) / 100;
}

export async function createHiringForm(
  input: {
    title: string;
    subtitle?: string;
    description: string;
    instructions?: string;
    price: number;
    status: "draft" | "published";
    isFeatured: boolean;
    fields: HiringFieldConfig[];
  },
  adminId: string
): Promise<HiringFormDTO> {
  await connectDB();
  assertFormConfig(input.fields);

  const existing = await HiringForm.find({ slug: /^[\w-]+$/ })
    .select("slug")
    .lean<{ slug: string }[]>();
  const slug = uniqueSlug(
    slugifyTitle(input.title),
    new Set(existing.map((entry) => entry.slug))
  );

  if (input.status === "published" && input.isFeatured) {
    await HiringForm.updateMany(
      { status: "published", isFeatured: true },
      { isFeatured: false }
    );
  }

  const form = await HiringForm.create({
    title: input.title,
    slug,
    subtitle: input.subtitle,
    description: input.description,
    instructions: input.instructions,
    fields: input.fields,
    price: Math.max(0, normalizePrice(input.price)),
    status: input.status,
    isFeatured: input.isFeatured,
    createdBy: new mongoose.Types.ObjectId(adminId),
  });

  return serializeForm(form, 0);
}

export async function updateHiringForm(
  id: string,
  input: {
    title: string;
    subtitle?: string;
    description: string;
    instructions?: string;
    price: number;
    status: "draft" | "published" | "closed";
    isFeatured: boolean;
    fields: HiringFieldConfig[];
  }
): Promise<HiringFormDTO> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Hiring form not found", "NOT_FOUND");
  }
  assertFormConfig(input.fields);

  const form = await HiringForm.findById(id);
  if (!form) throw new ApiError(404, "Hiring form not found", "NOT_FOUND");

  // Slug is generated once and never changes: published URLs stay stable.
  if (input.isFeatured && input.status === "published") {
    await HiringForm.updateMany(
      { _id: { $ne: form._id }, status: "published", isFeatured: true },
      { isFeatured: false }
    );
  }

  form.title = input.title;
  form.subtitle = input.subtitle;
  form.description = input.description;
  form.instructions = input.instructions;
  form.fields = input.fields as IHiringForm["fields"];
  form.price = Math.max(0, normalizePrice(input.price));
  form.status = input.status;
  form.isFeatured = input.isFeatured;
  await form.save();

  const count = await HiringApplication.countDocuments({ form: form._id });
  return serializeForm(form, count);
}

export async function setHiringFormStatus(
  id: string,
  status: "draft" | "published" | "closed"
): Promise<HiringFormDTO> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Hiring form not found", "NOT_FOUND");
  }
  const form = await HiringForm.findById(id);
  if (!form) throw new ApiError(404, "Hiring form not found", "NOT_FOUND");

  if (status === "published") {
    // Re-validating protects against forms saved before a validation rule
    // tightened.
    assertFormConfig(form.fields as unknown as HiringFieldConfig[]);
    if (form.isFeatured) {
      await HiringForm.updateMany(
        { _id: { $ne: form._id }, status: "published", isFeatured: true },
        { isFeatured: false }
      );
    }
  }

  form.status = status;
  await form.save();

  const count = await HiringApplication.countDocuments({ form: form._id });
  return serializeForm(form, count);
}

export async function deleteHiringForm(id: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Hiring form not found", "NOT_FOUND");
  }
  const form = await HiringForm.findById(id).select("_id title");
  if (!form) throw new ApiError(404, "Hiring form not found", "NOT_FOUND");

  const count = await HiringApplication.countDocuments({ form: form._id });
  if (count > 0) {
    throw new ApiError(
      409,
      `"${form.title}" has ${count} application(s). Close the form instead of deleting it so recruitment records stay intact.`,
      "FORM_HAS_APPLICATIONS"
    );
  }

  await form.deleteOne();
}

/* ── Form services (public) ── */

export async function listPublishedHiringForms(): Promise<PublicHiringFormDTO[]> {
  await connectDB();
  const forms = await HiringForm.find({ status: "published" })
    .sort({ isFeatured: -1, updatedAt: -1 })
    .select("-__v")
    .lean<IHiringForm[]>();
  return forms.map(serializePublicForm);
}

export async function getPublishedHiringFormBySlug(
  slug: string
): Promise<PublicHiringFormDTO> {
  await connectDB();
  const form = await HiringForm.findOne({ slug, status: "published" })
    .select("-__v")
    .lean<IHiringForm>();
  if (!form) {
    throw new ApiError(
      404,
      "This job opening is not available right now",
      "NOT_FOUND"
    );
  }
  return serializePublicForm(form);
}

/**
 * Deterministic featured-form selection for the homepage:
 * the featured published form (most recently updated if several), else the
 * most recently published form. Never an arbitrary database row.
 */
export async function getFeaturedHiringForm(): Promise<{
  slug: string;
  title: string;
  subtitle?: string;
} | null> {
  await connectDB();
  const featured = await HiringForm.findOne({ status: "published", isFeatured: true })
    .sort({ updatedAt: -1 })
    .select("slug title subtitle")
    .lean();
  if (featured) {
    return {
      slug: featured.slug,
      title: featured.title,
      subtitle: featured.subtitle,
    };
  }

  const latest = await HiringForm.findOne({ status: "published" })
    .sort({ updatedAt: -1 })
    .select("slug title subtitle")
    .lean();
  if (!latest) return null;
  return { slug: latest.slug, title: latest.title, subtitle: latest.subtitle };
}

/* ── Application autofill (public) ── */

export interface HiringAutofillDTO {
  applicationId: string;
  jobTitle: string;
  submittedAt: string;
  answers: { fieldKey: string; label: string; type: string; value: string }[];
}

/**
 * Answers of the caller's OWN previous application, looked up by human
 * Application ID (e.g. APP-000123). Used to auto-fill a new application form.
 * Another user's application is never returned.
 */
export async function getOwnApplicationForAutofill(
  applicationId: string,
  userId: string
): Promise<HiringAutofillDTO> {
  await connectDB();
  const safe = applicationId.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const application = await HiringApplication.findOne({
    applicationId: { $regex: `^${safe}$`, $options: "i" },
    applicant: new mongoose.Types.ObjectId(userId),
  })
    .select("applicationId formSnapshot.title answers submittedAt")
    .lean<
      Pick<IHiringApplication, "applicationId" | "formSnapshot" | "answers" | "submittedAt"> & {
        _id: mongoose.Types.ObjectId;
      }
    >();
  if (!application) {
    throw new ApiError(
      404,
      "No application found with this Application ID on your account.",
      "APPLICATION_NOT_FOUND"
    );
  }
  return {
    applicationId: application.applicationId,
    jobTitle: application.formSnapshot.title,
    submittedAt: toIso(application.submittedAt),
    answers: application.answers.map((answer) => ({
      fieldKey: answer.fieldKey,
      label: answer.label,
      type: answer.type,
      value: answer.value,
    })),
  };
}

/* ── Upload staging ── */

export async function stageHiringUpload(
  file: File,
  userId: string,
  kind: HiringUploadKind
): Promise<{ id: string; fileName: string; size: number }> {
  await connectDB();

  // Opportunistic cleanup of abandoned uploads older than their purge date.
  void HiringUpload.deleteMany({
    user: new mongoose.Types.ObjectId(userId),
    application: null,
    purgeAt: { $lte: new Date() },
  }).exec();

  const uploaded = await uploadHiringDocument(file, kind);

  const record = await HiringUpload.create({
    user: new mongoose.Types.ObjectId(userId),
    kind,
    fileName: (file.name || `document.${uploaded.format}`).replace(
      /[^\w.\- ]/g,
      "-"
    ),
    mimeType: kind === "document" ? "application/pdf" : `image/${uploaded.format === "jpg" ? "jpeg" : uploaded.format}`,
    size: uploaded.size,
    cloudinaryPublicId: uploaded.cloudinaryPublicId,
    cloudinaryUrl: "", // Private asset: no permanent URL is stored.
    width: uploaded.width,
    height: uploaded.height,
    application: null,
    purgeAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return {
    id: String(record._id),
    fileName: record.fileName,
    size: record.size,
  };
}

/* ── Application services ── */

export interface HiringPaymentOrderDTO {
  orderId: string;
  /** Amount in paise — what Razorpay Checkout expects. */
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

/**
 * Creates a Razorpay order for the application fee of a published form so
 * Razorpay Checkout can open immediately after. The order is persisted as a
 * HiringPayment record ("created") that the application submission later
 * verifies — an order nobody can prove ownership of is worthless.
 */
export async function createHiringPaymentOrder(input: {
  slug: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
}): Promise<HiringPaymentOrderDTO> {
  await connectDB();

  if (!isRazorpayConfigured()) {
    throw new ApiError(
      503,
      "Online payments are not configured yet. Please contact support.",
      "PAYMENTS_NOT_CONFIGURED"
    );
  }

  const form = await HiringForm.findOne({
    slug: input.slug,
    status: "published",
  });
  if (!form) {
    throw new ApiError(
      404,
      "This job opening is not accepting applications right now",
      "NOT_FOUND"
    );
  }

  const price = form.price ?? 0;
  if (price <= 0) {
    throw new ApiError(
      400,
      `"${form.title}" does not require any payment`,
      "PAYMENT_NOT_REQUIRED"
    );
  }

  const existing = await HiringApplication.findOne({
    form: form._id,
    applicant: new mongoose.Types.ObjectId(input.userId),
  }).select("_id applicationId");
  if (existing) {
    throw new ApiError(
      409,
      `You have already applied for this position (Application ID: ${existing.applicationId}).`,
      "DUPLICATE_APPLICATION"
    );
  }

  const amountInPaise = Math.round(price * 100);
  const receipt = `hw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const order = await createRazorpayOrder({
    amountInPaise,
    receipt,
    notes: {
      purpose: "hiring_application",
      formId: String(form._id),
      userId: input.userId,
    },
  });

  await HiringPayment.create({
    razorpayOrderId: order.id,
    form: form._id,
    formTitle: form.title,
    formSlug: form.slug,
    user: new mongoose.Types.ObjectId(input.userId),
    amount: order.amount,
    currency: order.currency,
    status: "created",
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: getRazorpayKeyId(),
    formTitle: form.title,
    feeLabel: formatHiringPrice(price),
    prefill: {
      name: input.userName,
      email: input.userEmail,
      contact: input.userPhone,
    },
  };
}

export async function createHiringApplication(input: {
  slug: string;
  values: Record<string, unknown>;
  uploads: Record<string, string>;
  payment?: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  };
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
}): Promise<{
  applicationId: string;
  jobTitle: string;
  submittedAt: string;
}> {
  await connectDB();

  const form = await HiringForm.findOne({
    slug: input.slug,
    status: "published",
  });
  if (!form) {
    throw new ApiError(
      404,
      "This job opening is not accepting applications right now",
      "NOT_FOUND"
    );
  }

  const existing = await HiringApplication.findOne({
    form: form._id,
    applicant: new mongoose.Types.ObjectId(input.userId),
  }).select("_id applicationId");
  if (existing) {
    throw new ApiError(
      409,
      `You have already applied for this position (Application ID: ${existing.applicationId}).`,
      "DUPLICATE_APPLICATION"
    );
  }

  /* ── Paid form gate: verify the Razorpay payment before anything else. ── */
  const fee = form.price ?? 0;
  let paymentRecord: IHiringPayment | null = null;
  if (fee > 0) {
    if (!input.payment) {
      throw new ApiError(
        402,
        `"${form.title}" has an application fee of ${formatHiringPrice(fee)}. Pay the fee to submit your application.`,
        "PAYMENT_REQUIRED"
      );
    }

    if (
      !verifyRazorpayPaymentSignature(
        input.payment.razorpayOrderId,
        input.payment.razorpayPaymentId,
        input.payment.razorpaySignature
      )
    ) {
      throw new ApiError(
        400,
        "Payment verification failed. If you were charged, contact support before paying again.",
        "PAYMENT_VERIFICATION_FAILED"
      );
    }

    paymentRecord = await HiringPayment.findOne({
      razorpayOrderId: input.payment.razorpayOrderId,
    });
    if (!paymentRecord) {
      throw new ApiError(
        400,
        "This payment order is not recognised. Please start a new payment.",
        "PAYMENT_NOT_FOUND"
      );
    }
    if (
      String(paymentRecord.user) !== input.userId ||
      String(paymentRecord.form) !== String(form._id)
    ) {
      throw new ApiError(
        400,
        "This payment does not belong to this application. Please start a new payment.",
        "PAYMENT_MISMATCH"
      );
    }
    if (
      paymentRecord.status === "paid" &&
      paymentRecord.application &&
      mongoose.Types.ObjectId.isValid(String(paymentRecord.application))
    ) {
      throw new ApiError(
        409,
        "This payment has already been used for an application. If you were charged twice, contact support.",
        "PAYMENT_ALREADY_USED"
      );
    }
    if (paymentRecord.amount !== Math.round(fee * 100)) {
      throw new ApiError(
        400,
        "The paid amount does not match the current application fee. Please start a new payment.",
        "PAYMENT_AMOUNT_MISMATCH"
      );
    }
  }

  const fields = form.fields as unknown as HiringFieldConfig[];

  // Resolve + verify staged uploads owned by this user.
  const uploadRecords = new Map<string, (typeof HiringUpload.prototype)>();
  const uploadsByField: Record<string, { id: string }> = {};

  for (const [fieldKey, uploadId] of Object.entries(input.uploads ?? {})) {
    const field = fields.find((entry) => entry.key === fieldKey);
    if (!field || !isUploadFieldType(field.type)) {
      throw new ApiError(
        400,
        `Unexpected upload for field "${fieldKey}"`,
        "INVALID_UPLOAD"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(uploadId)) {
      throw new ApiError(400, `Invalid upload reference for "${field.label}"`, "INVALID_UPLOAD");
    }

    const record = await HiringUpload.findOne({
      _id: uploadId,
      user: new mongoose.Types.ObjectId(input.userId),
      application: null,
    });
    if (!record) {
      throw new ApiError(
        400,
        `Uploaded file for "${field.label}" was not found. Please upload it again.`,
        "INVALID_UPLOAD"
      );
    }

    const expectedKind = UPLOAD_KIND_BY_FIELD_TYPE[field.type];
    if (record.kind !== expectedKind) {
      throw new ApiError(
        400,
        `Uploaded file for "${field.label}" has the wrong document type`,
        "INVALID_UPLOAD"
      );
    }

    uploadRecords.set(fieldKey, record);
    uploadsByField[fieldKey] = { id: String(record._id) };
  }

  const errors = validateApplicationValues(fields, input.values, uploadsByField);
  const errorMessages = Object.values(errors);
  if (errorMessages.length > 0) {
    throw new ApiError(400, errorMessages[0], "VALIDATION_FAILED", errorMessages);
  }

  // Identity for the list views: prefer the configured default fields.
  const answers = fields
    .filter((field) => !isUploadFieldType(field.type))
    .map((field) => ({
      fieldKey: field.key,
      label: field.label,
      type: field.type,
      value: normalizeFieldValue(field, input.values[field.key]),
    }));

  const nameField =
    fields.find((f) => f.key === "full_name" && !isUploadFieldType(f.type)) ??
    fields.find((f) => f.type === "short_text" && !isUploadFieldType(f.type));
  const phoneField =
    fields.find((f) => f.key === "contact_number") ??
    fields.find((f) => f.type === "phone");
  const emailField = fields.find((f) => f.type === "email");

  const applicantName =
    (nameField ? answers.find((a) => a.fieldKey === nameField.key)?.value : "") ||
    input.userName;
  const applicantPhone =
    (phoneField ? answers.find((a) => a.fieldKey === phoneField.key)?.value : "") ||
    input.userPhone ||
    "";
  const applicantEmail =
    (emailField ? answers.find((a) => a.fieldKey === emailField.key)?.value : "") ||
    input.userEmail ||
    undefined;

  const applicationId = await generateApplicationId();
  const now = new Date();

  let application: IHiringApplication;
  try {
    application = await HiringApplication.create({
      applicationId,
      form: form._id,
      formSnapshot: {
        title: form.title,
        slug: form.slug,
        subtitle: form.subtitle,
        description: form.description,
        instructions: form.instructions,
        fields: fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
        })),
      },
      applicant: new mongoose.Types.ObjectId(input.userId),
      applicantName: applicantName || "Applicant",
      applicantEmail,
      applicantPhone: applicantPhone || undefined,
      answers,
      uploads: fields
        .filter((field) => isUploadFieldType(field.type))
        .filter((field) => uploadRecords.has(field.key))
        .map((field) => {
          const record = uploadRecords.get(field.key)!;
          return {
            fieldKey: field.key,
            label: field.label,
            uploadId: record._id,
            fileName: record.fileName,
            mimeType: record.mimeType,
            size: record.size,
            kind: record.kind,
          };
        }),
      status: "submitted",
      submittedAt: now,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      throw new ApiError(
        409,
        "You have already applied for this position.",
        "DUPLICATE_APPLICATION"
      );
    }
    throw error;
  }

  // Attach staged uploads so they are no longer purge-eligible.
  await HiringUpload.updateMany(
    { _id: { $in: [...uploadRecords.values()].map((record) => record._id) } },
    { $set: { application: application._id }, $unset: { purgeAt: 1 } }
  );

  // Bind the verified payment to the application so admins can always see
  // who paid, for how much, with which Razorpay ids.
  if (paymentRecord && input.payment) {
    try {
      await HiringPayment.updateOne(
        { _id: paymentRecord._id, application: { $in: [null, undefined] } },
        {
          $set: {
            status: "paid",
            razorpayPaymentId: input.payment.razorpayPaymentId,
            razorpaySignature: input.payment.razorpaySignature,
            application: application._id,
            paidAt: now,
          },
          $unset: { failureReason: 1 },
        }
      );
    } catch {
      // The application itself is the source of truth; a failed payment
      // linkage keeps the payment record "paid" but unattached, which the
      // duplicate-payment guard treats as safely retryable.
    }
  }

  return {
    applicationId: application.applicationId,
    jobTitle: form.title,
    submittedAt: toIso(now),
  };
}

export async function listHiringApplications(params: {
  page: number;
  limit: number;
  formId?: string;
  search?: string;
}): Promise<{
  items: HiringApplicationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (params.formId && mongoose.Types.ObjectId.isValid(params.formId)) {
    filter.form = new mongoose.Types.ObjectId(params.formId);
  }
  if (params.search) {
    const safe = params.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { applicationId: new RegExp(safe, "i") },
      { applicantName: new RegExp(safe, "i") },
      { applicantEmail: new RegExp(safe, "i") },
      { applicantPhone: new RegExp(safe, "i") },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const [applications, total] = await Promise.all([
    HiringApplication.find(filter)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .select(
        "applicationId form formSnapshot.title applicantName applicantEmail applicantPhone status submittedAt answers uploads"
      )
      .lean(),
    HiringApplication.countDocuments(filter),
  ]);

  const items: HiringApplicationListItem[] = applications.map((app) => ({
    id: String(app._id),
    applicationId: app.applicationId,
    formId: String(app.form),
    jobTitle: app.formSnapshot.title,
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    applicantPhone: app.applicantPhone,
    status: app.status,
    submittedAt: toIso(app.submittedAt),
    answerCount: app.answers?.length ?? 0,
    uploadCount: app.uploads?.length ?? 0,
  }));

  // Fee status for the page's applications — free forms have no payment row.
  const applicationIds = applications.map((app) => app._id);
  const payments = await HiringPayment.find({
    application: { $in: applicationIds },
  })
    .select("application status amount currency paidAt")
    .lean<Pick<IHiringPayment, "application" | "status" | "amount" | "currency" | "paidAt">[]>();
  const paymentsByApplication = new Map(
    payments.map((payment) => [String(payment.application), payment])
  );
  for (const item of items) {
    const payment = paymentsByApplication.get(item.id);
    if (!payment) continue;
    item.payment = {
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      paidAt: payment.paidAt ? toIso(payment.paidAt) : undefined,
    };
  }

  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit)),
    },
  };
}

function serializeDetail(
  app: IHiringApplication,
  payment?: Pick<IHiringPayment, "razorpayOrderId" | "razorpayPaymentId" | "status" | "amount" | "currency" | "paidAt"> | null
): HiringApplicationDetailDTO {
  return {
    id: String(app._id),
    applicationId: app.applicationId,
    formId: String(app.form),
    jobTitle: app.formSnapshot.title,
    jobSlug: app.formSnapshot.slug,
    applicantUserId: String(app.applicant),
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    applicantPhone: app.applicantPhone,
    status: app.status,
    submittedAt: toIso(app.submittedAt),
    answers: app.answers ?? [],
    uploads: (app.uploads ?? []).map((upload) => ({
      fieldKey: upload.fieldKey,
      label: upload.label,
      kind: upload.kind,
      fileName: upload.fileName,
      mimeType: upload.mimeType,
      size: upload.size,
    })),
    payment: payment
      ? {
          orderId: payment.razorpayOrderId,
          paymentId: payment.razorpayPaymentId,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paidAt ? toIso(payment.paidAt) : undefined,
        }
      : undefined,
    formSnapshot: {
      title: app.formSnapshot.title,
      slug: app.formSnapshot.slug,
      subtitle: app.formSnapshot.subtitle,
      description: app.formSnapshot.description,
      instructions: app.formSnapshot.instructions,
      fields: (app.formSnapshot.fields ?? []) as {
        key: string;
        label: string;
        type: string;
        required: boolean;
      }[],
    },
  };
}

export async function getHiringApplicationDetail(
  id: string
): Promise<HiringApplicationDetailDTO> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findById(id).select("-__v");
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");

  const payment = await HiringPayment.findOne({
    application: app._id,
  }).select(
    "razorpayOrderId razorpayPaymentId status amount currency paidAt"
  );
  return serializeDetail(app, payment);
}

export async function getOwnHiringApplication(
  id: string,
  userId: string
): Promise<HiringApplicationDetailDTO> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findOne({
    _id: id,
    applicant: new mongoose.Types.ObjectId(userId),
  }).select("-__v");
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");

  const payment = await HiringPayment.findOne({
    application: app._id,
    user: new mongoose.Types.ObjectId(userId),
  }).select(
    "razorpayOrderId razorpayPaymentId status amount currency paidAt"
  );
  return serializeDetail(app, payment);
}

export interface OwnHiringApplicationListItem {
  id: string;
  applicationId: string;
  jobTitle: string;
  jobSlug: string;
  status: string;
  submittedAt: string;
  /** Fee payment info when this application carried a fee. */
  payment?: {
    status: string;
    amount: number;
    currency: string;
  };
}

/** All applications the logged-in customer has submitted, newest first. */
export async function listOwnHiringApplications(
  userId: string
): Promise<OwnHiringApplicationListItem[]> {
  await connectDB();
  const apps = await HiringApplication.find({
    applicant: new mongoose.Types.ObjectId(userId),
  })
    .sort({ submittedAt: -1 })
    .select("applicationId formSnapshot.title formSnapshot.slug status submittedAt")
    .lean();
  const items: OwnHiringApplicationListItem[] = apps.map((app) => ({
    id: String(app._id),
    applicationId: app.applicationId,
    jobTitle: app.formSnapshot.title,
    jobSlug: app.formSnapshot.slug,
    status: app.status,
    submittedAt: toIso(app.submittedAt),
  }));

  const payments = await HiringPayment.find({
    user: new mongoose.Types.ObjectId(userId),
    application: { $in: apps.map((app) => app._id) },
  })
    .select("application status amount")
    .lean<Pick<IHiringPayment, "application" | "status" | "amount">[]>();
  const paymentsByApplication = new Map(
    payments.map((payment) => [String(payment.application), payment])
  );
  for (const item of items) {
    const payment = paymentsByApplication.get(item.id);
    if (!payment) continue;
    item.payment = {
      status: payment.status,
      amount: payment.amount,
      currency: "INR",
    };
  }
  return items;
}

export async function updateHiringApplicationStatus(
  id: string,
  status: IHiringApplication["status"]
): Promise<{ applicationId: string; status: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  ).select("applicationId status");
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");
  return { applicationId: app.applicationId, status: app.status };
}

export async function deleteHiringApplication(id: string): Promise<void> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findById(id);
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");

  // Storage cleanup is best-effort: DB deletion is the source of truth.
  const uploads = await HiringUpload.find({ application: app._id }).select(
    "cloudinaryPublicId kind mimeType"
  );
  for (const upload of uploads) {
    const resourceType = upload.mimeType === "application/pdf" ? "raw" : "image";
    void destroyHiringAsset(upload.cloudinaryPublicId, resourceType).catch(
      () => false
    );
  }
  await HiringUpload.deleteMany({ application: app._id });
  await app.deleteOne();
}

/* ── Documents & PDF ── */

export interface ResolvedApplicationDocument {
  uploadId: string;
  cloudinaryPublicId: string;
  resourceType: "image" | "raw";
  format: string;
  fileName: string;
  mimeType: string;
}

async function resolveApplicationDocument(
  applicationId: string,
  fieldKey: string
): Promise<ResolvedApplicationDocument> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findById(applicationId).select(
    "applicationId uploads"
  );
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");

  const reference = (app.uploads ?? []).find(
    (upload: IHiringApplicationUpload) => upload.fieldKey === fieldKey
  );
  if (!reference) {
    throw new ApiError(404, "Document not found for this application", "NOT_FOUND");
  }

  const record = await HiringUpload.findById(reference.uploadId);
  if (!record) {
    throw new ApiError(
      404,
      "The uploaded document is no longer available",
      "NOT_FOUND"
    );
  }

  const resourceType: "image" | "raw" =
    record.mimeType === "application/pdf" ? "raw" : "image";
  const format =
    record.mimeType === "image/jpeg"
      ? "jpg"
      : record.mimeType === "image/png"
        ? "png"
        : record.mimeType === "image/webp"
          ? "webp"
          : "pdf";

  return {
    uploadId: String(record._id),
    cloudinaryPublicId: record.cloudinaryPublicId,
    resourceType,
    format,
    fileName: record.fileName,
    mimeType: record.mimeType,
  };
}

export async function getApplicationDocumentDeliveryUrl(
  applicationId: string,
  fieldKey: string
): Promise<{ url: string; fileName: string; mimeType: string }> {
  const document = await resolveApplicationDocument(applicationId, fieldKey);
  const url = createHiringDeliveryUrl({
    publicId: document.cloudinaryPublicId,
    resourceType: document.resourceType,
    format: document.format,
    expiresInSeconds: 600,
  });
  return { url, fileName: document.fileName, mimeType: document.mimeType };
}

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  rejected: "Rejected",
  hired: "Hired",
};

export async function buildApplicationPdf(
  applicationId: string,
  options?: { documentUrlPrefix?: string }
): Promise<{ buffer: Buffer; fileName: string }> {
  await connectDB();
  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ApiError(404, "Application not found", "NOT_FOUND");
  }
  const app = await HiringApplication.findById(applicationId);
  if (!app) throw new ApiError(404, "Application not found", "NOT_FOUND");

  // Embed image uploads (photo, signature) when available. WebP and other
  // non-PDF-kit formats are converted to JPG via Cloudinary's format
  // directive; a failed fetch falls back to a download link below.
  const images: { label: string; bytes: Buffer; kind: "jpg" | "png" }[] = [];
  const embeddedKeys = new Set<string>();
  for (const upload of app.uploads ?? []) {
    if (upload.kind !== "photo" && upload.kind !== "signature") continue;
    try {
      const document = await resolveApplicationDocument(
        String(app._id),
        upload.fieldKey
      );
      const targetFormat: "jpg" | "png" =
        document.format === "png" ? "png" : "jpg";
      const url = createHiringDeliveryUrl({
        publicId: document.cloudinaryPublicId,
        resourceType: document.resourceType,
        format: targetFormat,
        expiresInSeconds: 120,
      });
      const response = await fetch(url);
      if (!response.ok) continue;
      const bytes = Buffer.from(await response.arrayBuffer());
      images.push({ label: upload.label, bytes, kind: targetFormat });
      embeddedKeys.add(upload.fieldKey);
    } catch {
      // Falls back to a clickable link in the documents list.
    }
  }

  const buffer = await buildApplicationSummaryPdf({
    applicationId: app.applicationId,
    jobTitle: app.formSnapshot.title,
    submittedAtLabel: new Date(app.submittedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }),
    statusLabel: STATUS_LABELS[app.status] ?? app.status,
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    applicantPhone: app.applicantPhone,
    answers: (app.answers ?? []).map((answer: IHiringAnswer) => ({
      label: answer.label,
      value: answer.value,
    })),
    images,
    documents: (app.uploads ?? [])
      .filter((upload: IHiringApplicationUpload) => !embeddedKeys.has(upload.fieldKey))
      .map((upload: IHiringApplicationUpload) => ({
        label: upload.label,
        fileName: upload.fileName,
        url: options?.documentUrlPrefix
          ? `${options.documentUrlPrefix}/documents/${upload.fieldKey}`
          : undefined,
        note: options?.documentUrlPrefix
          ? "Requires login to this site — the link opens the document."
          : "Stored securely — open the application to view or download.",
      })),
  });

  return {
    buffer,
    fileName: `Scrapi-Application-${app.applicationId}.pdf`,
  };
}

const hiringService = {
  listAdminHiringForms,
  getAdminHiringForm,
  createHiringForm,
  updateHiringForm,
  setHiringFormStatus,
  deleteHiringForm,
  listPublishedHiringForms,
  getPublishedHiringFormBySlug,
  getFeaturedHiringForm,
  stageHiringUpload,
  createHiringPaymentOrder,
  createHiringApplication,
  listHiringApplications,
  getHiringApplicationDetail,
  getOwnHiringApplication,
  listOwnHiringApplications,
  getOwnApplicationForAutofill,
  updateHiringApplicationStatus,
  deleteHiringApplication,
  getApplicationDocumentDeliveryUrl,
  buildApplicationPdf,
};

export default hiringService;

/* Re-export for convenience in API routes. */
export { defaultHiringFields };
