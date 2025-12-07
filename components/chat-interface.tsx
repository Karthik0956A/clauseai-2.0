"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, User, Bot, Upload, FileText, Languages, Mic, MicOff, Volume2, ShieldAlert, X, Lightbulb, CheckCircle2, ArrowRight, Download, MessageSquare, Plus } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import ReactMarkdown from "react-markdown"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"


interface ChatInterfaceProps {
  uploadedFile?: { uri: string; mimeType: string; name: string } | null
  initialConversationId?: string | null
}

interface ChatMessage {
  id: number
  role: "user" | "assistant" | "system"
  content: string
  timestamp: string
}

export default function ChatInterface({ uploadedFile: initialUploadedFile, initialConversationId = null }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: Date.now(),
      role: "assistant", // Using 'assistant' consistent with backend role
      content:
        "Hello! I'm your legal AI assistant. Ask me anything about legal documents, contracts, policies, or clauses. I'm here to simplify complex legal language into plain English.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ])
  const [input, setInput] = useState("")
  const [uploadedFile, setUploadedFile] = useState(initialUploadedFile)
  const [language, setLanguage] = useState("english")
  const [isLoading, setIsLoading] = useState(false)
  const [showRiskModal, setShowRiskModal] = useState(false)
  const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false)
  const [riskData, setRiskData] = useState<{ riskScore: number; risks: any[] } | null>(null)

  // Chat History State
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Suggestions State
  const [showSuggestModal, setShowSuggestModal] = useState(false)
  const [isAnalyzingSuggest, setIsAnalyzingSuggest] = useState(false)
  const [suggestionsData, setSuggestionsData] = useState<{ suggestions: any[] } | null>(null)

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reload history if conversationId changes or is provided prop
  useEffect(() => {
    if (initialConversationId) {
      loadConversation(initialConversationId);
    } else {
      // Reset to default
      setConversationId(null);
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: "Hello! I'm your legal AI assistant. Ask me anything.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }
  }, [initialConversationId]);

  const loadConversation = async (id: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/chat/${id}`);
      const data = await res.json();
      if (data.success) {
        if (data.conversation) {
          setMessages(data.conversation.messages);
          // Restore associated document if present
          if (data.conversation.document) {
            setUploadedFile(data.conversation.document);
          }

          // Only set conversationId if it's not already set, or if it's different
          if (!conversationId || conversationId !== data.conversation._id) {
            setConversationId(data.conversation._id);
          }
        }
        // Ensure new conversation ID is set in internal state even if not passed by prop yet, to support continuing same session
        // This handles cases where a new conversation is created and we get an ID back
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
          // We don't need to refresh history list here anymore as it is on a different tab
        }
      }
    } catch (e) {
      console.error("Failed to load chat", e);
    }
    setLoadingHistory(false);
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Use webm for broad support, or mp3 if supported
        await handleAudioUpload(audioBlob);

        // Stop all tracks to release mic
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      alert("Could not access microphone. Please ensure permission is granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsLoading(true);

    setIsLoading(true);

    // REMOVED: Duplicate message insertion. handleSend takes care of it.
    /*
    const audioMessageId = messages.length + 1;
    const userMessage: ChatMessage = {
      id: audioMessageId,
      role: "user",
      content: "🎤 [Audio Message]",
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prev) => [...prev, userMessage])
    */

    // Create file from blob
    const file = new File([audioBlob], "voice_message.webm", { type: "audio/webm" });
    const formData = new FormData();
    formData.append("files", file);

    try {
      // 1. Upload Audio
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        throw new Error("Audio upload failed");
      }

      // DO NOT overwrite the main uploaded document
      // setUploadedFile(...) -> REMOVED

      // Auto-send the audio context
      await handleSend(undefined, { uri: uploadData.file.uri, mimeType: uploadData.file.mimeType });

    } catch (error) {
      console.error("Voice processing failed", error);
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: "Sorry, I couldn't process your voice message.",
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false);
      setIsRecording(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any current speaking
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      // Try to find a voice matching the selected language if possible, else default
      // Simplified check:
      if (language === 'hindi') utterance.lang = 'hi-IN';
      else if (language === 'kannada') utterance.lang = 'kn-IN'; // Might not be available in all browsers
      else utterance.lang = 'en-US';

      window.speechSynthesis.speak(utterance);
    } else {
      alert("Text-to-speech not supported in this browser.");
    }
  }

  const handleRiskScan = async () => {
    if (!uploadedFile) return;
    setIsAnalyzingRisk(true);
    setShowRiskModal(true);
    setRiskData(null);

    try {
      // Save conversation state before risk scan
      const updatedMessages = messages; // Assuming 'messages' is the current state of chat messages
      console.log("Saving conversation...", { conversationId, msgCount: updatedMessages.length, doc: uploadedFile });
      const saveRes = await fetch("/api/chat/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          document: uploadedFile ? {
            name: uploadedFile.name,
            mimeType: uploadedFile.mimeType,
            uri: uploadedFile.uri,
            context: "Attached Document"
          } : undefined
        })
      });

      const saveResult = await saveRes.json();
      if (!saveResult.success) {
        console.error("Failed to save conversation before risk scan", saveResult.error);
        alert("Warning: Failed to save chat history. Please start a new chat.");
      } else if (!conversationId && saveResult.conversationId) {
        setConversationId(saveResult.conversationId);
      }

      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUri: uploadedFile.uri,
          mimeType: uploadedFile.mimeType
        })
      });
      const data = await res.json();
      if (data.success) {
        setRiskData(data.data);
      } else {
        console.error(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setIsAnalyzingRisk(false);
  }

  const handleSuggest = async () => {
    if (!uploadedFile) return;
    setIsAnalyzingSuggest(true);
    setShowSuggestModal(true);
    setSuggestionsData(null);

    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUri: uploadedFile.uri,
          mimeType: uploadedFile.mimeType
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestionsData(data.data);
      } else {
        console.error(data.error);
      }
    } catch (e) {
      console.error(e);
    }
    setIsAnalyzingSuggest(false);
  }

  const handleDownloadPDF = async () => {
    // Find the last assistant message
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length === 0) return;

    const lastMessage = assistantMessages[assistantMessages.length - 1];
    const sourceElement = document.getElementById(`message - content - ${lastMessage.id} `);

    if (!sourceElement) {
      alert("Could not find the summary to download.");
      return;
    }

    try {
      // 1. Create a deep clone
      const clone = sourceElement.cloneNode(true) as HTMLElement;

      // 2. Recursive function to copy computed styles from Source to Clone
      //    and strip classes to prevent html2canvas from matching 'lab()' rules in CSS.
      const copyComputedStyles = (source: Element, target: Element) => {
        const computed = window.getComputedStyle(source);
        const targetStyle = (target as HTMLElement).style;

        // Explicitly copy all visual properties relevant for the PDF
        // We use specific properties because cssText might be empty or contain unsupported syntax
        const properties = [
          'color', 'backgroundColor', 'backgroundImage',
          'border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft',
          'borderRadius',
          'padding', 'margin',
          'font', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'textAlign', 'textDecoration',
          'display', 'width', 'height', 'visibility', 'opacity',
          'boxShadow', 'overflow', 'whiteSpace', 'wordBreak'
        ];

        properties.forEach(prop => {
          // @ts-ignore
          targetStyle[prop] = computed[prop];
        });

        // Strip classes to detach from Tailwind stylesheet
        if (target.tagName !== 'SVG' && target.tagName !== 'PATH' && target.tagName !== 'CIRCLE') {
          target.removeAttribute('class');
        }

        // Recurse for children
        for (let i = 0; i < source.children.length; i++) {
          if (target.children[i]) {
            copyComputedStyles(source.children[i], target.children[i]);
          }
        }
      };

      // Perform the bake
      copyComputedStyles(sourceElement, clone);

      // Wrapper to place the clone in
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '800px'; // A4 width approx
      container.style.background = '#171717'; // Force dark bg
      container.appendChild(clone);

      document.body.appendChild(container);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#171717',
        logging: false
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.setFontSize(16);
      pdf.setTextColor(40, 40, 40);
      pdf.text("ClauseAI Legal Summary", 10, 10);

      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save('clauseai-summary.pdf');

    } catch (err: any) {
      console.error("PDF generation failed", err);
      alert(`Failed to generate PDF: ${err.message || 'Unknown error'} `);
    }
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return "text-emerald-400";
    if (score < 70) return "text-yellow-400";
    return "text-red-500";
  }

  const getRiskBg = (score: number) => {
    if (score < 30) return "bg-emerald-500";
    if (score < 70) return "bg-yellow-500";
    return "bg-red-500";
  }

  const handleSend = async (e?: React.FormEvent, audioFile?: { uri: string; mimeType: string }) => {
    e?.preventDefault(); // Prevent default form submission if called from form

    const currentInput = input.trim();
    if (!currentInput && !audioFile) return;

    const userMessage: ChatMessage = {
      id: messages.length + 1,
      role: "user",
      content: audioFile ? "🎤 [Audio Message]" : currentInput,
      timestamp: new Date().toLocaleTimeString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Filter history to ensure it starts with a user message, as Gemini API requires.
      // Also exclude the initial welcome message if it's just a greeting.
      const history = messages
        .filter((_, index) => index > 0) // Skip the first static welcome message which is usually 'assistant'
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      // Double check: if still starts with assistant, shift it (though logic above likely handles it if id=1 is always assistant)
      if (history.length > 0 && history[0].role === 'assistant') {
        history.shift();
      }

      // Append language instruction if not English
      let finalMessage = audioFile ? "Please listen to this audio and respond." : currentInput;
      if (language !== "english") {
        finalMessage += `\n\n(Please provide the answer in ${language.charAt(0).toUpperCase() + language.slice(1)} language.If explaining a document, keep valid terms but explain in ${language}.)`;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: finalMessage,
          history: history,
          file: uploadedFile, // The persistent document
          audio: audioFile   // The transient voice message
        })
      });

      const data = await res.json();

      if (data.response) {
        const assistantMessage: ChatMessage = {
          id: messages.length + 2,
          role: "assistant",
          content: data.response,
          timestamp: new Date().toLocaleTimeString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        console.error("Chat error", data.error);
        const errorMessage: ChatMessage = {
          id: messages.length + 2,
          role: "assistant", // or system
          content: "I'm sorry, I encountered an error processing your request.",
          timestamp: new Date().toLocaleTimeString(),
        }
        setMessages((prev) => [...prev, errorMessage])
      }

    } catch (e) {
      console.error("Chat request failed", e);
      const errorMessage: ChatMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: "I'm sorry, I encountered an connection error.",
        timestamp: new Date().toLocaleTimeString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    }

    setIsLoading(false)
  }

  return (
    <div className="flex flex-col space-y-8 h-[700px]">
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white tracking-tight">Legal Assistant Chat</h2>
          <p className="text-neutral-400">
            Ask questions about legal documents, clauses, policies, or get explanations on complex legal terms.
          </p>
          {uploadedFile && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 inline-flex items-center gap-2">
              <span className="text-xl">📄</span>
              <span className="text-cyan-400 text-sm">Active Document: {uploadedFile.name}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700 text-white">
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="hindi">Hindi (हिंदी)</SelectItem>
              <SelectItem value="kannada">Kannada (ಕನ್ನಡ)</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <button
              onClick={handleRiskScan}
              disabled={!uploadedFile}
              className={`p-2 rounded-full border transition-colors flex items-center gap-2 px-3 ${uploadedFile
                ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                : "bg-neutral-800 border-neutral-700 text-neutral-600 cursor-not-allowed"
                }`}
              title={uploadedFile ? "Analyze Risk Heatmap" : "Upload a file to scan risk"}
            >
              <ShieldAlert size={16} />
              <span className="text-xs font-bold uppercase hidden md:inline">Risk Scan</span>
            </button>
            <button
              onClick={handleSuggest}
              disabled={!uploadedFile}
              className={`p-2 rounded-full border transition-colors flex items-center gap-2 px-3 ${uploadedFile
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                : "bg-neutral-800 border-neutral-700 text-neutral-600 cursor-not-allowed"
                }`}
              title={uploadedFile ? "Get Safer Alternatives" : "Upload a file to get suggestions"}
            >
              <Lightbulb size={16} />
              <span className="text-xs font-bold uppercase hidden md:inline">Suggest</span>
            </button>
          </div>
        </div>
      </div>

      <Card className="bg-neutral-800/30 border-neutral-700/50 p-6 flex-1 overflow-hidden flex flex-col min-h-0">
        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              <p>Loading conversation...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="flex flex-col gap-1 max-w-2xl">
                  <div
                    id={`message-content-${message.id}`}
                    className={`px-4 py-3 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words ${message.role === "user"
                      ? "bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded-br-none"
                      : "bg-neutral-700 text-neutral-100 rounded-bl-none prose prose-invert max-w-none"
                      }`}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>

                    {message.role === 'assistant' && (
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => speakText(message.content)} className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white" title="Listen">
                          <Volume2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-xs text-neutral-500 px-2 ${message.role === "user" ? "text-right" : "text-left"}`}
                  >
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-neutral-700 text-neutral-100 px-4 py-3 rounded-lg rounded-bl-none">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <div
                      className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Card>

      <div className="p-4 bg-neutral-900 border-t border-neutral-800 rounded-xl">
        <form
          onSubmit={handleSend}
          className="flex gap-4 max-w-4xl mx-auto"
        >
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
          >
            {isRecording ? <MicOff /> : <Mic />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isRecording ? "Listening..." : "Ask your legal assistant..."}
            className="flex-1 bg-neutral-800 border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
            disabled={isLoading || isRecording}
          />
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isLoading || messages.filter(m => m.role === 'assistant').length <= 1}
            className="bg-neutral-800 border-neutral-700 text-white p-3 rounded-xl hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Summary as PDF"
          >
            <Download size={20} />
          </button>
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && !isRecording)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>

      <Dialog open={showRiskModal} onOpenChange={setShowRiskModal}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="text-red-500" />
              Risk Heatmap
            </DialogTitle>
          </DialogHeader>

          {isAnalyzingRisk ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-neutral-400">Analyzing document risks...</p>
            </div>
          ) : riskData ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-neutral-800" />
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent"
                      className={`${getRiskColor(riskData.riskScore)} transition-all duration-1000 ease-out`}
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * riskData.riskScore) / 100}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getRiskColor(riskData.riskScore)}`}>{riskData.riskScore}</span>
                    <span className="text-xs text-neutral-500 uppercase font-semibold">Risk Score</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold border-b border-neutral-800 pb-2">Risk Breakdown</h4>
                <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {riskData.risks?.map((item: any, idx: number) => (
                    <div key={idx} className="bg-neutral-800/50 p-4 rounded-lg border border-neutral-700/50 flex items-start gap-4">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${item.severity > 7 ? 'bg-red-500 box-shadow-red' :
                        item.severity > 4 ? 'bg-yellow-500' : 'bg-emerald-500'
                        }`} />
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium text-white">{item.category}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 ${item.severity > 7 ? 'text-red-400' :
                            item.severity > 4 ? 'text-yellow-400' : 'text-emerald-400'
                            }`}>{item.severity}/10</span>
                        </div>
                        <p className="text-sm text-neutral-400">{item.description}</p>
                        {item.impact && <p className="text-xs text-neutral-500 mt-1">Impact: {item.impact}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={showSuggestModal} onOpenChange={setShowSuggestModal}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="text-amber-400" />
              Safer Alternatives
            </DialogTitle>
          </DialogHeader>

          {isAnalyzingSuggest ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-neutral-400">Drafting safer clauses...</p>
            </div>
          ) : suggestionsData ? (
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 animate-in fade-in zoom-in-95 duration-300">
              <p className="text-neutral-400 text-sm">
                Here are some recommended modifications to better protect your interests.
              </p>
              {suggestionsData.suggestions?.map((item: any, idx: number) => (
                <div key={idx} className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 overflow-hidden">
                  <div className="p-4 border-b border-neutral-700/50">
                    <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-2">
                      <ShieldAlert size={14} />
                      Risky Clause detected
                    </h4>
                    <p className="text-sm text-red-300/80 bg-red-950/30 p-3 rounded border border-red-500/20 italic">
                      "{item.original}"
                    </p>
                  </div>

                  <div className="p-4 bg-gradient-to-b from-neutral-800/50 to-emerald-950/10">
                    <h4 className="font-semibold text-emerald-400 mb-1 flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Suggested Modification
                    </h4>
                    <div className="flex gap-3 items-start">
                      <ArrowRight className="text-emerald-500 mt-1 flex-shrink-0" size={16} />
                      <p className="text-sm text-emerald-100 font-medium">
                        "{item.proposed}"
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-neutral-500 ml-7">
                      <span className="font-semibold text-neutral-400">Why?</span> {item.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
