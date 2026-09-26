import { cookies } from "next/headers"

const backendUrl = process.env.FASTAPI_URL || "http://127.0.0.1:8000"

export async function backendFetch(path: string, init: RequestInit = {}) {
  const token = (await cookies()).get("session")?.value
  if (!token) {
    return Response.json({ success: false, error: "Sign in before using this resource." }, { status: 401 })
  }

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)

  try {
    return await fetch(`${backendUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    })
  } catch {
    return Response.json(
      {
        success: false,
        error: "The analysis service is not running. Start the FastAPI backend and set FASTAPI_URL.",
      },
      { status: 503 },
    )
  }
}

export async function readBackendError(response: Response) {
  try {
    const body = await response.json()
    return body.error || "The analysis service returned an error."
  } catch {
    return "The analysis service returned an unreadable error."
  }
}
