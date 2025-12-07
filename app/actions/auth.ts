"use server"

import { cookies } from "next/headers"
import { createSessionToken, verifySessionToken, isValidEmail, isValidPassword } from "@/lib/auth"

const SESSION_COOKIE_NAME = "session"
const SESSION_COOKIE_MAXAGE = 7 * 24 * 60 * 60 // 7 days in seconds

export async function loginAction(email: string, name: string, password: string) {
  // Validate inputs
  if (!isValidEmail(email)) {
    return { success: false, error: "Invalid email format" }
  }

  if (!isValidPassword(password)) {
    return { success: false, error: "Password must be at least 8 characters" }
  }

  if (!name || name.trim().length === 0) {
    return { success: false, error: "Name is required" }
  }

  try {
    // Create session token
    const token = await createSessionToken(email, name)

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_COOKIE_MAXAGE,
      path: "/",
    })

    return { success: true, email, name }
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return { success: false, error: "Authentication failed. Please try again." }
  }
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  return { success: true }
}

export async function getSessionAction() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    return { success: false, session: null }
  }

  const session = await verifySessionToken(token)
  if (!session) {
    // Token expired or invalid, clear the cookie
    cookieStore.delete(SESSION_COOKIE_NAME)
    return { success: false, session: null }
  }

  return { success: true, session }
}
