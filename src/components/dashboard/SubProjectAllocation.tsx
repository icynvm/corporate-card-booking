"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Trash2, 
    LayoutGrid, 
    Info, 
    ChevronRight,
    Loader2,
    DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SubProject {
    id: string;
    request_id: string;
    name: string;
    amount: number;
    created_at: string;
}

interface SubProjectAllocationProps {
    requestId: string;
    totalAmount: number;
    isApproved: boolean;
    addToast?: (message: string, type: "success" | "error") => void;
}

export default function SubProjectAllocation({ requestId, totalAmount, isApproved, addToast }: SubProjectAllocationProps) {
    const [subProjects, setSubProjects] = useState<SubProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [namesInput, setNamesInput] = useState("");
    const [suggestedNames, setSuggestedNames] = useState<string[]>([]);

    const fetchSubProjects = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`);
            if (res.ok) {
                const data = await res.json();
                setSubProjects(data.subProjects || []);
                if (data.subProjects && data.subProjects.length > 0) {
                    setNamesInput(data.subProjects.map((sp: SubProject) => sp.name).join(", "));
                } else {
                    setNamesInput("");
                }
            } else {
                setError("Failed to fetch sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error fetching sub-projects");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) {
            fetchSubProjects();
        }
    }, [requestId]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await fetch("/api/sub-projects");
                if (res.ok) {
                    const data = await res.json();
                    setSuggestedNames(data.names || []);
                }
            } catch (err) {
                console.error("Error fetching suggestions:", err);
            }
        };
        fetchSuggestions();
    }, []);

    const handleSave = async () => {
        if (!namesInput.trim()) {
            handleDeleteAll();
            return;
        }

        const names = namesInput.split(",").map(n => n.trim()).filter(n => n);
        if (names.length === 0) return;

        try {
            setSaving(true);
            setError(null);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ names, totalAmount })
            });

            if (res.ok) {
                await fetchSubProjects();
                addToast?.("Sub-projects allocated successfully!", "success");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error saving sub-projects");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to remove all sub-project allocations?")) return;

        try {
            setSaving(true);
            setError(null);
            const res = await fetch(`/api/requests/${requestId}/sub-projects`, {
                method: "DELETE"
            });

            if (res.ok) {
                setSubProjects([]);
                setNamesInput("");
                addToast?.("Allocations cleared successfully!", "success");
            } else {
                const data = await res.json();
                setError(data.error || "Failed to delete sub-projects");
            }
        } catch (err: any) {
            setError(err.message || "Error deleting sub-projects");
        } finally {
            setSaving(false);
        }
    };

    if (!isApproved) return null;

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-6 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30">Synching Ledger...</span>
            </div>
        );
    }

    return (
        <Card glass className="mt-8 border-none shadow-xl bg-gray-50/30 overflow-hidden">
            <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black shadow-lg text-[10px]">DIV</div>
                        <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Quantum Allocation</h4>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight opacity-50">Logical division of primary directive expenditure</p>
                        </div>
                    </div>
                </div>

                <div className="bg-brand-50/50 p-4 rounded-2xl flex items-start gap-4 border border-brand-100/50">
                    <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-brand-800/80 leading-relaxed uppercase tracking-tighter">
                        Divide the total requested quantum of <span className="font-black">฿{totalAmount.toLocaleString()}</span> into discrete logical sub-projects. The system will auto-allocate equal parity across all specified nodes.
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Input
                                placeholder="Alpha-Node, Beta-Element, Gamma-Sector..."
                                value={namesInput}
                                onChange={(e) => setNamesInput(e.target.value)}
                                className="h-12 rounded-2xl bg-white border-white focus:border-brand-200 transition-all font-bold text-xs pl-12"
                            />
                            <LayoutGrid className="absolute left-4 top-3.5 w-4 h-4 text-brand-500 opacity-40" />
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={saving} 
                            variant="brand" 
                            className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate"}
                        </Button>
                        {subProjects.length > 0 && (
                            <Button 
                                onClick={handleDeleteAll} 
                                disabled={saving} 
                                variant="ghost" 
                                size="icon"
                                className="h-12 w-12 rounded-2xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        )}
                    </div>

                    {suggestedNames.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30 self-center">Template Nodes:</span>
                            {suggestedNames.map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => {
                                        const current = namesInput.split(",").map(n => n.trim()).filter(Boolean);
                                        if (!current.includes(name)) {
                                            setNamesInput([...current, name].join(", "));
                                        }
                                    }}
                                    className="px-3 py-1 bg-white border border-gray-100 hover:border-brand-500 hover:bg-brand-50 text-gray-500 hover:text-brand-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300"
                                >
                                    + {name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <p className="text-[10px] font-black text-red-700 uppercase tracking-tighter">{error}</p>
                    </div>
                )}

                {subProjects.length > 0 && (
                    <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm animate-in zoom-in-95 duration-500">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-widest px-6">Allocation Node</TableHead>
                                    <TableHead className="h-10 text-[10px] font-black uppercase tracking-widest px-6 text-right">Computed Quantum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subProjects.map((sp) => (
                                    <TableRow key={sp.id} className="group hover:bg-brand-50/20 transition-colors">
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <ChevronRight className="w-3 h-3 text-brand-400 opacity-0 group-hover:opacity-100 transition-all -ml-6 group-hover:ml-0" />
                                                <span className="text-xs font-bold text-gray-900 uppercase tracking-tight">{sp.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-right">
                                            <span className="text-xs font-mono font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg">
                                                ฿{Number(sp.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-brand-50/30 hover:bg-brand-50/30 border-t-2 border-brand-100">
                                    <TableCell className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-brand-700">Consolidated Allocation</TableCell>
                                    <TableCell className="px-6 py-4 text-right">
                                        <Badge variant="brand" className="px-4 py-1.5 h-auto text-sm font-black rounded-xl shadow-lg shadow-brand/10">
                                            ฿{subProjects.reduce((sum, sp) => sum + Number(sp.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Internal AlertCircle for error state
function AlertCircle({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    );
}
