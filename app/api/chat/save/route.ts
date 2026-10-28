import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Conversation from "@/models/Conversation";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mongoose from 'mongoose';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

async function generateTitle(firstMessage: string) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(`Generate a very short, 3-5 word title for a legal conversation starting with this message: "${firstMessage}". Return ONLY the title, no quotes.`);
        return result.response.text().trim();
    } catch (e) {
        return "New Legal Conversation"; // Fallback
    }
}

export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate
        const token = (await cookies()).get("session")?.value;
        const payload = await verifySessionToken(token);

        if (!payload) {
            console.error("[API] Save unauthorized");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const userId = new mongoose.Types.ObjectId(payload.userId);

        const { conversationId, messages, document } = await req.json();

        console.log(`[API] Saving chat. ID: ${conversationId}, MsgCount: ${messages?.length}, User: ${userId}`);

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            console.error("[API] Save failed: No messages provided");
            return NextResponse.json({ error: "No messages to save" }, { status: 400 });
        }

        let conversation;
        let title;

        if (conversationId) {
            // Update existing
            conversation = await Conversation.findOne({ _id: conversationId, userId: userId });
            if (!conversation) {
                return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
            }
            conversation.messages = messages;
            conversation.lastMessageAt = new Date();
            // Update document if provided (e.g. if user uploads later in chat, theoretically)
            if (document) conversation.document = document;
            await conversation.save();
        } else {
            // Create new
            // Generate title from the first user message
            const firstUserMsg = messages.find((m: any) => m.role === 'user');
            title = firstUserMsg ? await generateTitle(firstUserMsg.content) : "New Chain";

            conversation = await Conversation.create({
                userId: userId,
                title: title,
                messages: messages,
                lastMessageAt: new Date(),
                document: document // Save initial document
            });
        }

        return NextResponse.json({
            success: true,
            conversationId: conversation._id,
            title: conversation.title
        });

    } catch (error) {
        console.error("Save chat error:", error);
        return NextResponse.json({ error: "Failed to save chat" }, { status: 500 });
    }
}
