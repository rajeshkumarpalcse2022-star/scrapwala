import { z } from "zod"

export const createTimeSlotSchema = z.object({
  label: z.string().min(1).max(50),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1).default(20),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0)
})

export const updateTimeSlotSchema = createTimeSlotSchema.partial()

/** IST calendar day key, e.g. "2026-10-12". */
export const istDateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected format YYYY-MM-DD")

export const upsertTimeSlotOverrideSchema = z.object({
  timeSlotId: z.string().min(1),
  date: istDateKeySchema,
  capacity: z.number().int().min(1),
  notes: z.string().max(200).optional()
})

export type CreateTimeSlotInput = z.infer<typeof createTimeSlotSchema>
export type UpdateTimeSlotInput = z.infer<typeof updateTimeSlotSchema>
export type UpsertTimeSlotOverrideInput = z.infer<typeof upsertTimeSlotOverrideSchema>
