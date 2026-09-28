import { NextRequest } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import OtpVerification from "@/models/OtpVerification"
import { resendOtpSchema } from "@/lib/validations/auth"
import { createOtp } from "@/lib/auth/otp"
import { sendOtpEmail } from "@/lib/auth/email"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = resendOtpSchema.parse(body)

    // Only the collector first-login purpose is served by this endpoint.
    const email = data.email.toLowerCase().trim()

    await connectDB()

    const collector = await User.findOne({ email, role: "collector" })
    if (!collector) {
      return errorResponse("Collector account not found", 404)
    }

    if (!collector.mustChangePassword) {
      return errorResponse("Password setup already completed. Please log in.", 400)
    }

    const otpResult = await createOtp(
      email,
      "collector_first_login",
      collector._id.toString(),
      40
    )

    const emailSent = await sendOtpEmail({
      to: email,
      otp: otpResult.otp,
      purpose: "collector_first_login",
    })

    if (!emailSent) {
      // Never pretend the OTP was sent. Remove the dangling record so the
      // collector can retry immediately instead of hitting the cooldown.
      await OtpVerification.deleteMany({ identifier: email, purpose: "collector_first_login" })
      throw new Error("Unable to send OTP. Please try again.")
    }

    // devOtp is only ever defined when AUTH_OTP_DEV_MODE=true (development).
    // In real email mode the response carries no OTP material at all.
    return successResponse(
      "OTP sent to your registered email",
      otpResult.devOtp ? { devOtp: otpResult.devOtp } : undefined
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"

    if (message === "Unable to send OTP. Please try again.") {
      return errorResponse(message, 500)
    }

    if (message === "Please wait before requesting a new OTP") {
      return errorResponse(message, 429)
    }

    return errorResponse("Something went wrong", 500)
  }
}