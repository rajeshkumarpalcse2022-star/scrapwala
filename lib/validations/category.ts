import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createSubcategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(500),
  imageUrl: z.string().trim().min(1, "Subcategory image is required"),
  cloudinaryPublicId: z
    .string()
    .trim()
    .min(1, "Subcategory image reference is required"),
  isActive: z.boolean().default(true),
});

export const updateSubcategorySchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(1).max(500),
    imageUrl: z.string().trim().min(1),
    cloudinaryPublicId: z.string().trim().min(1),
    isActive: z.boolean(),
  })
  .partial();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;
export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;
