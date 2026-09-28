import { z } from "zod"

export const createPaymentSchema = z.object({
  pickupId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().min(0),
  method: z.enum(["cash", "upi", "bank_transfer"]),
  reference: z.string().optional(),
  notes: z.string().optional()
})

export const updatePaymentStatusSchema = z.object({
  status: z.enum(["pending", "paid", "failed", "refunded"]),
  paidAt: z.string().datetime().or(z.date()).optional(),
  reference: z.string().optional()
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>
