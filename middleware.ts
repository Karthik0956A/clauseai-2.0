import { type NextRequest, NextResponse } from "next/server"
import { verifySessionToken } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public paths that don't require authentication
  const publicPaths = ["/auth", "/api/auth", "/api/chat", "/api/upload", "/api/compare", "/api/risk", "/api/suggest"]

  // If it's a public path, allow access
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Get session from cookie
  const sessionToken = request.cookies.get("session")?.value

  if (!sessionToken) {
    // No session, redirect to auth page
    if (pathname !== "/auth") {
      return NextResponse.redirect(new URL("/auth", request.url))
    }
    return NextResponse.next()
  }

  // Verify token
  const session = await verifySessionToken(sessionToken)
  if (!session) {
    // Token invalid or expired, redirect to auth
    const response = NextResponse.redirect(new URL("/auth", request.url))
    response.cookies.delete("session")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
