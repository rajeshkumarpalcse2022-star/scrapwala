import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || "scrapwala-dev-secret-fallback")
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "scrapwala_session"

async function verifyToken(token: string): Promise<{ sub: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as { sub: string; role: string }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(COOKIE_NAME)?.value
  const payload = token ? await verifyToken(token) : null

  if (pathname.startsWith("/admin")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (pathname.startsWith("/collector")) {
    if (!payload) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    if (payload.role !== "collector") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ["/admin/:path*", "/collector/:path*"] }
