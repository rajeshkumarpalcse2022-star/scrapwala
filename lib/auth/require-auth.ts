import { getSession } from "./session"
import User from "@/models/User"
import connectDB from "@/lib/db/mongoose"
import { ApiError } from "@/lib/utils/api-error"
import type { SessionRole } from "./session"

export interface AuthenticatedUser {
  id: string
  name: string
  phone: string
  email?: string
  role: SessionRole
  isVerified: boolean
  isActive: boolean
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const session = await getSession()

  if (!session) {
    return null
  }

  await connectDB()

  const user = await User.findById(session.sub).select(
    "name phone email role isVerified isActive"
  )

  if (!user || !user.isActive) {
    return null
  }

  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role as SessionRole,
    isVerified: user.isVerified,
    isActive: user.isActive,
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser()

  if (!user) {
    throw new ApiError(401, "Authentication required", "UNAUTHORIZED")
  }

  return user
}

export async function requireRole(
  roles: string | string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth()
  const allowedRoles = Array.isArray(roles) ? roles : [roles]

  if (!allowedRoles.includes(user.role)) {
    throw new ApiError(403, "Insufficient permissions", "FORBIDDEN")
  }

  return user
}
