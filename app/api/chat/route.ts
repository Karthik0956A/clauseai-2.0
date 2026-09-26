import { type NextRequest, NextResponse } from "next/server"

import { backendFetch } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const { message, file, audio } = await req.json()
    if (audio) {
      return NextResponse.json(
        {
          error:
            "Voice messages are not transcribed by this service. Type the question, or attach the contract and ask in text.",
        },
        { status: 400 },
      )
    }
    if (!file?.uri) {
      return NextResponse.json(
        { error: "Upload a contract before asking a question about it." },
        { status: 400 },
      )
    }

    const response = await backendFetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, document_id: file.uri }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ error: body.error || "Failed to process chat" }, { status: response.status })
    }
    return NextResponse.json({ response: body.response, citations: body.citations || [] })
  } catch (error) {
    console.error("Chat failed", error)
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 })
  }
}
