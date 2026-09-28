import crypto from "node:crypto"
import OtpVerification from "@/models/OtpVerification"
import connectDB from "@/lib/db/mongoose"
import type { OtpPurpose } from "@/models/OtpVerification"

const OTP_LENGTH = 6
const OTP_EXPIRY_SECONDS = 40
const RESEND_COOLDOWN_SECONDS = 60

export function generateOtp(): string {
  let otp = ""
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += crypto.randomInt(0, 10).toString()
  }
  return otp
}

export function getOtpHashSecret(): string {
  return process.env.OTP_HASH_SECRET || "scrapwala-otp-dev-secret"
}

export async function hashOtp(otp: string): Promise<string> {
  const hmac = crypto.createHmac("sha256", getOtpHashSecret())
  hmac.update(otp)
  return hmac.digest("hex")
}

export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  const computed = await hashOtp(otp)
  return computed === hash
}

export async function createOtp(
  identifier: string,
  purpose: OtpPurpose,
  userId?: string,
  cooldownSeconds: number = RESEND_COOLDOWN_SECONDS
): Promise<{ otp: string; devOtp?: string }> {
  await connectDB()

  const cooldownDate = new Date(Date.now() - cooldownSeconds * 1000)
  const existing = await OtpVerification.findOne({
    identifier,
    purpose,
    createdAt: { $gte: cooldownDate },
  })

  if (existing) {
    throw new Error("Please wait before requesting a new OTP")
  }

  const otp = generateOtp()
  const codeHash = await hashOtp(otp)

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000)

  await OtpVerification.deleteMany({ identifier, purpose, verifiedAt: { $exists: false } })

  await OtpVerification.create({
    identifier,
    purpose,
    codeHash,
    expiresAt,
    userId: userId || undefined,
  })

  if (process.env.NODE_ENV === "development" && process.env.AUTH_OTP_DEV_MODE === "true") {
    return { otp, devOtp: otp }
  }

  return { otp }
}

export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: OtpPurpose,
  consume: boolean = true
): Promise<{ success: boolean; userId?: string; error?: string }> {
  await connectDB()

  const record = await OtpVerification.findOne({
    identifier,
    purpose,
    verifiedAt: { $exists: false },
  }).sort({ createdAt: -1 })

  if (!record) {
    return { success: false, error: "No OTP found. Please request a new one." }
  }

  if (record.expiresAt < new Date()) {
    return { success: false, error: "OTP has expired. Please request a new one." }
  }

  if (record.attempts >= record.maxAttempts) {
    return { success: false, error: "Maximum OTP attempts exceeded. Please request a new one." }
  }

  const valid = await verifyOtpHash(code, record.codeHash)

  if (!valid) {
    await OtpVerification.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } })
    return { success: false, error: "Invalid OTP. Please try again." }
  }

  if (consume) {
    record.verifiedAt = new Date()
    await record.save()
  }

  return { success: true, userId: record.userId?.toString() }
}
