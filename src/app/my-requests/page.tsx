"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { RequestRecord, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<RequestRecord[]>([]);
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

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch("/api/requests");
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
    }, []);

    const getBillingLabel = (type: string) => {
        switch (type) {
            case "ONE_TIME": return "One-time";
            case "MONTHLY": return "Monthly";
            case "YEARLY": return "Yearly";
            case "YEARLY_MONTHLY": return "Yearly (Monthly)";
            default: return type;
        }
    };

    const [downloadingPDFs, setDownloadingPDFs] = useState<Record<string, boolean>>({});
    const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});

    const handleDownloadPDF = async (requestId: string) => {
        setDownloadingPDFs(prev => ({ ...prev, [requestId]: true }));
        try {
            const res = await fetch(`/api/requests/${requestId}/pdf`);
            if (!res.ok) throw new Error("PDF download failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `card-request-${requestId.split("-")[0]}.pdf`; // Basic fallback
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            addToast("Failed to download PDF. Please try again.", "error");
        } finally {
            setDownloadingPDFs(prev => ({ ...prev, [requestId]: false }));
        }
    };

    const handleCancel = async (requestId: string) => {
        if (!confirm("Are you sure you want to cancel this request?")) return;
        try {
            const res = await fetch(`/api/requests/${requestId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
            });
            if (res.ok) {
                setRequests((prev) =>
                    prev.map((r) => (r.id === requestId ? { ...r, status: "CANCELLED" } : r))
                );
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to cancel", "error");
            }
        } catch {
            addToast("Failed to cancel request", "error");
        }
    };

    const handleUploadSigned = async (requestId: string) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".pdf,.jpg,.jpeg,.png";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fetch(`/api/requests/${requestId}/upload-approval`, {
                    method: "POST",
                    body: formData,
                });
                if (res.ok) {
                    const data = await res.json();
                    setRequests((prev) =>
                        prev.map((r) =>
                            r.id === requestId
                                ? { ...r, approval_file_url: data.url || "uploaded", status: "PENDING_APPROVAL" }
                                : r
                        )
                    );
                    addToast("Signed file uploaded successfully! Status changed to Pending Approval.", "success");
                } else {
                    const data = await res.json();
                    addToast(data.error || "Upload failed", "error");
                }
            } catch {
                addToast("Upload failed", "error");
            }
        };
        input.click();
    };

    const handleSendEmail = async (requestId: string) => {
        setSendingEmails((prev) => ({ ...prev, [requestId]: true }));
        try {
            const res = await fetch("/api/send-approval", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: requestId }),
            });
            if (!res.ok) throw new Error("Failed to send email");
            const data = await res.json();
            addToast(`Email sent to Manager (${data.sentTo}) successfully!`, "success");
        } catch {
            addToast("Failed to send email. Please try again.", "error");
        } finally {
            setSendingEmails((prev) => ({ ...prev, [requestId]: false }));
        }
    };

    const canCancel = (status: string) => {
        return ["DRAFT", "PENDING_APPROVAL"].includes(status);
    };

    const canDownloadPDF = (status: string) => {
        return status !== "CANCELLED";
    };

    const canUploadSigned = (status: string) => {
        return status === "PENDING_APPROVAL";
    };

    const canSendEmail = (status: string) => {
        return status === "PENDING_APPROVAL";
    };

    return (
        <div className="space-y-8 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    My <span className="gradient-text">Requests</span>
                </h1>
                <p className="text-sm text-gray-500">View and manage your submitted requests</p>
            </div>

            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Loading...</p>
                </GlassCard>
            ) : requests.length === 0 ? (
                <GlassCard className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <p className="text-gray-400 mb-4">No requests yet</p>
                    <Link href="/request-form" className="btn-primary inline-flex items-center gap-2">
                        Create New Request
                    </Link>
                </GlassCard>
            ) : (
                <div className="grid gap-4">
                    {requests.map((request) => (
                        <GlassCard key={request.id} hover className="!p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-xs font-bold text-brand-600">{request.event_id}</span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[request.status] || "bg-gray-100 text-gray-600"}`}>
                                            {STATUS_LABELS[request.status] || request.status}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-base mb-2">{request.objective}</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-4 p-3 bg-gray-50/50 rounded-xl border border-gray-100">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Project Detail</span>
                                            <span className="text-sm text-gray-700">{request.project_name || "N/A"}</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Budget Breakdown</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-brand-600">THB {request.amount.toLocaleString()}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded-md font-bold uppercase tracking-wider">
                                                    {getBillingLabel(request.billing_type)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-400">Activity Period</span>
                                            <span className="text-sm text-gray-600">
                                                {new Date(request.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} - {new Date(request.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </span>
                                        </div>

                                        {(request.effective_date || request.booking_date) && (
                                            <div className="flex flex-col gap-1 mt-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-400">Dates</span>
                                                <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                                                    {request.booking_date && <span>Booking: {new Date(request.booking_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                                                    {request.effective_date && <span className="text-brand-600 font-medium">Effective: {new Date(request.effective_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {request.status === "CANCELLED" && (
                                        <p className="text-xs text-gray-400 mt-2 italic">This request has been cancelled</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Upload Signed PDF */}
                                    {canUploadSigned(request.status) && (
                                        <button
                                            onClick={() => handleUploadSigned(request.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                            </svg>
                                            Upload Signed PDF
                                        </button>
                                    )}
                                    {/* Send Email */}
                                    {canSendEmail(request.status) && (
                                        <button
                                            onClick={() => handleSendEmail(request.id)}
                                            disabled={sendingEmails[request.id]}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                                        >
                                            {sendingEmails[request.id] ? (
                                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                    <polyline points="22,6 12,13 2,6" />
                                                </svg>
                                            )}
                                            {sendingEmails[request.id] ? "Sending..." : "Send Email"}
                                        </button>
                                    )}
                                    {/* Download PDF */}
                                    {canDownloadPDF(request.status) && (
                                        <button
                                            onClick={() => handleDownloadPDF(request.id)}
                                            disabled={downloadingPDFs[request.id]}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-colors disabled:opacity-50"
                                        >
                                            {downloadingPDFs[request.id] ? (
                                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                </svg>
                                            )}
                                            {downloadingPDFs[request.id] ? "Downloading..." : "Download PDF"}
                                        </button>
                                    )}
                                    {/* Cancel Button */}
                                    {canCancel(request.status) && (
                                        <button
                                            onClick={() => handleCancel(request.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="15" y1="9" x2="9" y2="15" />
                                                <line x1="9" y1="9" x2="15" y2="15" />
                                            </svg>
                                            Cancel
                                        </button>
                                    )}
                                    <div className="text-right text-xs text-gray-400">
                                        {new Date(request.created_at).toLocaleDateString("en-GB", {
                                            day: "2-digit", month: "short", year: "numeric",
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Sub-Project Allocation for approved requests */}
                            <SubProjectAllocation
                                requestId={request.id}
                                totalAmount={request.amount}
                                isApproved={request.status === 'APPROVED'}
                            />
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
