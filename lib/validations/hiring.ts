import { z } from "zod";
import {
  HIRING_FIELD_TYPES,
  UPLOAD_KIND_LIMITS,
  isUploadFieldType,
} from "@/lib/utils/hiring-fields";

const fieldKeySchema = z
  .string()
  .trim()
  .min(3, "Field key must be at least 3 characters")
  .max(60, "Field key must be 60 characters or fewer")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Field key must be lowercase letters, numbers and underscores, starting with a letter"
  );

const optionSchema = z.object({
  label: z.string().trim().min(1).max(120),
  value: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/i, "Option value may only contain letters, numbers, - or _"),
});

export const hiringFieldSchema = z
  .object({
    key: fieldKeySchema,
    label: z.string().trim().min(1, "Field label is required").max(120),
    type: z.enum(HIRING_FIELD_TYPES),
    placeholder: z.string().trim().max(160).optional(),
    helpText: z.string().trim().max(300).optional(),
    required: z.boolean(),
    options: z.array(optionSchema).max(60).optional(),
    min: z.number().min(0).max(200).optional(),
    max: z.number().min(0).max(200).optional(),
    maxLength: z.number().int().min(10).max(4000).optional(),
  })
  .superRefine((field, ctx) => {
    if ((field.type === "select" || field.type === "radio" || field.type === "checkbox") && (!field.options || field.options.length < 1)) {
      ctx.addIssue({
        code: "custom",
        message: `${field.label || "Dropdown/radio/checkbox"} fields need at least one option`,
        path: ["options"],
      });
    }

    if (field.options && field.options.length > 0) {
      const seen = new Set<string>();
      for (const option of field.options) {
        if (seen.has(option.value)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate option value "${option.value}"`,
            path: ["options"],
          });
          break;
        }
        seen.add(option.value);
      }
    }

    if (field.type === "number" && field.min !== undefined && field.max !== undefined && field.min > field.max) {
      ctx.addIssue({
        code: "custom",
        message: "Minimum cannot be greater than maximum",
        path: ["min"],
      });
    }

    // Admins may tighten, but never exceed, the system upload limits.
    if (isUploadFieldType(field.type)) {
      const limit = UPLOAD_KIND_LIMITS[field.type as keyof typeof UPLOAD_KIND_LIMITS];
      if (limit && field.maxLength !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: `Upload fields do not accept a maxLength override`,
          path: ["maxLength"],
        });
      }
    }
  });

export const hiringFormStatusSchema = z.enum(["draft", "published", "closed"]);

/**
 * Application fee in rupees. 0 = free form; anything above 0 is charged via
 * Razorpay before an application can be submitted.
 */
export const hiringFormPriceSchema = z
  .number()
  .min(0, "Application fee cannot be negative")
  .max(1_000_000, "Application fee is too high");

export const createHiringFormSchema = z.object({
  title: z.string().trim().min(3, "Job title must be at least 3 characters").max(140),
  subtitle: z.string().trim().max(180).optional(),
  description: z.string().trim().min(10, "Please write a hiring description").max(8000),
  instructions: z.string().trim().max(4000).optional(),
  price: hiringFormPriceSchema.default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  isFeatured: z.boolean().default(false),
  fields: z
    .array(hiringFieldSchema)
    .min(1, "A form needs at least one field")
    .max(40, "A form can have at most 40 fields"),
});

export const updateHiringFormSchema = createHiringFormSchema.extend({
  // Updates may also keep/restore a closed form; creation stays draft/published.
  status: z.enum(["draft", "published", "closed"]).default("draft"),
});

export const listHiringApplicationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  formId: z.string().trim().optional(),
  search: z.string().trim().max(120).optional(),
});

export const submitHiringApplicationSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  values: z.record(z.string(), z.unknown()).default({}),
  /** Map of fieldKey -> staged upload id from POST /api/hiring/uploads. */
  uploads: z.record(z.string(), z.string().trim().min(1)).default({}),
  /**
   * Required when the form carries an application fee: the successful
   * Razorpay Checkout callback that the server re-verifies.
   */
  payment: z
    .object({
      razorpayOrderId: z.string().trim().min(6).max(120),
      razorpayPaymentId: z.string().trim().min(6).max(120),
      razorpaySignature: z.string().trim().min(8).max(256),
    })
    .optional(),
});

export const hiringPaymentOrderSchema = z.object({
  slug: z.string().trim().min(1).max(120),
});

export const updateHiringApplicationStatusSchema = z.object({
  status: z.enum(["submitted", "under_review", "shortlisted", "rejected", "hired"]),
});

export type CreateHiringFormInput = z.infer<typeof createHiringFormSchema>;
export type UpdateHiringFormInput = z.infer<typeof updateHiringFormSchema>;
export type ListHiringApplicationsInput = z.infer<typeof listHiringApplicationsSchema>;
export type SubmitHiringApplicationInput = z.infer<typeof submitHiringApplicationSchema>;
export type HiringFormStatus = z.infer<typeof hiringFormStatusSchema>;
export type HiringPaymentOrderInput = z.infer<typeof hiringPaymentOrderSchema>;
