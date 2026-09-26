import { type NextRequest, NextResponse } from "next/server"

import { backendFetch } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const { fileUri, documentId } = await req.json()
    const id = documentId || fileUri
    if (!id) {
      return NextResponse.json({ error: "File context is required." }, { status: 400 })
    }
    const response = await backendFetch(`/risk/suggest?document_id=${encodeURIComponent(id)}`, { method: "POST" })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ success: false, error: body.error || "Failed to generate suggestions." }, { status: response.status })
    }
    return NextResponse.json(body)
  } catch (error) {
    console.error("Suggestion failed", error)
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 })
  }
}
