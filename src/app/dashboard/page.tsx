"use client";

import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { SignedUploadModal } from "@/components/dashboard/SignedUploadModal";
import { RequestRecord, STATUS_LABELS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
    Filter, 
    RotateCcw, 
    Wallet, 
    Clock, 
    TrendingUp, 
    CheckCircle2, 
    Loader2,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBilling, setFilterBilling] = useState("");
    const [filterProject, setFilterProject] = useState("");
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [signedModalOpen, setSignedModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
    const [loading, setLoading] = useState(true);

    const [toasts, setToasts] = useState<{ id: string; message: string; severity: AlertSeverity }[]>([]);
    const addToast = (message: string, severity: AlertSeverity = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/requests");
            if (res.ok) {
                const data = await res.json();
                setRequests(data);
            }
        } catch {
            // No data
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const filteredData = useMemo(() => {
        return requests.filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterBilling && r.billing_type !== filterBilling) return false;
            if (filterProject && r.project_name !== filterProject) return false;
            return true;
        });
    }, [requests, filterStatus, filterBilling, filterProject]);

    const kpis = useMemo(() => {
        const totalSpent = requests
            .filter((r) => r.status === "APPROVED" || r.status === "COMPLETED" || r.status === "ACTIVE")
            .reduce((sum, r) => sum + r.amount, 0);
        const pendingCount = requests.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "PENDING").length;
        const monthlyCommitments = requests
            .filter((r) => (r.billing_type === "MONTHLY" || r.billing_type === "YEARLY_MONTHLY") && (r.status === "APPROVED" || r.status === "COMPLETED" || r.status === "ACTIVE"))
            .reduce((sum, r) => sum + r.amount, 0);
        const approvedCount = requests.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED" || r.status === "ACTIVE").length;

        return { totalSpent, pendingCount, monthlyCommitments, approvedCount };
    }, [requests]);

    const projects = useMemo(() => {
        const names = new Set<string>();
        requests.forEach((r) => {
            if (r.project_name) names.add(r.project_name);
        });
        return Array.from(names);
    }, [requests]);

    const handleUploadReceipt = (request: RequestRecord) => {
        setSelectedRequest(request);
        setReceiptModalOpen(true);
    };

    const handleUploadSigned = (request: RequestRecord) => {
        setSelectedRequest(request);
        setSignedModalOpen(true);
    };

    return (
        <div className="space-y-10 pb-20 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Insights <span className="gradient-text">Overview</span>
                    </h1>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                        Institutional Expenditure & Request Analytics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="brand" className="rounded-xl shadow-lg shadow-brand/20 h-11 px-6 font-black uppercase tracking-widest text-[10px]">
                        Corporate Analytics
                    </Button>
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Gross Allocation"
                    value={`฿${kpis.totalSpent.toLocaleString()}`}
                    subtitle="Certified & Completed"
                    gradient="bg-gradient-to-br from-brand-500 to-indigo-600"
                    icon={<Wallet className="w-5 h-5" />}
                    trend={{ value: "+12.5%", positive: true }}
                />
                <KPICard
                    title="Awaiting Review"
                    value={kpis.pendingCount}
                    subtitle="Queue depth"
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    icon={<Clock className="w-5 h-5" />}
                />
                <KPICard
                    title="Monthly Velocity"
                    value={`฿${kpis.monthlyCommitments.toLocaleString()}`}
                    subtitle="Operational recurring"
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                    icon={<TrendingUp className="w-5 h-5" />}
                    trend={{ value: "Steady", positive: true }}
                />
                <KPICard
                    title="Active Directives"
                    value={kpis.approvedCount}
                    subtitle="Current execution"
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                    icon={<CheckCircle2 className="w-5 h-5" />}
                />
            </div>

            {/* Global Filters */}
            <Card glass className="border-none shadow-xl bg-white/40 backdrop-blur-md">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex items-center gap-3 px-3 py-2 bg-white/60 rounded-xl border border-white/50 shadow-sm">
                            <Filter className="w-4 h-4 text-brand-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Global Filtering</span>
                        </div>

                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select value={filterProject} onValueChange={setFilterProject}>
                                <SelectTrigger className="h-11 rounded-xl bg-white/80 border-gray-100 font-bold text-xs">
                                    <div className="flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 opacity-30" />
                                        <SelectValue placeholder="All Project Scopes" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100">
                                    <SelectItem value="ALL" className="text-xs font-bold">All Project Scopes</SelectItem>
                                    {projects.map((name) => (
                                        <SelectItem key={name} value={name} className="text-xs font-medium">{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger className="h-11 rounded-xl bg-white/80 border-gray-100 font-bold text-xs">
                                    <SelectValue placeholder="Unified Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100">
                                    <SelectItem value="ALL" className="text-xs font-bold">All Unified States</SelectItem>
                                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key} className="text-xs font-medium">{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={filterBilling} onValueChange={setFilterBilling}>
                                <SelectTrigger className="h-11 rounded-xl bg-white/80 border-gray-100 font-bold text-xs">
                                    <SelectValue placeholder="Expenditure Model" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100">
                                    <SelectItem value="ALL" className="text-xs font-bold">All Expenditure Models</SelectItem>
                                    <SelectItem value="ONE_TIME" className="text-xs font-medium">One-time Injection</SelectItem>
                                    <SelectItem value="MONTHLY" className="text-xs font-medium">Monthly Recurrence</SelectItem>
                                    <SelectItem value="YEARLY" className="text-xs font-medium">Annual Cycle</SelectItem>
                                    <SelectItem value="YEARLY_MONTHLY" className="text-xs font-medium">Annual (Hybrid)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(filterStatus && filterStatus !== "ALL" || filterBilling && filterBilling !== "ALL" || filterProject && filterProject !== "ALL") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setFilterStatus("ALL");
                                    setFilterBilling("ALL");
                                    setFilterProject("ALL");
                                }}
                                className="h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-50 gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Results Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest flex items-center gap-3">
                        <div className="w-2 h-6 bg-brand-500 rounded-full" />
                        Historical Ledger
                    </h2>
                    <Badge variant="outline" className="px-3 py-1 font-black uppercase tracking-widest text-[9px] bg-white border-gray-100 text-muted-foreground">
                        {filteredData.length} Records found
                    </Badge>
                </div>

                {loading ? (
                    <Card glass className="border-none shadow-xl py-24 text-center">
                        <Loader2 className="animate-spin w-10 h-10 text-brand-500 mx-auto mb-4 opacity-50" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Synching with database...</p>
                    </Card>
                ) : (
                    <RequestsTable 
                        data={filteredData.filter(r => {
                            // Secondary mapping for "ALL" selection
                            const s = filterStatus === "ALL" ? "" : filterStatus;
                            const b = filterBilling === "ALL" ? "" : filterBilling;
                            const p = filterProject === "ALL" ? "" : filterProject;
                            
                            if (s && r.status !== s) return false;
                            if (b && r.billing_type !== b) return false;
                            if (p && r.project_name !== p) return false;
                            return true;
                        })} 
                        onUploadReceipt={handleUploadReceipt} 
                        onUploadSigned={handleUploadSigned} 
                    />
                )}
            </div>

            {/* Modals */}
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => {
                    setReceiptModalOpen(false);
                    setSelectedRequest(null);
                    fetchRequests();
                }}
                request={selectedRequest}
            />

            <SignedUploadModal
                isOpen={signedModalOpen}
                onClose={() => {
                    setSignedModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
                onSuccess={() => {
                    fetchRequests();
                    addToast("Signed authorization recorded successfully.", "success");
                }}
            />
        </div>
    );
}

// Internal Badge for results count (using simple implementation if shadcn Badge not found in standard place)
function Badge({ children, variant = "default", className }: { children: React.ReactNode, variant?: string, className?: string }) {
    const variants: Record<string, string> = {
        default: "bg-brand-500 text-white",
        outline: "border border-gray-200 text-gray-500 bg-transparent",
        success: "bg-emerald-500 text-white",
        warning: "bg-amber-500 text-white",
        destructive: "bg-red-500 text-white"
    };

    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors", variants[variant], className)}>
            {children}
        </span>
    );
}
