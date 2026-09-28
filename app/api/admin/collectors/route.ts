import { NextRequest } from "next/server"
import { requireRole } from "@/lib/auth/require-auth"
import connectDB from "@/lib/db/mongoose"
import User from "@/models/User"
import Counter from "@/models/Counter"
import { adminCreateCollectorSchema } from "@/lib/validations/auth"
import { hashPassword } from "@/lib/auth/password"
import crypto from "node:crypto"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lower = "abcdefghijklmnopqrstuvwxyz"
  const digits = "0123456789"
  const special = "@#$%&*"
  const all = upper + lower + digits + special

  let password = ""
  password += upper[crypto.randomInt(0, upper.length)]
  password += lower[crypto.randomInt(0, lower.length)]
  password += digits[crypto.randomInt(0, digits.length)]
  password += special[crypto.randomInt(0, special.length)]

  for (let i = 4; i < 12; i++) {
    password += all[crypto.randomInt(0, all.length)]
  }

  return password.split("").sort(() => crypto.randomInt(0, 3) - 1).join("")
}

async function generateCollectorId(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "collector" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  )

  return `COL-${String(counter.sequence).padStart(6, "0")}`
}

export async function GET() {
  try {
    await requireRole("admin")

    await connectDB()

    const collectors = await User.find({ role: "collector" })
      .select("name email phone collectorId isActive mustChangePassword createdAt")
      .sort({ createdAt: -1 })
      .lean()

    return successResponse("Collectors fetched successfully", {
      collectors: collectors.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone,
        collectorId: c.collectorId,
        isActive: c.isActive,
        mustChangePassword: c.mustChangePassword,
        createdAt: c.createdAt,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch collectors"
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403)
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401)
    }
    return errorResponse(message, [], 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin")

    const body = await request.json()
    const data = adminCreateCollectorSchema.parse(body)

    await connectDB()

    const existingEmail = await User.findOne({ email: data.email.toLowerCase().trim() })
    if (existingEmail) {
      return errorResponse("An account with this email already exists", 409)
    }

    const existingPhone = await User.findOne({ phone: data.phone.trim() })
    if (existingPhone) {
      return errorResponse("An account with this phone number already exists", 409)
    }

    const collectorId = await generateCollectorId()
    const temporaryPassword = generateTemporaryPassword()
    const hashedPassword = await hashPassword(temporaryPassword)

    const collector = await User.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      password: hashedPassword,
      role: "collector",
      collectorId,
      mustChangePassword: true,
      isVerified: true,
      isActive: true,
    })

    return successResponse(
      "Collector created successfully",
      {
        collector: {
          id: collector._id.toString(),
          name: collector.name,
          email: collector.email,
          phone: collector.phone,
          collectorId: collector.collectorId,
        },
        temporaryPassword,
      },
      201
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create collector"
    if (message.includes("Insufficient permissions")) {
      return errorResponse("Admin access required", [], 403)
    }
    if (message.includes("Authentication required")) {
      return errorResponse("Please login", [], 401)
    }
    return errorResponse(message, [], 500)
  }
}
