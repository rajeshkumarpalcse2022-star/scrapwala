import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import { collectorSetPasswordSchema } from "@/lib/validations/auth"
import { hashPassword } from "@/lib/auth/password"
import { createSessionToken } from "@/lib/auth/session"
import { errorResponse } from "@/lib/utils/api-response"

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "scrapwala_session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = collectorSetPasswordSchema.parse(body)

    await connectDB()

    const user = await User.findById(data.userId)

    if (!user) {
      return errorResponse("User not found", 404)
    }

    if (user.role !== "collector") {
      return errorResponse("Invalid request", 400)
    }

    if (!user.mustChangePassword) {
      return errorResponse("Password change not required", 400)
    }

    if (!user.email) {
      return errorResponse("Invalid request", 400)
    }

    // Verify that the first-login OTP was already verified in the first-login step
    if (!user.firstLoginOtpVerifiedAt) {
      return errorResponse("First-login OTP not verified. Please verify OTP first.", 400)
    }

    // Ensure the verification is recent (within 10 minutes)
    const verificationAge = Date.now() - user.firstLoginOtpVerifiedAt.getTime()
    if (verificationAge > 10 * 60 * 1000) {
      return errorResponse("OTP verification expired. Please request a new OTP.", 400)
    }

    const hashedNewPassword = await hashPassword(data.newPassword)

    // $unset is required here: a plain `firstLoginOtpVerifiedAt: undefined`
    // is stripped from the update and would leave the timestamp set.
    await User.findByIdAndUpdate(data.userId, {
      $set: {
        password: hashedNewPassword,
        mustChangePassword: false,
        lastLoginAt: new Date(),
      },
      $unset: { firstLoginOtpVerifiedAt: 1 },
    })

    const token = await createSessionToken({
      sub: user._id.toString(),
      role: user.role,
    })

    const response = NextResponse.json(
      {
        success: true,
        message: "Password updated successfully",
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            collectorId: user.collectorId,
          },
        },
      },
      { status: 200 }
    )

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"

    if (message.includes("String must contain") || message.includes("Passwords")) {
      return errorResponse(message, 400)
    }

    return errorResponse("Something went wrong", 500)
  }
}