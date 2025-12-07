"use client"

import { useState, useEffect } from "react"
import { MessageSquare, Clock, ArrowRight, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ConversationSummary {
    _id: string;
    title: string;
    lastMessageAt: string;
    document?: {
        name: string;
        mimeType: string;
    };
}

interface ChatHistoryProps {
    onSelectChat: (id: string) => void;
}

export default function ChatHistory({ onSelectChat }: ChatHistoryProps) {
    const [history, setHistory] = useState<ConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setError(null);
                const res = await fetch("/api/chat/history");
                const data = await res.json();
                if (data.success) {
                    setHistory(data.conversations);
                } else {
                    setError(data.error || "Failed to load history");
                }
            } catch (e) {
                console.error("Failed to fetch history", e);
                setError("Connection error");
            }
            setIsLoading(false);
        };
        fetchHistory();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
                <div>
                    <h2 className="text-2xl font-bold text-white">Conversation History</h2>
                    <p className="text-neutral-400">Resume your past legal consultations.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                </div>
            ) : error ? (
                <div className="text-center py-20 bg-red-900/20 rounded-xl border border-red-800/50">
                    <p className="text-red-400 font-medium mb-2">Unavailable</p>
                    <p className="text-neutral-400 text-sm">{error}</p>
                    <Button onClick={() => window.location.reload()} variant="link" className="text-cyan-400 mt-4">
                        Reload Page
                    </Button>
                </div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                    <MessageSquare className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <p className="text-neutral-400 font-medium">No conversation history yet.</p>
                    <p className="text-neutral-500 text-sm mt-1">Start a chat to see it saved here.</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {history.map((chat) => (
                        <Card
                            key={chat._id}
                            className="bg-neutral-800/40 border-neutral-700/50 p-6 hover:border-cyan-500/50 hover:bg-neutral-800/60 transition-all group flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-cyan-950/30 rounded-lg text-cyan-400 border border-cyan-500/20">
                                        <MessageSquare size={20} />
                                    </div>
                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                        <Clock size={12} />
                                        {new Date(chat.lastMessageAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 leading-tight">
                                    {chat.title}
                                </h3>
                                {chat.document && (
                                    <div className="flex items-center gap-2 mt-3 text-xs bg-neutral-900/50 p-2 rounded border border-neutral-800 text-neutral-400">
                                        <span className="text-lg">📄</span>
                                        <span className="truncate max-w-[150px]">{chat.document.name}</span>
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={() => onSelectChat(chat._id)}
                                className="w-full mt-6 bg-neutral-900 border border-neutral-700 hover:border-cyan-500 hover:text-cyan-400 flex justify-between group-hover:bg-neutral-800 transition-all"
                                variant="outline"
                            >
                                Resume Chat <ArrowRight size={16} />
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
