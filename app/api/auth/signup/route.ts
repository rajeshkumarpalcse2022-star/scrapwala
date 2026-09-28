import { NextRequest } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import { signupOtpVerifySchema } from "@/lib/validations/auth"
import { verifyOtp } from "@/lib/auth/otp"
import { hashPassword } from "@/lib/auth/password"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = signupOtpVerifySchema.parse(body)

    const email = data.email
    const phone = data.phone

    const result = await verifyOtp(email, data.code, "signup")

    if (!result.success) {
      return errorResponse(result.error || "Invalid or expired OTP.", 400)
    }

    await connectDB()

    const existingEmail = await User.findOne({ email })
    if (existingEmail) {
      return errorResponse("An account with this email already exists.", 409)
    }

    const existingPhone = await User.findOne({ phone })
    if (existingPhone) {
      return errorResponse("An account with this mobile number already exists.", 409)
    }

    const hashedPassword = await hashPassword(data.password)

    // role is hard-coded to "user" — any client-supplied role is ignored.
    const user = await User.create({
      name: data.name,
      phone,
      email,
      password: hashedPassword,
      role: "user",
      isVerified: true,
      isActive: true,
    })

    // Account is created but NOT logged in automatically — the user
    // is redirected to /login to sign in with email + password.
    return successResponse(
      "Account created successfully. Please log in.",
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
      },
      201
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong"

    if (message.includes("String must contain") || message.includes("valid")) {
      return errorResponse(message, 400)
    }

    return errorResponse("Something went wrong", 500)
  }
}