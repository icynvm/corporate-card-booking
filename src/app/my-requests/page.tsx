"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { InfoCard, DetailItem, DetailGrid } from "@/components/ui/DataDisplay";
import { RequestRecord, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { RequestStatus, BillingType } from "@/types/enums";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestEditModal } from "@/components/dashboard/RequestEditModal";
import { SignedUploadModal } from "@/components/dashboard/SignedUploadModal";

/* โ”€โ”€ helpers โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */
const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [signedModalOpen, setSignedModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
    const [expandedRequests, setExpandedRequests] = useState<string[]>([]);
    const [downloadingPDFs, setDownloadingPDFs] = useState<Record<string, boolean>>({});
    const [sendingEmails, setSendingEmails] = useState<Record<string, boolean>>({});
    const [toasts, setToasts] = useState<{ id: string; message: string; severity: AlertSeverity }[]>([]);

    const toggleExpand = (id: string) => {
        setExpandedRequests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

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
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

    const handleDownloadPDF = async (requestId: string) => {
        setDownloadingPDFs(prev => ({ ...prev, [requestId]: true }));
        try {
            const request = requests.find((r: RequestRecord) => r.id === requestId);
            if (!request) throw new Error("Request not found");

            const formData = {
                reqId: request.req_id || request.event_id || "",
                fullName: request.full_name || request.profiles?.name || "",
                department: request.department || request.profiles?.department || "",
                contactNo: request.contact_no || "",
                email: request.email || "",
                objective: request.objective || "",
                projectName: request.project_name || "",
                promotionalChannels: request.promotional_channels || [],
                bookingDate: request.booking_date,
                effectiveDate: request.effective_date,
                startDate: request.start_date,
                endDate: request.end_date,
                amount: request.amount,
                creditCardNo: request.credit_card_no,
                eventDetails: request.event_details || [],
            };

            const { generateRequestPdf } = await import("@/lib/pdf-generator");
            const pdfBytes = await generateRequestPdf(formData);

            // Use type assertion to satisfy TypeScript Blob format
            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            if (blob.size === 0) throw new Error("Generated PDF is empty");

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `card-request-${formData.reqId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("PDF download error:", err);
            addToast(err instanceof Error ? err.message : "Failed to download PDF. Please try again.", "error");
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
                addToast("Request cancelled successfully!", "success");
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to cancel", "error");
            }
        } catch {
            addToast("Failed to cancel request", "error");
        }
    };

    const handleUploadSigned = (request: RequestRecord) => {
        setSelectedRequest(request);
        setSignedModalOpen(true);
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

    const canCancel = (status: RequestStatus) => status === RequestStatus.DRAFT || status === RequestStatus.PENDING_APPROVAL;
    const canDownloadPDF = (status: RequestStatus) => status !== RequestStatus.CANCELLED;
    const canUploadSigned = (status: RequestStatus) => status === RequestStatus.PENDING_APPROVAL;
    const canSendEmail = (status: RequestStatus) => status === RequestStatus.PENDING_APPROVAL;
    const canUploadReceipt = (status: RequestStatus) => 
        [RequestStatus.APPROVED, RequestStatus.ACTIVE, RequestStatus.COMPLETED].includes(status);
    const canEdit = (status: RequestStatus) => status === RequestStatus.PENDING_APPROVAL;

    const handleUploadReceipt = (request: RequestRecord) => {
        setSelectedRequest(request);
        setReceiptModalOpen(true);
    };

    return (
        <div className="space-y-8 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    My <span className="gradient-text">Requests</span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">View and manage your submitted requests</p>
            </div>

            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Loading...</p>
                </GlassCard>
            ) : requests.length === 0 ? (
                <GlassCard className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">No requests yet</p>
                    <Link href="/request-form" className="btn-primary inline-flex items-center gap-2">
                        Create New Request
                    </Link>
                </GlassCard>
            ) : (
                <div className="grid gap-4">
                    {requests.map((request) => {
                        const isExpanded = expandedRequests.includes(request.id);
                        return (
                            <GlassCard key={request.id} hover className="!p-0 overflow-hidden">
                                {/* โ”€โ”€โ”€ Main Row โ”€โ”€โ”€ */}
                                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-brand-600">
                                                {request.req_id || request.event_id}
                                            </span>
                                            {request.event_id && (
                                                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    Event: {request.event_id}
                                                </span>
                                            )}
                                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[request.status] || "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300"}`}>
                                                {STATUS_LABELS[request.status] || request.status}
                                            </span>
                                            {request.approval_file_url && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                                    Signed
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-2 break-words">{request.project_name || "N/A"}</h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50/50 rounded-xl border border-gray-100">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Objective</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-200 break-words line-clamp-2 md:line-clamp-none">{request.objective}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Budget Breakdown</span>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-brand-600 whitespace-nowrap">THB {request.amount.toLocaleString()}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded-md font-bold uppercase tracking-wider whitespace-nowrap">
                                                        {getBillingLabel(request.billing_type)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {request.status === "CANCELLED" && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2 italic">This request has been cancelled</p>
                                        )}

                                        <div className="mt-3">
                                            <button
                                                onClick={() => toggleExpand(request.id)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${isExpanded ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-gray-100 dark:bg-gray-800/80/80 hover:bg-gray-200 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:text-gray-200 border border-transparent"}`}
                                            >
                                                {isExpanded ? "Collapse" : "Expand All Data"}
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="6 9 12 15 18 9"></polyline>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap md:justify-end md:max-w-[280px]">
                                        {/* Download Approved Signed File */}
                                        {request.status === "APPROVED" && request.approval_file_url && !request.approval_file_url.startsWith("data-ref:") && (
                                            <a
                                                href={request.approval_file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors w-full sm:w-auto justify-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                Approved File
                                            </a>
                                        )}

                                        {/* Edit Button */}
                                        {canEdit(request.status) && (
                                            <button
                                                onClick={() => { setSelectedRequest(request); setEditModalOpen(true); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                Edit
                                            </button>
                                        )}

                                        {/* Upload Signed PDF */}
                                        {canUploadSigned(request.status) && (
                                            <button
                                                onClick={() => handleUploadSigned(request)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                Upload Signed
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

                                        {/* Upload Receipt */}
                                        {canUploadReceipt(request.status) && (
                                            <button
                                                onClick={() => handleUploadReceipt(request)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors w-full sm:w-auto justify-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <polyline points="14 2 14 8 20 8" />
                                                    <line x1="12" y1="18" x2="12" y2="12" />
                                                    <line x1="9" y1="15" x2="12" y2="12" />
                                                    <line x1="15" y1="15" x2="12" y2="12" />
                                                </svg>
                                                Upload Receipt
                                            </button>
                                        )}

                                        {/* Download Generated Request PDF */}
                                        {canDownloadPDF(request.status) && (
                                            <button
                                                onClick={() => handleDownloadPDF(request.id)}
                                                disabled={downloadingPDFs[request.id]}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
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
                                                {downloadingPDFs[request.id] ? "Downloading..." : "Generated PDF"}
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

                                        <div className="text-right text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 w-full mt-1">
                                            Created: {fmtDate(request.created_at)}
                                        </div>
                                    </div>
                                </div>

                                {/* โ”€โ”€โ”€ Expanded Details โ”€โ”€โ”€ */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                                        <div className="p-4 sm:p-5 space-y-5">

                                            {/* Row 1: My Info + Project */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* My Info */}
                                                <InfoCard title="My Contact Info">
                                                    <div className="space-y-1">
                                                        <DetailItem label="Name" value={request.full_name || request.profiles?.name} />
                                                        <DetailItem label="Department" value={request.department || request.profiles?.department} />
                                                        <DetailItem label="Email" value={request.email} />
                                                        <DetailItem label="Contact" value={request.contact_no} />
                                                    </div>
                                                </InfoCard>
                                                
                                                {/* Project Details */}
                                                <InfoCard title="Project Details">
                                                    <div className="space-y-1">
                                                        <DetailItem label="Project Name" value={request.project_name} />
                                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                                            <DetailItem label="Amount" value={`THB ${request.amount?.toLocaleString()}`} horizontal={false} />
                                                            <DetailItem label="Billing" value={getBillingLabel(request.billing_type)} horizontal={false} />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                                            <DetailItem label="Start Date" value={fmtDate(request.start_date)} horizontal={false} />
                                                            <DetailItem label="End Date" value={fmtDate(request.end_date)} horizontal={false} />
                                                        </div>
                                                    </div>
                                                </InfoCard>
                                            </div>

                                            {/* Row 2: Objective */}
                                            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Objective</h4>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{request.objective || "No objective specified"}</p>
                                                </div>
                                            </div>

                                            {/* Row 3: Approval Notes (if any) */}
                                            {request.approval_notes && (
                                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                                                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Approval Notes from Admin</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{request.approval_notes}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 4: Promotional Channels */}
                                            {request.promotional_channels && request.promotional_channels.length > 0 && (
                                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Promotional Channels ({request.promotional_channels.length})</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {request.promotional_channels.map((chan: { channel: string; mediaAccountEmail: string; accessList: string }, idx: number) => (
                                                                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 text-xs">
                                                                    <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 flex justify-between items-center">
                                                                        <span className="break-words">{chan.channel}</span>
                                                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-normal flex-shrink-0 ml-2">#{idx + 1}</span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div>
                                                                            <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Account: </span>
                                                                            <span className="text-gray-700 dark:text-gray-200 font-medium break-all">{chan.mediaAccountEmail || "N/A"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Access: </span>
                                                                            <span className="text-gray-700 dark:text-gray-200 font-medium break-all">{chan.accessList || "N/A"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 5: Approval File Preview (If any file is attached, especially BEFORE approval or DURING) */}
                                            {request.approval_file_url && (
                                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Signed Approval Document</h4>
                                                    </div>
                                                    <div className="p-4 flex items-center gap-4 flex-wrap">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-purple-600 text-lg font-bold">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                                                            </span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words">
                                                                {request.approval_file_url.startsWith("data-ref:") ? request.approval_file_url.replace("data-ref:", "") : "Approval Document"}
                                                            </p>
                                                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Signed approval file attachment</p>
                                                        </div>
                                                        {!request.approval_file_url.startsWith("data-ref:") && (
                                                            <a
                                                                href={request.approval_file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
                                                            >
                                                                View / Download
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 6: Sub-Project Allocation */}
                                            <SubProjectAllocation
                                                requestId={request.id}
                                                totalAmount={request.amount}
                                                isApproved={request.status === "APPROVED"}
                                                addToast={addToast}
                                            />
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>
            )}

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
            <RequestEditModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
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
                    fetchRequests();
                }}
                request={selectedRequest}
                onSuccess={fetchRequests}
            />
        </div>
    );
}

