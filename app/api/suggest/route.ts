
import { GoogleGenerativeAI } from "@google/generative-ai";
import { type NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(req: NextRequest) {
    try {
        const { fileUri, mimeType } = await req.json();

        if (!fileUri || !mimeType) {
            return NextResponse.json({ error: "File context is required." }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are an expert legal aide. Your goal is to protect the user by suggesting safer, fairer alternatives to risky clauses in the provided document.

        Task:
        1. Identify 3-5 specific clauses that pose a risk or are unfair to the party represented by the document (assume the user is the one receiving/signing the contract).
        2. For each clause, provide:
           - The exact "Original" text.
           - A "Proposed" safer alternative text.
           - A brief "Reasoning" for the change.

        Output strictly in this JSON format:
        {
            "suggestions": [
                {
                    "original": "Termination without cause with 7 days notice",
                    "proposed": "Termination without cause only after 30-day notice period",
                    "reason": "7 days is too short to find a replacement. 30 days is standard."
                }
            ]
        }
        Do not output markdown code blocks.
        `;

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: mimeType,
                    fileUri: fileUri
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();
        // Clean markdown if present
        let cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const suggestionsData = JSON.parse(cleanedText);

        return NextResponse.json({ success: true, data: suggestionsData });

    } catch (error) {
        console.error("Suggestion Error:", error);
        return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
    }
}
