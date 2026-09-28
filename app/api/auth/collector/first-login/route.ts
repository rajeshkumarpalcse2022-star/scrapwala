import { NextRequest } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import { verifyEmailOtpSchema } from "@/lib/validations/auth"
import { verifyOtp } from "@/lib/auth/otp"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = verifyEmailOtpSchema.parse(body)

    const email = data.email.toLowerCase().trim()

    await connectDB()

    // Early eligibility guard. The authoritative checks happen below on the
    // canonical OTP-bound user document.
    const account = await User.findOne({ email, role: "collector" })
    if (!account) {
      return errorResponse("Collector account not found", 404)
    }

    if (!account.mustChangePassword) {
      return errorResponse("Password change not required", 400)
    }

    // 1. Validate the OTP WITHOUT consuming it yet. Consuming before the
    //    verification state is persisted could leave the system with
    //    "OTP consumed BUT firstLoginOtpVerifiedAt not saved".
    const validation = await verifyOtp(email, data.code, "collector_first_login", false)

    if (!validation.success) {
      return errorResponse(validation.error || "OTP verification failed", [], 400)
    }

    if (!validation.userId) {
      return errorResponse("Invalid OTP record. Please request a new OTP.", 400)
    }

    // 2. Canonical identity: the User bound to the server-side OTP record.
    //    Never trust a client-supplied userId and never re-derive identity
    //    by email once the OTP verification has returned its userId.
    const user = await User.findById(validation.userId)
    if (!user || user.role !== "collector") {
      return errorResponse("Collector account not found", 404)
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated. Contact support.", 403)
    }

    if (!user.mustChangePassword) {
      return errorResponse("Password change not required", 400)
    }

    // 3. Persist the verification state BEFORE consuming the OTP.
    user.firstLoginOtpVerifiedAt = new Date()
    await user.save()

    // 4. Consume the OTP now that verification state is durable. The User
    //    document is authoritative; a consume failure here must not fail the
    //    already-persisted verification.
    const consumption = await verifyOtp(email, data.code, "collector_first_login", true)
    if (!consumption.success) {
      console.error("[first-login] OTP consume after persist failed:", consumption.error)
    }

    return successResponse("OTP verified. Please set your new password.", {
      userId: user._id.toString(),
      email: user.email,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"
    return errorResponse(message, [], 500)
  }
}
