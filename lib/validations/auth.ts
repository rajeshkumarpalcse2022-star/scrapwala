import { z } from "zod"

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or collector ID is required"),
  password: z.string().min(1, "Password is required"),
})

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address.")
  .transform((value) => value.toLowerCase().trim())

export const userSignupSchema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name.").max(100, "Name must be under 100 characters."),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number."),
    email: emailSchema,
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export const signupOtpRequestSchema = z.object({
  email: emailSchema,
})

export const signupOtpVerifySchema = z.object({
  email: emailSchema,
  code: z.string().length(6, "OTP must be 6 digits"),
  // Client must submit the password again so the account is only created after OTP verification.
  name: z.string().trim().min(2, "Please enter your full name.").max(100, "Name must be under 100 characters."),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number."),
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export const phoneSchema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number") })

export const verifyEmailOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
  purpose: z.enum(["collector_first_login"]),
})

export const resendOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  purpose: z.enum(["collector_first_login"]),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export const setNewPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
})

export const collectorSetPasswordSchema = z
  .object({
    userId: z.string().min(1, "User is required"),
    // The verified first-login OTP is re-validated and consumed here so the
    // temporary password is never reusable and the OTP cannot be reused.
    code: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export const adminCreateCollectorSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, "Invalid phone number"),
})

export const adminChangeCredentialsSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type UserSignupInput = z.infer<typeof userSignupSchema>
export type SignupOtpRequestInput = z.infer<typeof signupOtpRequestSchema>
export type SignupOtpVerifyInput = z.infer<typeof signupOtpVerifySchema>
export type PhoneInput = z.infer<typeof phoneSchema>
export type VerifyEmailOtpInput = z.infer<typeof verifyEmailOtpSchema>
export type ResendOtpInput = z.infer<typeof resendOtpSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type SetNewPasswordInput = z.infer<typeof setNewPasswordSchema>
export type CollectorSetPasswordInput = z.infer<typeof collectorSetPasswordSchema>
export type AdminCreateCollectorInput = z.infer<typeof adminCreateCollectorSchema>
export type AdminChangeCredentialsInput = z.infer<typeof adminChangeCredentialsSchema>
