import { NextResponse } from "next/server"

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "scrapwala_session"

export async function POST() {
  const response = NextResponse.json(
    { success: true, message: "Logged out successfully" },
    { status: 200 }
  )

  response.cookies.set(COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
  })

  return response
}
