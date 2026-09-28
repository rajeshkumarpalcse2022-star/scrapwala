import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import { loginSchema } from "@/lib/validations/auth"
import { verifyPassword } from "@/lib/auth/password"
import { createSessionToken } from "@/lib/auth/session"
import { errorResponse } from "@/lib/utils/api-response"

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "scrapwala_session"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = loginSchema.parse(body)

    const rawIdentifier = data.identifier.trim()
    const identifierLower = rawIdentifier.toLowerCase()
    const password = data.password

    await connectDB()

    const user = await User.findOne({
      $or: [
        { email: identifierLower },
        { collectorId: { $regex: `^${rawIdentifier}$`, $options: "i" } },
      ],
    }).select("+password")

    if (!user) {
      return errorResponse("Invalid credentials. Please try again.", 401)
    }

    if (!user.isActive) {
      return errorResponse("Account is deactivated. Contact support.", 403)
    }

    if (!user.password) {
      return errorResponse("Invalid credentials. Please try again.", 401)
    }

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      return errorResponse("Invalid credentials. Please try again.", 401)
    }

    if (user.mustChangePassword && user.role === "collector") {
      return NextResponse.json(
        {
          success: true,
          message: "First login detected",
          data: {
            requiresPasswordChange: true,
            email: user.email,
            userId: user._id.toString(),
          },
        },
        { status: 200 }
      )
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() })

    const token = await createSessionToken({
      sub: user._id.toString(),
      role: user.role,
    })

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
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
  } catch {
    return errorResponse("Something went wrong", 500)
  }
}
