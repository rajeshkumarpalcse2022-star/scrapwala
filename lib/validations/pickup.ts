import { z } from "zod"
import { WEIGHT_RANGES } from "@/lib/constants/pickup"

export const pickupAddressSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  houseFlatBuilding: z.string().min(1),
  streetArea: z.string().min(1),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pinCode: z.string().regex(/^\d{6}$/),
  addressType: z.enum(["home", "office", "other"]).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

export const pickupItemSchema = z.object({
  category: z.string(),
  categoryName: z.string().min(1),
  rate: z.number().min(0),
  unit: z.enum(["kg", "piece", "unit"]),
  estimatedWeight: z.number().min(0),
  actualWeight: z.number().min(0).optional(),
  amount: z.number().min(0)
})

export const createPickupSchema = z.object({
  vehicle: z.enum(["small", "large"]),
  address: pickupAddressSchema,
  scheduledDate: z.string().datetime().or(z.date()),
  timeSlot: z.object({ startTime: z.string(), endTime: z.string() }),
  items: z.array(pickupItemSchema).min(1),
  expectedWeight: z
    .string()
    .min(1)
    .refine((v) => WEIGHT_RANGES.some((r) => r.label === v), {
      message: "Invalid weight range"
    }),
  estimatedAmount: z.number().min(0),
  notes: z.string().optional()
})

export const updatePickupStatusSchema = z.object({
  status: z.enum([
    "scheduled",
    "assigned",
    "accepted",
    "on_the_way",
    "arrived",
    "weighing",
    "payment_pending",
    "completed",
    "cancelled"
  ])
})

export const assignCollectorSchema = z.object({ collectorId: z.string().min(1) })

export const updatePickupWeighingSchema = z.object({
  items: z.array(
    z.object({
      category: z.string().min(1),
      categoryName: z.string().min(1),
      actualWeight: z.number().min(0).finite(),
      rate: z.number().min(0).finite(),
      unit: z.enum(["kg", "piece", "unit"]),
    })
  ).min(1),
})

export type PickupAddressInput = z.infer<typeof pickupAddressSchema>
export type PickupItemInput = z.infer<typeof pickupItemSchema>
export type CreatePickupInput = z.infer<typeof createPickupSchema>
export type UpdatePickupStatusInput = z.infer<typeof updatePickupStatusSchema>
export type AssignCollectorInput = z.infer<typeof assignCollectorSchema>
export type UpdatePickupWeighingInput = z.infer<typeof updatePickupWeighingSchema>
