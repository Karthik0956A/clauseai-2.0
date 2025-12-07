
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
        You are an expert legal risk auditor.
        Analyze the provided document and generate a "Risk Visualizer Data" set.

        Task:
        1. Parse every clause and categorize it into EXACTLY ONE of these 4 categories:
           - "Financial Consequence" (e.g., penalties, costs, fees, damages)
           - "Legal Penalties" (e.g., litigation risks, breach consequences, regulatory fines)
           - "Loss of Rights" (e.g., IP transfer, non-compete, exclusivity, restrictions)
           - "Time-based Obligations" (e.g., deadlines, termination notice, delays, duration)

        2. For each risk/clause found, provide:
           - "category": One of the 4 above.
           - "severity": A score from 0 to 10 (0=Safe, 10=Critical).
           - "text": The specific clause text (shortened if needed).
           - "description": Plain English explanation of the risk.
           - "impact": Who is impacted? (e.g., "Client", "Provider", "Both").

        3. Calculate an overall "riskScore" (0-100).

        Output strictly in this JSON format:
        {
            "riskScore": 75,
            "risks": [
                {
                    "category": "Financial Consequence",
                    "severity": 8,
                    "text": "Indemnification for all indirect damages...",
                    "description": "You are liable for unlimited indirect costs.",
                    "impact": "Provider"
                },
                 {
                    "category": "Time-based Obligations",
                    "severity": 5,
                    "text": "30-day termination notice...",
                    "description": "Short notice period for cancellation.",
                    "impact": "Both"
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
        const riskData = JSON.parse(cleanedText);

        return NextResponse.json({ success: true, data: riskData });

    } catch (error) {
        console.error("Risk Analysis Error:", error);
        return NextResponse.json({ error: "Failed to analyze risk." }, { status: 500 });
    }
}
