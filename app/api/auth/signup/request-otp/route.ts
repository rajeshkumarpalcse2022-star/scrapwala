import { NextRequest } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import OtpVerification from "@/models/OtpVerification"
import { signupOtpRequestSchema } from "@/lib/validations/auth"
import { createOtp } from "@/lib/auth/otp"
import { sendOtpEmail } from "@/lib/auth/email"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = signupOtpRequestSchema.parse(body)

    const email = data.email

    await connectDB()

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return errorResponse("An account with this email already exists.", 409)
    }

    const otpResult = await createOtp(email, "signup", undefined, 40)

    const emailSent = await sendOtpEmail({ to: email, otp: otpResult.otp, purpose: "signup" })

    if (!emailSent) {
      // Never pretend the OTP was sent. Remove the dangling record so the
      // user can retry immediately instead of hitting the resend cooldown.
      await OtpVerification.deleteMany({ identifier: email, purpose: "signup" })
      return errorResponse("Unable to send OTP. Please try again.", 500)
    }

    // devOtp is only ever defined when AUTH_OTP_DEV_MODE=true (development).
    // In real email mode the response carries no OTP material at all.
    return successResponse(
      "OTP sent to your email",
      otpResult.devOtp ? { devOtp: otpResult.devOtp } : undefined
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"

    if (message === "Please wait before requesting a new OTP") {
      return errorResponse(message, 429)
    }

    if (message.includes("String must contain")) {
      return errorResponse("Please enter a valid email address.", 400)
    }

    return errorResponse("Something went wrong", 500)
  }
}