import { type NextRequest, NextResponse } from "next/server"

import { backendFetch } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const fileA = formData.get("fileA")
    const fileB = formData.get("fileB")
    if (!(fileA instanceof File) || !(fileB instanceof File)) {
      return NextResponse.json({ error: "Both Agreement A and Agreement B are required." }, { status: 400 })
    }

    const outbound = new FormData()
    outbound.append("file_a", fileA, fileA.name)
    outbound.append("file_b", fileB, fileB.name)
    const response = await backendFetch("/comparison", { method: "POST", body: outbound })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json({ success: false, error: body.error || "Failed to compare agreements." }, { status: response.status })
    }
    return NextResponse.json(body)
  } catch (error) {
    console.error("Comparison failed", error)
    return NextResponse.json({ error: "Failed to compare agreements." }, { status: 500 })
  }
}
