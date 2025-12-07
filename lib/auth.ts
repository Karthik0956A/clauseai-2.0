import { jwtVerify, SignJWT } from "jose"

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "your-secret-key-change-in-production")

export interface SessionPayload {
  email: string
  name: string
  iat: number
  exp: number
}

// Create a session token (JWT)
export async function createSessionToken(userId: string, email: string, name: string): Promise<string> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const token = await new SignJWT({ userId, email, name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret)

  return token
}

// Verify and decode session token
export interface SessionPayload {
  userId: string;
  expiresAt: Date;
  [key: string]: any;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    // Ensure userId exists and is a string
    if (typeof payload.userId !== 'string') return null;

    return {
      userId: payload.userId,
      expiresAt: new Date(payload.exp! * 1000), // exp is in seconds
      ...payload
    } as SessionPayload;
  } catch (error) {
    console.error("Failed to verify session token", error);
    return null;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export function isValidPassword(password: string): boolean {
  return password.length >= 8
}
