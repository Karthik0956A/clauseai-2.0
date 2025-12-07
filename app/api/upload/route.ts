
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import os from 'os';

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll("files") as File[];

        if (!files || files.length === 0) {
            return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
        }

        let finalFileToUpload: string;
        let mimeType: string;
        let originalName: string;

        // Create a temp directory
        const tempDir = os.tmpdir();

        if (files.length > 1 && files.every(f => f.type === 'application/pdf')) {
            // Merge PDFs
            const mergedPdf = await PDFDocument.create();

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            const tempFilePath = path.join(tempDir, `merged-${Date.now()}.pdf`);
            fs.writeFileSync(tempFilePath, mergedPdfBytes);

            finalFileToUpload = tempFilePath;
            mimeType = 'application/pdf';
            originalName = 'merged_documents.pdf';

        } else if (files.length === 1) {
            // Single file
            const file = files[0];
            const buffer = Buffer.from(await file.arrayBuffer());
            const tempFilePath = path.join(tempDir, file.name);
            fs.writeFileSync(tempFilePath, buffer);

            finalFileToUpload = tempFilePath;
            mimeType = file.type;
            originalName = file.name;
        } else {
            // Multiple non-PDF files or mixed types - not currently supported for merging in this scope
            // We will just take the first one for now or error out. 
            // For simplicity, let's just take the first one.
            const file = files[0];
            const buffer = Buffer.from(await file.arrayBuffer());
            const tempFilePath = path.join(tempDir, file.name);
            fs.writeFileSync(tempFilePath, buffer);

            finalFileToUpload = tempFilePath;
            mimeType = file.type;
            originalName = file.name;
        }

        const uploadResponse = await fileManager.uploadFile(finalFileToUpload, {
            mimeType: mimeType,
            displayName: originalName,
        });

        // Clean up temp file
        // fs.unlinkSync(finalFileToUpload); // Keep it for a bit or rely on OS cleanup? best to cleanup.
        // Verify processing state if it's a video, but for PDF/Image it's usually Active quickly or requires waiting?
        // The python script waited for video. We will return the URI and let the frontend/chat handle usage.
        // For PDFs/Images, we can usually use them immediately.

        // Cleanup
        try {
            fs.unlinkSync(finalFileToUpload);
        } catch (e) {
            console.error("Failed to cleanup temp file", e);
        }

        return NextResponse.json({
            success: true,
            file: {
                uri: uploadResponse.file.uri,
                mimeType: uploadResponse.file.mimeType,
                name: uploadResponse.file.name || originalName
            }
        });

    } catch (error) {
        console.error("Error in upload API:", error);
        return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
    }
}
