"use client";

import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestRecord, STATUS_LABELS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";

export default function DashboardPage() {
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBilling, setFilterBilling] = useState("");
    const [filterProject, setFilterProject] = useState("");
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
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

    // Filtered data
    const filteredData = useMemo(() => {
        return requests.filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterBilling && r.billing_type !== filterBilling) return false;
            if (filterProject && r.project_name !== filterProject) return false;
            return true;
        });
    }, [requests, filterStatus, filterBilling, filterProject]);

    // KPI calculations
    const kpis = useMemo(() => {
        const totalSpent = requests
            .filter((r) => r.status === "APPROVED" || r.status === "COMPLETED")
            .reduce((sum, r) => sum + r.amount, 0);
        const pendingCount = requests.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "DRAFT").length;
        const monthlyCommitments = requests
            .filter((r) => (r.billing_type === "MONTHLY" || r.billing_type === "YEARLY_MONTHLY") && (r.status === "APPROVED" || r.status === "COMPLETED"))
            .reduce((sum, r) => sum + r.amount, 0);
        const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

        return { totalSpent, pendingCount, monthlyCommitments, approvedCount };
    }, [requests]);

    // Unique projects for filter
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

    const handleUploadSigned = async (request: RequestRecord) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.jpg,.jpeg,.png";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fetch(`/api/requests/${request.id}/upload-approval`, {
                    method: "POST",
                    body: formData,
                });
                if (res.ok) {
                    await fetchRequests(); // Refresh data to show changes
                    addToast("Signed file uploaded successfully!", "success");
                } else {
                    const data = await res.json();
                    addToast(data.error || "Upload failed", "error");
                }
            } catch (err: any) {
                console.error(err);
                addToast("Upload failed", "error");
            }
        };
        input.click();
    };

    return (
        <div className="space-y-8 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Dashboard
                </h1>
                <p className="text-sm text-gray-500">
                    Overview of your requests and spending
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard
                    title="Total Spent"
                    value={`THB ${kpis.totalSpent.toLocaleString()}`}
                    subtitle="Approved & Completed"
                    gradient="bg-gradient-to-br from-brand-500 to-purple-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    }
                />
                <KPICard
                    title="Pending Approval"
                    value={kpis.pendingCount}
                    subtitle="Awaiting review"
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    }
                />
                <KPICard
                    title="Monthly Commitments"
                    value={`THB ${kpis.monthlyCommitments.toLocaleString()}`}
                    subtitle="Active recurring"
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                        </svg>
                    }
                />
                <KPICard
                    title="Approved Requests"
                    value={kpis.approvedCount}
                    subtitle="Currently active"
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    }
                />
            </div>

            {/* Filters */}
            <div className="glass-card p-5">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Filters:</span>
                    </div>

                    <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="select-field w-auto min-w-[180px]"
                    >
                        <option value="">All Projects</option>
                        {projects.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select-field w-auto min-w-[150px]"
                    >
                        <option value="">All Statuses</option>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={filterBilling}
                        onChange={(e) => setFilterBilling(e.target.value)}
                        className="select-field w-auto min-w-[150px]"
                    >
                        <option value="">All Billing Types</option>
                        <option value="ONE_TIME">One-time</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="YEARLY_MONTHLY">Yearly (Monthly)</option>
                    </select>

                    {(filterStatus || filterBilling || filterProject) && (
                        <button
                            onClick={() => {
                                setFilterStatus("");
                                setFilterBilling("");
                                setFilterProject("");
                            }}
                            className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors"
                        >
                            Clear All โ•
                        </button>
                    )}
                </div>
            </div>

            {/* Requests Table */}
            {loading ? (
                <div className="glass-card p-12 text-center">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Loading requests...</p>
                </div>
            ) : (
                <RequestsTable data={filteredData} onUploadReceipt={handleUploadReceipt} onUploadSigned={handleUploadSigned} />
            )}

            {/* Receipt Upload Modal */}
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => {
                    setReceiptModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
            />
        </div>
    );
}
