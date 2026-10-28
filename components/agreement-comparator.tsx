
"use client"

import { useState } from "react"
import { Upload, ArrowRight, AlertTriangle, CheckCircle, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ComparisonResult {
    clauses: {
        title: string;
        contentA: string;
        contentB: string;
        difference: string;
        riskLevel: "High" | "Medium" | "Low";
        riskAnalysis: string;
    }[]
}

export default function AgreementComparator() {
    const [fileA, setFileA] = useState<File | null>(null)
    const [fileB, setFileB] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<ComparisonResult | null>(null)

    const handleCompare = async () => {
        if (!fileA || !fileB) return;
        setIsLoading(true);
        setResult(null);

        const formData = new FormData();
        formData.append("fileA", fileA);
        formData.append("fileB", fileB);

        try {
            const res = await fetch("/api/compare", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                setResult(data.data);
            } else {
                console.error(data.error);
                alert("Comparison failed: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Comparison failed due to network error.");
        }
        setIsLoading(false);
    };

    const getRiskColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'high': return 'text-red-400 bg-red-500/10 border-red-500/50';
            case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/50';
            case 'low': return 'text-green-400 bg-green-500/10 border-green-500/50';
            default: return 'text-neutral-400';
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">Agreement Comparator</h2>
                <p className="text-neutral-400">
                    Upload two versions of an agreement to highlight differences and analyze risks.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Upload A */}
                <Card className={`p-8 border-2 border-dashed ${fileA ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-neutral-700 bg-neutral-800/30'} flex flex-col items-center justify-center gap-4 transition-all hover:border-cyan-500/30 relative h-64`}>
                    <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setFileA(e.target.files?.[0] || null)}
                    />
                    {fileA ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                                <FileText size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium truncate max-w-[200px]">{fileA.name}</p>
                                <p className="text-sm text-cyan-400">Agreement A (Private/Old)</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400">
                                <Upload size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Upload Agreement A</p>
                                <p className="text-sm text-neutral-500">Drag & drop or click</p>
                            </div>
                        </>
                    )}
                </Card>

                {/* Upload B */}
                <Card className={`p-8 border-2 border-dashed ${fileB ? 'border-purple-500/50 bg-purple-500/5' : 'border-neutral-700 bg-neutral-800/30'} flex flex-col items-center justify-center gap-4 transition-all hover:border-purple-500/30 relative h-64`}>
                    <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => setFileB(e.target.files?.[0] || null)}
                    />
                    {fileB ? (
                        <>
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                <FileText size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium truncate max-w-[200px]">{fileB.name}</p>
                                <p className="text-sm text-purple-400">Agreement B (Counterparty/New)</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400">
                                <Upload size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">Upload Agreement B</p>
                                <p className="text-sm text-neutral-500">Drag & drop or click</p>
                            </div>
                        </>
                    )}
                </Card>
            </div>

            <div className="flex justify-center">
                <Button
                    onClick={handleCompare}
                    disabled={!fileA || !fileB || isLoading}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 px-8 py-6 text-lg rounded-full hover:scale-105 transition-transform disabled:opacity-50"
                >
                    {isLoading ? "Analyzing..." : "Compare Agreements"}
                </Button>
            </div>

            {/* Results */}
            {result && result.clauses && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-10 duration-700">
                    <h3 className="text-2xl font-semibold text-white">Comparison Analysis</h3>
                    {result.clauses.map((clause, idx) => (
                        <Card key={idx} className="bg-neutral-800/50 border-neutral-700 overflow-hidden">
                            <div className="p-4 border-b border-neutral-700 bg-neutral-900/50 flex justify-between items-center">
                                <h4 className="text-lg font-medium text-white">{clause.title}</h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRiskColor(clause.riskLevel)}`}>
                                    {clause.riskLevel} Risk
                                </span>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                                    <p className="text-xs text-red-400 mb-2 font-bold uppercase tracking-wider">Agreement A</p>
                                    <p className="text-neutral-300 text-sm whitespace-pre-line">{clause.contentA || "(Clause missing)"}</p>
                                </div>
                                <div className="bg-green-500/5 p-4 rounded-lg border border-green-500/10">
                                    <p className="text-xs text-green-400 mb-2 font-bold uppercase tracking-wider">Agreement B</p>
                                    <p className="text-neutral-300 text-sm whitespace-pre-line">{clause.contentB || "(Clause missing)"}</p>
                                </div>
                            </div>
                            <div className="px-6 pb-6 pt-2">
                                <div className="bg-neutral-900/80 p-4 rounded-lg border border-neutral-700">
                                    <div className="flex gap-2 items-start mb-2">
                                        <AlertTriangle size={16} className={getRiskColor(clause.riskLevel).split(' ')[0]} />
                                        <p className="text-sm font-semibold text-white">Analysis & Risk</p>
                                    </div>
                                    <p className="text-neutral-400 text-sm">{clause.difference}</p>
                                    <div className="mt-2 text-xs text-neutral-500 italic">
                                        "{clause.riskAnalysis}"
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

        </div>
    )
}
