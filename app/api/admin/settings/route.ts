import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth/require-auth"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import { adminChangeCredentialsSchema } from "@/lib/validations/auth"
import { verifyPassword, hashPassword } from "@/lib/auth/password"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireRole("admin")

    const body = await request.json()
    const data = adminChangeCredentialsSchema.parse(body)

    await connectDB()

    const user = await User.findById(admin.id).select("+password")
    if (!user) {
      return errorResponse("User not found", 404)
    }

    if (!user.password) {
      return errorResponse("Invalid credentials", 401)
    }

    const isPasswordValid = await verifyPassword(data.currentPassword, user.password)
    if (!isPasswordValid) {
      return errorResponse("Current password is incorrect", 401)
    }

    const updates: Record<string, unknown> = {}

    if (data.email) {
      const newEmail = data.email.toLowerCase().trim()
      if (newEmail !== user.email) {
        const existingEmail = await User.findOne({ email: newEmail })
        if (existingEmail) {
          return errorResponse("Email already in use", 409)
        }
        updates.email = newEmail
      }
    }

    if (data.newPassword) {
      updates.password = await hashPassword(data.newPassword)
    }

    if (Object.keys(updates).length === 0) {
      return successResponse("No changes to update")
    }

    await User.findByIdAndUpdate(admin.id, updates)

    return successResponse("Credentials updated successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update credentials"
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403)
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401)
    }
    return errorResponse(message, [], 500)
  }
}
