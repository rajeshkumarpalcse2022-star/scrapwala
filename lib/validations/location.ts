import { z } from "zod"

export const createLocationSchema = z.object({
  name: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCodes: z.array(z.string().regex(/^\d{6}$/)).min(1),
  isActive: z.boolean().default(true),
  serviceRadius: z.number().min(0).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional()
})

export const updateLocationSchema = createLocationSchema.partial()

export type CreateLocationInput = z.infer<typeof createLocationSchema>
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>
