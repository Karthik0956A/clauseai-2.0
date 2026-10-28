
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import os from 'os';

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const fileA = formData.get("fileA") as File;
        const fileB = formData.get("fileB") as File;

        if (!fileA || !fileB) {
            return NextResponse.json({ error: "Both Agreement A and Agreement B are required." }, { status: 400 });
        }

        // Helper to save and upload
        const uploadToGemini = async (file: File) => {
            const buffer = Buffer.from(await file.arrayBuffer());
            const tempFilePath = path.join(os.tmpdir(), `temp-${Date.now()}-${file.name}`);
            fs.writeFileSync(tempFilePath, buffer);

            const uploadResponse = await fileManager.uploadFile(tempFilePath, {
                mimeType: file.type,
                displayName: file.name,
            });

            // Cleanup temp
            fs.unlinkSync(tempFilePath);
            return uploadResponse.file;
        };

        const [uploadA, uploadB] = await Promise.all([
            uploadToGemini(fileA),
            uploadToGemini(fileB)
        ]);

        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert legal AI. Compare these two agreements (Agreement A and Agreement B).
        Identify the key clauses and highlight the differences between them.
        Focus on identifying risks or significant changes in terms (e.g., Liability, Indemnity, Termination, Jurisdiction, Payment Terms).
        
        Output the result strictly in this JSON format:
        {
            "clauses": [
                {
                    "title": "Clause Name (e.g., Limitation of Liability)",
                    "contentA": "Summary or extract from Agreement A",
                    "contentB": "Summary or extract from Agreement B",
                    "difference": "Explanation of the difference",
                    "riskLevel": "High" | "Medium" | "Low",
                    "riskAnalysis": "Why this is a risk"
                }
            ]
        }
        Do not output markdown code blocks, just the raw JSON string.
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadA.mimeType,
                    fileUri: uploadA.uri
                }
            },
            {
                fileData: {
                    mimeType: uploadB.mimeType,
                    fileUri: uploadB.uri
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();

        // Clean markdown if present
        let cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const comparisonData = JSON.parse(cleanedText);

        return NextResponse.json({ success: true, data: comparisonData });

    } catch (error) {
        console.error("Comparison Error:", error);
        return NextResponse.json({ error: "Failed to compare agreements." }, { status: 500 });
    }
}
