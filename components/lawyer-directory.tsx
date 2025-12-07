"use client";

import { useState } from "react";
import { Search, Scale, BookOpen, Clock, BadgeCheck, Mail, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CourtType = "Supreme Court" | "High Court" | "District Court" | "Tribunals";

interface Lawyer {
    id: string;
    title: string;
    name: string;
    designation: string;
    experience: string;
    casesSolved: number;
    education: string;
    court: CourtType;
    image: string;
    email: string;
}

const LAWYERS: Lawyer[] = [
    {
        id: "1",
        title: "Senior Advocate",
        name: "Rajesh Kumar",
        designation: "Constitutional & Civil Law Expert",
        experience: "Practicing since 1998",
        casesSolved: 450,
        education: "LL.M., Harvard Law School",
        court: "Supreme Court",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Rajesh&backgroundColor=b6e3f4",
        email: "chambers.rajesh@supremecourt.in"
    },
    {
        id: "2",
        title: "Advocate-on-Record",
        name: "Meera Reddy",
        designation: "Corporate Litigation Specialist",
        experience: "Practicing since 2005",
        casesSolved: 320,
        education: "LL.B., NALSAR Hyderabad",
        court: "Supreme Court",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Meera&backgroundColor=c0aede",
        email: "adv.meera.reddy@gmail.com"
    },
    {
        id: "3",
        title: "Senior Counsel",
        name: "Suresh Patel",
        designation: "Criminal Defense Attorney",
        experience: "Practicing since 2002",
        casesSolved: 210,
        court: "High Court",
        education: "LL.M., Delhi University",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Suresh&backgroundColor=ffdfbf",
        email: "suresh.patel.law@highcourt.in"
    },
    {
        id: "4",
        title: "Advocate",
        name: "Anjali Gupta",
        designation: "Intellectual Property Rights",
        experience: "Practicing since 2010",
        casesSolved: 150,
        education: "IP Law Diploma, NLSIU",
        court: "High Court",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Anjali&backgroundColor=ffdfbf",
        email: "chambers.anjali@legal.in"
    },
    {
        id: "5",
        title: "Advocate",
        name: "Vikram Singh",
        designation: "Family & Matrimonial Law",
        experience: "Practicing since 2012",
        casesSolved: 180,
        education: "LL.B., Pune University",
        court: "District Court",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Vikram&backgroundColor=b6e3f4",
        email: "vikram.singh.adv@gmail.com"
    },
    {
        id: "6",
        title: "Legal Consultant",
        name: "Sneha Deshmukh",
        designation: "Taxation & Finance Law",
        experience: "Practicing since 2015",
        casesSolved: 95,
        education: "CA & LL.B.",
        court: "Tribunals",
        image: "https://api.dicebear.com/7.x/miniavs/svg?seed=Sneha&backgroundColor=c0aede",
        email: "sneha.tax@consultant.com"
    }
];

export default function LawyerDirectory() {
    const [selectedCourt, setSelectedCourt] = useState<CourtType | "All">("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);

    const filteredLawyers = LAWYERS.filter(lawyer => {
        const matchesCourt = selectedCourt === "All" || lawyer.court === selectedCourt;
        const matchesSearch = lawyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lawyer.designation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCourt && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="border-b border-neutral-800 pb-6 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-wide flex items-center gap-3">
                        <Scale className="text-cyan-500" size={32} />
                        Learned Counsel Directory
                    </h2>
                    <p className="text-neutral-400 mt-2 font-light max-w-2xl text-lg">
                        Official directory of verified legal practitioners and senior advocates across the judiciary.
                    </p>
                </div>

                <div className="w-full md:w-72 relative group">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <Input
                            placeholder="Search by name or specialization..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-neutral-900/80 border-neutral-700 text-white focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 placeholder:text-neutral-500 rounded-lg shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Formal Pills) */}
            <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide border-b border-neutral-800/50">
                {(["All", "Supreme Court", "High Court", "District Court", "Tribunals"] as const).map((court) => (
                    <button
                        key={court}
                        onClick={() => setSelectedCourt(court)}
                        className={`px-6 py-2.5 rounded-md text-sm font-semibold tracking-wide uppercase transition-all duration-300 border ${selectedCourt === court
                            ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                            : "bg-transparent text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-neutral-200"
                            }`}
                    >
                        {court}
                    </button>
                ))}
            </div>

            {/* Directory Grid (Reference Style) */}
            <div className="grid grid-cols-1 gap-6">
                {filteredLawyers.map((lawyer) => (
                    <div
                        key={lawyer.id}
                        className="group relative bg-neutral-900/40 border border-neutral-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300 hover:bg-neutral-900/60"
                    >
                        {/* Decorative sidebar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500/0 via-cyan-500/50 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            {/* Profile Image (Formal Frame) */}
                            <div className="flex-shrink-0">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg border-4 border-neutral-800 bg-neutral-800 overflow-hidden shadow-2xl group-hover:border-neutral-700 transition-colors relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                    <img
                                        src={lawyer.image}
                                        alt={lawyer.name}
                                        className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-500"
                                    />
                                </div>
                            </div>

                            {/* Details Section */}
                            <div className="flex-1 space-y-4 w-full">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-cyan-500 font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1">
                                            <BadgeCheck size={12} /> {lawyer.title}
                                        </p>
                                        <h3 className="text-2xl md:text-3xl font-bold text-white group-hover:text-cyan-50 transition-colors">
                                            {lawyer.name}
                                        </h3>
                                        <p className="text-neutral-400 text-lg mt-1 font-light border-l-2 border-cyan-500/30 pl-3">
                                            {lawyer.designation}
                                        </p>
                                    </div>
                                    <div className="hidden md:block px-4 py-1.5 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs font-mono">
                                        {lawyer.court}
                                    </div>
                                </div>

                                {/* Stats / Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-neutral-800/50">
                                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                                        <Clock className="text-neutral-500" size={16} />
                                        <div>
                                            <p className="text-neutral-500 text-xs uppercase tracking-wider">Experience</p>
                                            <p>{lawyer.experience}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                                        <BookOpen className="text-neutral-500" size={16} />
                                        <div>
                                            <p className="text-neutral-500 text-xs uppercase tracking-wider">Education</p>
                                            <p>{lawyer.education}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                                        <Scale className="text-neutral-500" size={16} />
                                        <div>
                                            <p className="text-neutral-500 text-xs uppercase tracking-wider">Case Record</p>
                                            <p>{lawyer.casesSolved}+ Appearances</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="w-full md:w-auto flex md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-neutral-800 pt-4 md:pt-0 md:pl-6">
                                <Button
                                    onClick={() => setSelectedLawyer(lawyer)}
                                    className="w-full bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-900/20 whitespace-nowrap"
                                >
                                    View Profile
                                    <ChevronRight size={14} className="ml-2" />
                                </Button>
                                <Button variant="outline" className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                                    <Mail size={14} className="mr-2" /> Contact
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredLawyers.length === 0 && (
                <div className="text-center py-20 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
                    <p className="text-neutral-500 text-lg">No legal practitioners found matching these criteria.</p>
                </div>
            )}

            {/* Reference Footer */}
            <div className="text-center pt-8 pb-4 border-t border-neutral-800/50">
                <p className="text-neutral-600 text-sm">
                    Reference Style: <a href="https://www.sci.gov.in/chief-justice-judges/" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-400 hover:underline transition-colors">Supreme Court of India - Chief Justice & Judges</a>
                </p>
            </div>

            {/* Profile Detail Modal */}
            {selectedLawyer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedLawyer(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white transition-colors z-10"
                        >
                            <span className="sr-only">Close</span>
                            ✕
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-3">
                            {/* Sidebar / Photo Column */}
                            <div className="bg-neutral-950/50 p-8 border-r border-neutral-800 md:col-span-1 text-center md:text-left">
                                <div className="w-48 h-48 mx-auto md:w-full md:h-auto md:aspect-square rounded-xl overflow-hidden border-4 border-neutral-800 shadow-xl mb-6">
                                    <img src={selectedLawyer.image} alt={selectedLawyer.name} className="w-full h-full object-cover" />
                                </div>

                                <h2 className="text-2xl font-bold text-white mb-2">{selectedLawyer.name}</h2>
                                <p className="text-cyan-500 font-medium mb-4">{selectedLawyer.title}</p>

                                <div className="space-y-4 text-sm text-neutral-400">
                                    <div className="flex items-center gap-3">
                                        <Mail size={16} className="text-neutral-600" />
                                        <span className="truncate">{selectedLawyer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Scale size={16} className="text-neutral-600" />
                                        <span>{selectedLawyer.court}</span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-neutral-800">
                                    <Button className="w-full mb-3 bg-white text-black hover:bg-neutral-200">Book Appointment</Button>
                                    <Button variant="outline" className="w-full border-neutral-700 text-neutral-300">Download V-Card</Button>
                                </div>
                            </div>

                            {/* Main Content Column */}
                            <div className="p-8 md:col-span-2 space-y-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Professional Profile</h3>
                                    <p className="text-neutral-300 leading-relaxed">
                                        {selectedLawyer.title} {selectedLawyer.name} is a distinguished legal practitioner specializing in {selectedLawyer.designation}.
                                        With extensive experience {selectedLawyer.experience.toLowerCase()}, they have successfully represented clients in the {selectedLawyer.court} and various tribunals.
                                        Known for their strategic acumen and deep understanding of Constitutional law.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-neutral-800/20 p-4 rounded-lg border border-neutral-800">
                                        <h4 className="text-neutral-400 text-sm uppercase tracking-wide mb-1">Education</h4>
                                        <p className="text-white font-medium">{selectedLawyer.education}</p>
                                    </div>
                                    <div className="bg-neutral-800/20 p-4 rounded-lg border border-neutral-800">
                                        <h4 className="text-neutral-400 text-sm uppercase tracking-wide mb-1">Bar Admission</h4>
                                        <p className="text-white font-medium">Bar Council of India, 1998</p>
                                    </div>
                                    <div className="bg-neutral-800/20 p-4 rounded-lg border border-neutral-800">
                                        <h4 className="text-neutral-400 text-sm uppercase tracking-wide mb-1">Cases Argued</h4>
                                        <p className="text-white font-medium">{selectedLawyer.casesSolved}+ Reported Judgments</p>
                                    </div>
                                    <div className="bg-neutral-800/20 p-4 rounded-lg border border-neutral-800">
                                        <h4 className="text-neutral-400 text-sm uppercase tracking-wide mb-1">Chambers</h4>
                                        <p className="text-white font-medium">{selectedLawyer.court}, Block C</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4 border-b border-neutral-800 pb-2">Notable Areas of Practice</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {["Constitutional Law", "Corporate Litigation", "Arbitration", "White Collar Crime", "Civil Disputes"].map(tag => (
                                            <span key={tag} className="px-3 py-1 rounded-full bg-cyan-950/30 text-cyan-400 text-sm border border-cyan-500/20">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
