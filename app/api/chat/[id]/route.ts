import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";
import { cookies } from "next/headers";

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Correct type for Next.js App Router dynamic params
) {
    try {
        const { id } = await context.params; // Await params in newer Next.js

        // 1. Authenticate
        const token = (await cookies()).get("session")?.value;
        const payload = await verifySessionToken(token);

        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // 2. Fetch specific conversation
        const conversation = await Conversation.findOne({ _id: id, userId: payload.userId });

        if (!conversation) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error("Load ID error:", error);
        return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
    }
}
