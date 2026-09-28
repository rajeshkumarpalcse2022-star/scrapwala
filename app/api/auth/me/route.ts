import { getAuthenticatedUser } from "@/lib/auth/require-auth"
import { successResponse, errorResponse } from "@/lib/utils/api-response"

export async function GET() {
  const user = await getAuthenticatedUser()

  if (!user) {
    return errorResponse("Unauthorized", 401)
  }

  return successResponse({ user })
}
