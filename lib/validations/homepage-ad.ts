import { z } from "zod";

const adImageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(
      (value) => /^https:\/\/\S+$/i.test(value),
      "Image must be a secure https URL"
    ),
  publicId: z.string().trim().max(300).optional(),
  alt: z.string().trim().max(300).default(""),
});

const optionalFutureishDate = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine(
    (value) =>
      value === null ||
      value === undefined ||
      value === "" ||
      !Number.isNaN(Date.parse(value)),
    "Please provide a valid date"
  );

export const createHomepageAdSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    image: adImageSchema,
    linkUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => value === "" || /^https:\/\/\S+$/i.test(value),
        "Link must be a secure https URL"
      )
      .nullish()
      .transform((value) => value || null),
    isActive: z.boolean().default(false),
    startsAt: optionalFutureishDate,
    endsAt: optionalFutureishDate,
  })
  .refine(
    (value) => {
      if (!value.startsAt || !value.endsAt) return true;
      return Date.parse(value.endsAt) > Date.parse(value.startsAt);
    },
    { message: "End time must be after start time", path: ["endsAt"] }
  );

export const updateHomepageAdSchema = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    image: adImageSchema.optional(),
    linkUrl: z
      .string()
      .trim()
      .max(2048)
      .refine(
        (value) => value === "" || /^https:\/\/\S+$/i.test(value),
        "Link must be a secure https URL"
      )
      .nullish()
      .transform((value) => (value === "" ? null : value)),
    isActive: z.boolean().optional(),
    startsAt: optionalFutureishDate,
    endsAt: optionalFutureishDate,
  })
  .refine(
    (value) => {
      if (!value.startsAt || !value.endsAt) return true;
      return Date.parse(value.endsAt) > Date.parse(value.startsAt);
    },
    { message: "End time must be after start time", path: ["endsAt"] }
  );

export type CreateHomepageAdInput = z.infer<typeof createHomepageAdSchema>;
export type UpdateHomepageAdInput = z.infer<typeof updateHomepageAdSchema>;
