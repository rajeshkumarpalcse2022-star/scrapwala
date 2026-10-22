import { z } from "zod";

/* ── Shared ────────────────────────────────────────────────────────────── */

const imageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => /^https:\/\/\S+$/i.test(value),
    "Image must be a secure https URL"
  );

export const blogImageMetaSchema = z.object({
  url: imageUrlSchema,
  publicId: z.string().trim().max(300).optional(),
  alt: z.string().trim().max(300).default(""),
});

const headingText = z.string().trim().min(1).max(300);
const longText = z.string().max(6000);
const listItem = z.string().trim().min(1).max(1000);

export const blogBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    text: headingText,
  }),
  z.object({
    type: z.literal("paragraph"),
    text: longText,
  }),
  z.object({
    type: z.literal("bulletList"),
    items: z.array(listItem).min(1).max(100),
  }),
  z.object({
    type: z.literal("orderedList"),
    items: z.array(listItem).min(1).max(100),
  }),
  z.object({
    type: z.literal("blockquote"),
    text: z.string().trim().min(1).max(3000),
  }),
  z.object({
    type: z.literal("image"),
    url: imageUrlSchema,
    publicId: z.string().trim().max(300).optional(),
    alt: z.string().trim().max(300).default(""),
    caption: z.string().trim().max(300).optional(),
  }),
]);

export const blogContentSchema = z
  .array(blogBlockSchema)
  .min(1, "The article needs at least one content block")
  .max(500, "A post can contain at most 500 content blocks");

export const blogStatusSchema = z.enum([
  "draft",
  "scheduled",
  "published",
  "archived",
]);

const futureDateValue = (value: string): boolean => {
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
};

/* ── Posts ─────────────────────────────────────────────────────────────── */

const postBaseSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers and hyphens")
    .optional(),
  excerpt: z.string().trim().min(10).max(600),
  subtitle: z.string().trim().max(300).optional().or(z.literal("")),
  content: blogContentSchema,
  category: z.string().trim().min(1, "Please choose a category"),
  authorName: z.string().trim().min(1).max(120),
  coverImage: blogImageMetaSchema.nullish(),
  socialImage: blogImageMetaSchema.nullish(),
  status: blogStatusSchema.optional(),
  scheduledAt: z
    .string()
    .trim()
    .nullable()
    .optional()
    .refine(
      (value) =>
        value === null || value === undefined || value === "" || futureDateValue(value),
      "Schedule time must be a valid date"
    ),
  isFeatured: z.boolean().optional(),
  seoMetaTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoMetaDescription: z.string().trim().max(180).optional().or(z.literal("")),
});

export const createBlogSchema = postBaseSchema;

export const updateBlogSchema = postBaseSchema.partial();

export const blogStatusActionSchema = z.object({
  status: blogStatusSchema,
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => value === undefined || futureDateValue(value),
      "Schedule time must be a valid date"
    ),
});

export const blogFeatureSchema = z.object({
  isFeatured: z.boolean(),
});

/* ── Categories ────────────────────────────────────────────────────────── */

export const createBlogCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must use lowercase letters, numbers and hyphens"
    )
    .optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const updateBlogCategorySchema = createBlogCategorySchema.partial();

/* ── Public query ──────────────────────────────────────────────────────── */

export const publicBlogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(9),
  category: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  q: z.string().trim().max(120).optional(),
});

export const adminBlogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(120).optional(),
  status: z.string().trim().max(30).optional(),
});

export type BlogStatus = z.infer<typeof blogStatusSchema>;
export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogStatusActionInput = z.infer<typeof blogStatusActionSchema>;
export type CreateBlogCategoryInput = z.infer<typeof createBlogCategorySchema>;
export type UpdateBlogCategoryInput = z.infer<typeof updateBlogCategorySchema>;
export type PublicBlogQueryInput = z.infer<typeof publicBlogQuerySchema>;
export type AdminBlogQueryInput = z.infer<typeof adminBlogQuerySchema>;
export type BlogBlockInput = z.infer<typeof blogBlockSchema>;
