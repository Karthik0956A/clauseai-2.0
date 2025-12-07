import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";
import { cookies } from "next/headers";
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate
        const token = (await cookies()).get("session")?.value;
        const payload = await verifySessionToken(token);

        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const userId = new mongoose.Types.ObjectId(payload.userId);
        console.log(`[API] Fetching history for UserID: ${userId}`);

        // 2. Fetch recent 5 conversations
        const conversations = await Conversation.find({ userId: userId })
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .select('title lastMessageAt document'); // Select document info

        console.log(`[API] Found ${conversations.length} conversations`);

        return NextResponse.json({
            success: true,
            conversations
        });

    } catch (error) {
        console.error("Fetch history error:", error);
        return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
    }
}
