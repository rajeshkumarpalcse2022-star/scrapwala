import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const SECRET = new TextEncoder().encode(
  process.env.AUTH_JWT_SECRET || "scrapwala-dev-secret-fallback"
)
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "scrapwala_session"
const ISSUER = "scrapwala"
const AUDIENCE = "scrapwala-client"

export type SessionRole = "user" | "collector" | "admin"

export interface SessionPayload {
  sub: string
  role: SessionRole
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .sign(SECRET)

  return token
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    })

    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", { path: "/", maxAge: 0 })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)

  if (!token) {
    return null
  }

  const payload = await verifySessionToken(token.value)
  return payload
}
