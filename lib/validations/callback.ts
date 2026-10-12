import { z } from "zod";

export const CALLBACK_REASONS = [
  "schedule_pickup",
  "check_pickup_status",
  "enquire_rates",
  "bulk_pickup_query",
  "something_else",
] as const;

export type CallbackReason = (typeof CALLBACK_REASONS)[number];

export const CALLBACK_STATUSES = ["new", "contacted", "resolved"] as const;

export type CallbackStatus = (typeof CALLBACK_STATUSES)[number];

export const CALLBACK_REASON_LABELS: Record<CallbackReason, string> = {
  schedule_pickup: "Schedule Pickup",
  check_pickup_status: "Check Pickup Status",
  enquire_rates: "Enquire Rates",
  bulk_pickup_query: "Bulk Pickup Query",
  something_else: "Something else",
};

export const CALLBACK_STATUS_LABELS: Record<CallbackStatus, string> = {
  new: "New",
  contacted: "Contacted",
  resolved: "Resolved",
};

export const createCallbackRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name")
      .max(100, "Name is too long"),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number."),
    reasonType: z.enum(CALLBACK_REASONS),
    customReason: z.string().trim().max(500, "Reason is too long").optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    address: z.string().trim().max(300, "Address is too long").nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reasonType === "something_else") {
      if (!data.customReason || data.customReason.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customReason"],
          message: "Please tell us your reason",
        });
      }
    }
  });

export type CreateCallbackRequestInput = z.infer<
  typeof createCallbackRequestSchema
>;

export const listCallbackRequestsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(CALLBACK_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

export type ListCallbackRequestsInput = z.infer<
  typeof listCallbackRequestsSchema
>;

export const updateCallbackRequestSchema = z.object({
  status: z.enum(CALLBACK_STATUSES),
});

export type UpdateCallbackRequestInput = z.infer<
  typeof updateCallbackRequestSchema
>;
