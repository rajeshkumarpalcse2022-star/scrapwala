import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid category id");

export const createRateSchema = z
  .object({
    category: objectId,
    minRate: z.number().min(0).max(10_000_000),
    maxRate: z.number().min(0).max(10_000_000),
    unit: z.enum(["kg", "piece", "unit"]),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.maxRate < data.minRate) {
      ctx.addIssue({
        code: "custom",
        path: ["maxRate"],
        message: "Maximum rate must be greater than or equal to minimum rate",
      });
    }
  });

export const updateRateSchema = z
  .object({
    category: objectId,
    minRate: z.number().min(0).max(10_000_000),
    maxRate: z.number().min(0).max(10_000_000),
    unit: z.enum(["kg", "piece", "unit"]),
    isActive: z.boolean(),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (
      data.minRate !== undefined &&
      data.maxRate !== undefined &&
      data.maxRate < data.minRate
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maxRate"],
        message:
          "Maximum rate must be greater than or equal to minimum rate",
      });
    }
  });

export type CreateRateInput = z.infer<typeof createRateSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;
