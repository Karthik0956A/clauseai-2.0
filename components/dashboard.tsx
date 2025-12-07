import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import DashboardHeader from "@/components/dashboard-header"
import DocumentUploader from "@/components/document-uploader"
import ChatInterface from "@/components/chat-interface"
import AgreementComparator from "@/components/agreement-comparator"
import LawyerDirectory from "@/components/lawyer-directory"
import RiskVisualization from "@/components/risk-visualization"
import ChatHistory from "@/components/chat-history"

interface DashboardProps {
  user: { email: string; name: string }
  onLogout: () => void
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat" | "documents" | "compare" | "lawyers" | "risk" | "history">("dashboard")
  const [uploadedFile, setUploadedFile] = useState<{ uri: string; mimeType: string; name: string } | null>(null)

  // Chat History State lifted up
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [riskData, setRiskData] = useState(null);
  const [analyzingRisk, setAnalyzingRisk] = useState(false);

  // Persistent Stats
  const [stats, setStats] = useState({
    documentsAnalyzed: 0,
    legalQueries: 0,
    savedTime: 0
  });

  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  // Load state from local storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.email) {
      const storageKey = `clauseai_dashboard_${user.email}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          if (parsed.uploadedFile) setUploadedFile(parsed.uploadedFile);
          if (parsed.riskData) setRiskData(parsed.riskData);
          if (parsed.selectedConversationId) setSelectedConversationId(parsed.selectedConversationId);
          if (parsed.stats) setStats(parsed.stats);

          // Optionally restore active tab if it's not dashboard
          if (parsed.activeTab && parsed.activeTab !== 'dashboard') {
            // We can restore it, or default to dashboard. Let's start with dashboard to be clean, 
            // but if they had a file open, maybe go to that?
            // For now, let's stick to default dashboard but show the "Resume" state data.
          }
        } catch (e) {
          console.error("Failed to load dashboard state", e);
        }
      }
      setIsStorageLoaded(true);
    }
  }, [user?.email]);

  // Save state to local storage whenever it changes
  useEffect(() => {
    if (!isStorageLoaded) return; // Prevent overwriting with initial state before load

    if (typeof window !== 'undefined' && user?.email) {
      const storageKey = `clauseai_dashboard_${user.email}`;
      const dataToSave = {
        uploadedFile,
        riskData,
        selectedConversationId,
        stats,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [uploadedFile, riskData, selectedConversationId, stats, user?.email, isStorageLoaded]);

  const analyzeRisk = async () => {
    if (!uploadedFile) return;
    setAnalyzingRisk(true);
    try {
      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: uploadedFile.uri, mimeType: uploadedFile.mimeType })
      });
      const data = await res.json();
      if (data.success) {
        setRiskData(data.data);
      }
    } catch (e) {
      console.error("Risk analysis failed", e);
    } finally {
      setAnalyzingRisk(false);
    }
  };

  const handleUploadComplete = (file: { uri: string; mimeType: string; name: string }) => {
    setUploadedFile(file)
    // Update stats
    setStats(prev => ({ ...prev, documentsAnalyzed: prev.documentsAnalyzed + 1 }));
    // Switch to chat after upload so user can talk about it
    setActiveTab("chat")
    setSelectedConversationId(null); // Start fresh chat with new file
  }

  const handleSelectChat = (id: string) => {
    setSelectedConversationId(id);
    setActiveTab("chat");
  }

  const handleLogout = () => {
    // We do NOT clear local storage here as per user request to keep data across logins
    // localStorage.removeItem(`clauseai_dashboard_${user.email}`); 
    onLogout();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <DashboardHeader user={user} onLogout={handleLogout} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Navigation tabs */}
        <div className="flex gap-2 mb-12 border-b border-neutral-800 overflow-x-auto">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "documents", label: "Upload Document", icon: "📄" },
            { id: "chat", label: "Chat", icon: "💬" },
            // { id: "history", label: "History", icon: "clock" }, // Hidden per user request
            { id: "compare", label: "Compare", icon: "🔄" },
            { id: "lawyers", label: "Lawyers", icon: "⚖️" },
            { id: "risk", label: "Risk Analysis", icon: "⚠️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'chat') setSelectedConversationId(null); // Reset if manually clicking chat tab? Or keep last open? Let's reset to "New Chat" logic usually expected.
              }}
              className={`px-5 py-3 font-medium text-sm transition-all duration-300 border-b-2 tracking-wide uppercase text-xs whitespace-nowrap ${activeTab === tab.id
                ? "text-white border-cyan-500 bg-gradient-to-r from-cyan-500/10 to-transparent"
                : "text-neutral-400 border-transparent hover:text-neutral-300 hover:border-neutral-700"
                }`}
            >
              <span className="mr-2">{tab.id === 'history' ? '🕰️' : tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "dashboard" && (
          <div className="space-y-12">
            {/* Hero section - Unity inspired */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold text-white tracking-tight font-sans">Welcome back, {user.name}</h1>
              <p className="text-lg text-neutral-400 max-w-3xl font-light leading-relaxed">
                Your AI-powered legal document analyzer. Upload, ask, understand, and act with confidence. Built for
                modern professionals.
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Documents Analyzed", value: stats.documentsAnalyzed.toString(), icon: "📄", trend: "up" },
                { label: "Legal Queries", value: "0", icon: "⚖️", trend: "up" }, // Queries count logic could be added to ChatInterface
                { label: "AI Tokens Used", value: "0", icon: "🔑", trend: "neutral" },
              ].map((stat) => (
                <Card
                  key={stat.label}
                  className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-neutral-700/50 p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
                      <p className="text-4xl font-bold text-white mt-3 font-sans">{stat.value}</p>
                    </div>
                    <span className="text-3xl">{stat.icon}</span>
                  </div>
                </Card>
              ))}
              {/* New Compare Card */}
              <Card
                className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-neutral-700/50 p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
                onClick={() => setActiveTab("compare")}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Feature</p>
                    <p className="text-4xl font-bold text-white mt-3 font-sans">Compare</p>
                  </div>
                  <span className="text-3xl">🔄</span> {/* Using an emoji for consistency */}
                </div>
                <p className="text-neutral-400 text-sm mt-2">Analyze differences between documents.</p>
              </Card>

              <Card
                className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-neutral-700/50 p-6 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
                onClick={() => setActiveTab("lawyers")}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Directory</p>
                    <p className="text-4xl font-bold text-white mt-3 font-sans">Experts</p>
                  </div>
                  <span className="text-3xl">⚖️</span>
                </div>
                <p className="text-neutral-400 text-sm mt-2">Find and connect with top legal minds.</p>
              </Card>

              <Card
                className="bg-gradient-to-br from-neutral-800/50 to-neutral-900/50 border-neutral-700/50 p-6 hover:border-red-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer"
                onClick={() => setActiveTab("risk")}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">Deep Dive</p>
                    <p className="text-4xl font-bold text-white mt-3 font-sans">Risks</p>
                  </div>
                  <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-neutral-400 text-sm mt-2">Visualize financial and legal liabilities.</p>
              </Card>
            </div>

            {/* Features section - inspired by Unity.com */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl font-bold text-white tracking-tight font-sans">Core Features</h2>
                <p className="text-neutral-400 mt-2 max-w-2xl">
                  Powerful tools designed to simplify your legal workflow
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "Simplify Legal Docs",
                    description:
                      "Upload contracts, policies, and terms of service. Get clear, plain-language summaries with risk analysis.",
                    icon: "📋",
                    color: "from-purple-600/20 to-purple-800/20",
                    borderColor: "border-purple-500/30",
                    hoverColor: "hover:border-purple-500/60",
                  },
                  {
                    title: "AI Legal Assistant",
                    description:
                      "Chat with our AI to understand complex legal clauses and get personalized guidance instantly.",
                    icon: "🤖",
                    color: "from-cyan-600/20 to-cyan-800/20",
                    borderColor: "border-cyan-500/30",
                    hoverColor: "hover:border-cyan-500/60",
                  },
                  {
                    title: "Policy Recommendations",
                    description:
                      "Get smart recommendations for insurance and financial products tailored to your needs and budget.",
                    icon: "💡",
                    color: "from-pink-600/20 to-pink-800/20",
                    borderColor: "border-pink-500/30",
                    hoverColor: "hover:border-pink-500/60",
                  },
                  {
                    title: "Risk Analysis",
                    description:
                      "Identify potential risks, one-sided clauses, and hidden terms in any legal agreement.",
                    icon: "⚠️",
                    color: "from-orange-600/20 to-orange-800/20",
                    borderColor: "border-orange-500/30",
                    hoverColor: "hover:border-orange-500/60",
                  },
                ].map((feature) => (
                  <Card
                    key={feature.title}
                    className={`bg-gradient-to-br ${feature.color} border ${feature.borderColor} p-8 ${feature.hoverColor} transition-all duration-300 cursor-pointer group hover:shadow-lg hover:shadow-current/10`}
                  >
                    <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 tracking-tight font-sans">{feature.title}</h3>
                    <p className="text-neutral-300 text-sm leading-relaxed">{feature.description}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* Call to action */}
            <div className="rounded-xl bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 p-10 text-center">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight font-sans">
                Ready to simplify legal documents?
              </h2>
              <p className="text-neutral-300 mb-8 max-w-2xl mx-auto font-light">
                Upload your first document or start a conversation with our AI assistant.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={() => setActiveTab("documents")}
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all duration-300 transform hover:scale-105 uppercase text-sm tracking-wide"
                >
                  Upload Document
                </button>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="px-8 py-3 bg-neutral-800 text-white font-semibold rounded-lg border border-neutral-700 hover:border-cyan-500/50 transition-all duration-300 uppercase text-sm tracking-wide"
                >
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "documents" && <DocumentUploader onUploadComplete={handleUploadComplete} />}

        {activeTab === "chat" && <ChatInterface uploadedFile={uploadedFile} initialConversationId={selectedConversationId} />}

        {/* {activeTab === "history" && <ChatHistory onSelectChat={handleSelectChat} />} */}

        {activeTab === "compare" && <AgreementComparator />}

        {activeTab === "lawyers" && <LawyerDirectory />}

        {activeTab === "risk" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center bg-neutral-900/50 p-6 rounded-xl border border-neutral-800">
              <div>
                <h2 className="text-2xl font-bold text-white">Risk Visualization Panel</h2>
                <p className="text-neutral-400">Deep dive into financial, legal, and operational risks.</p>
              </div>
              <button
                onClick={analyzeRisk}
                disabled={analyzingRisk || !uploadedFile}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {analyzingRisk ? "Analyzing..." : "Run Risk Assessment"}
              </button>
            </div>

            {!uploadedFile && (
              <div className="text-center py-20 bg-neutral-900/30 rounded-xl border border-dashed border-neutral-800">
                <p className="text-neutral-500">Please upload a document first to analyze risks.</p>
              </div>
            )}

            {uploadedFile && <RiskVisualization data={riskData} isLoading={analyzingRisk} />}
          </div>
        )}
      </main>
    </div>
  )
}
