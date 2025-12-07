"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Card } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, TrendingUp, ShieldAlert } from "lucide-react";

interface RiskItem {
    category: "Financial Consequence" | "Legal Penalties" | "Loss of Rights" | "Time-based Obligations";
    severity: number; // 0-10
    text: string;
    description: string;
    impact: string;
}

interface RiskData {
    riskScore: number;
    risks: RiskItem[];
}

interface RiskVisualizationProps {
    data: RiskData | null;
    isLoading: boolean;
}

const COLORS = {
    "Financial Consequence": "#ef4444", // Red
    "Legal Penalties": "#f97316",       // Orange
    "Loss of Rights": "#a855f7",        // Purple
    "Time-based Obligations": "#3b82f6" // Blue
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-neutral-900 border border-neutral-700 p-4 rounded-lg shadow-xl max-w-sm z-50">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill || COLORS[data.category as keyof typeof COLORS] }} />
                    {data.category}
                </h4>
                <div className="space-y-2 text-sm">
                    <p className="text-neutral-300"><span className="text-neutral-500 text-xs uppercase font-bold">Clause:</span> "{data.text}"</p>
                    <p className="text-white"><span className="text-neutral-500 text-xs uppercase font-bold">Risk:</span> {data.description}</p>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800 mt-2">
                        <span className="text-neutral-400 text-xs">Impact: {data.impact}</span>
                        <span className="text-neutral-400 text-xs font-bold">Severity: {data.severity}/10</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export default function RiskVisualization({ data, isLoading }: RiskVisualizationProps) {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    <p className="text-neutral-400 text-sm">Analyzing Contract Risks...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Process data for charts
    const categoryData = useMemo(() => {
        // Aggregate severity by category
        const counts: Record<string, { count: number; totalSeverity: number; items: any[] }> = {
            "Financial Consequence": { count: 0, totalSeverity: 0, items: [] },
            "Legal Penalties": { count: 0, totalSeverity: 0, items: [] },
            "Loss of Rights": { count: 0, totalSeverity: 0, items: [] },
            "Time-based Obligations": { count: 0, totalSeverity: 0, items: [] }
        };

        data.risks.forEach(risk => {
            if (counts[risk.category]) {
                counts[risk.category].count += 1;
                counts[risk.category].totalSeverity += risk.severity;
                counts[risk.category].items.push(risk);
            }
        });

        return Object.entries(counts).map(([name, val]) => ({
            name,
            avgSeverity: val.count > 0 ? (val.totalSeverity / val.count).toFixed(1) : 0,
            count: val.count,
            fill: COLORS[name as keyof typeof COLORS]
        }));

    }, [data]);


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 bg-neutral-900/50 border-neutral-800 flex items-center gap-4">
                    <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <p className="text-neutral-500 text-xs uppercase font-bold">Overall Risk Score</p>
                        <p className={`text-2xl font-bold ${data.riskScore > 70 ? "text-red-500" : data.riskScore > 40 ? "text-amber-500" : "text-emerald-500"}`}>
                            {data.riskScore}/100
                        </p>
                    </div>
                </Card>
                <Card className="p-6 bg-neutral-900/50 border-neutral-800 flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-neutral-500 text-xs uppercase font-bold">Total Risky Clauses</p>
                        <p className="text-2xl font-bold text-white">{data.risks.length}</p>
                    </div>
                </Card>

                <Card className="col-span-2 p-6 bg-neutral-900/50 border-neutral-800 flex items-center justify-between">
                    <div>
                        <p className="text-neutral-500 text-xs uppercase font-bold mb-1">Highest Risk Category</p>
                        <p className="text-xl font-bold text-white">
                            {categoryData.sort((a, b) => Number(b.avgSeverity) - Number(a.avgSeverity))[0]?.name || "None"}
                        </p>
                    </div>
                    <TrendingUp className="text-neutral-600" />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Bar Chart: Severity Scatter/Bar */}
                <Card className="p-6 bg-neutral-900/50 border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-6">Risk Severity Distributon</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.risks}>
                                <XAxis dataKey="category" tick={false} axisLine={false} />
                                <YAxis domain={[0, 10]} stroke="#525252" label={{ value: 'Severity (0-10)', angle: -90, position: 'insideLeft', fill: '#737373' }} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="severity" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                    {data.risks.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[entry.category] || "#fff"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 justify-center mt-4 flex-wrap">
                        {Object.entries(COLORS).map(([name, color]) => (
                            <div key={name} className="flex items-center gap-2 text-xs text-neutral-400">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                {name}
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Pie Chart: Category Breakdown */}
                <Card className="p-6 bg-neutral-900/50 border-neutral-800">
                    <h3 className="text-lg font-bold text-white mb-6">Risk Category Breakdown</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="count"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(0,0,0,0.5)" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center text-sm text-neutral-500 mt-4">
                        Breakdown by number of clauses found per category
                    </div>
                </Card>
            </div>

        </div>
    );
}
