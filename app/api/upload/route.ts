import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

import { backendFetch } from "@/lib/backend"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll("files") as File[]
    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 })
    }

    const outbound = new FormData()
    if (files.length > 1 && files.every((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const pdf = await PDFDocument.load(await file.arrayBuffer())
        const pages = await merged.copyPages(pdf, pdf.getPageIndices())
        pages.forEach((page) => merged.addPage(page))
      }
      const bytes = await merged.save()
      outbound.append("file", new Blob([bytes], { type: "application/pdf" }), "merged_documents.pdf")
    } else {
      outbound.append("file", files[0], files[0].name)
    }

    const response = await backendFetch("/documents/upload", { method: "POST", body: outbound })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || !body.document) {
      return NextResponse.json(
        { success: false, error: body.error || "Failed to process upload" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      stages: body.document.stages,
      file: {
        uri: body.document.id,
        mimeType: body.document.mimeType,
        name: body.document.filename,
      },
    })
  } catch (error) {
    console.error("Upload failed", error)
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 })
  }
}
