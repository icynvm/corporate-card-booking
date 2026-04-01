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

/* ── helpers ────────────────────────────────────────────────────────────────── */
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
                    prev.map((r) => (r.id === requestId ? { ...r, status: RequestStatus.CANCELLED } : r))
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

    return (
        <div className="space-y-8 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    My <span className="gradient-text">Requests</span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">View and manage your submitted requests</p>
            </div>

            {loading ? (
                <GlassCard className="text-center py-12">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin w-8 h-8 text-brand-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-gray-400 text-sm">Loading...</p>
                    </div>
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
                    {requests.map((request) => {
                        const isExpanded = expandedRequests.includes(request.id);
                        return (
                            <div key={request.id}>
                                <GlassCard hover={true} className="!p-0 overflow-hidden">
                                    {/* Main Row */}
                                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="font-mono text-xs font-bold text-brand-600">
                                                    {request.req_id || request.event_id}
                                                </span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_COLORS[request.status as RequestStatus] || "bg-gray-100 text-gray-600"}`}>
                                                    {STATUS_LABELS[request.status as RequestStatus] || request.status}
                                                </span>
                                                {request.approval_file_url && (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                                        Signed
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base mb-2 break-words">{request.project_name || "N/A"}</h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Objective</span>
                                                    <span className="text-sm text-gray-700 dark:text-gray-200 break-words line-clamp-2">{request.objective}</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400">Budget Breakdown</span>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-bold text-brand-600">THB {request.amount.toLocaleString()}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-brand-50 text-brand-600 rounded-md font-bold uppercase tracking-wider">
                                                            {getBillingLabel(request.billing_type)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3">
                                                <button
                                                    onClick={() => toggleExpand(request.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${isExpanded ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-gray-100 text-gray-600 border border-transparent"}`}
                                                >
                                                    {isExpanded ? "Collapse" : "Expand All Data"}
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap md:justify-end md:max-w-[280px]">
                                            {canEdit(request.status) && (
                                                <button
                                                    onClick={() => { setSelectedRequest(request); setEditModalOpen(true); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {canUploadSigned(request.status) && (
                                                <button
                                                    onClick={() => { setSelectedRequest(request); setSignedModalOpen(true); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 border border-purple-200"
                                                >
                                                    Upload Signed
                                                </button>
                                            )}
                                            {canSendEmail(request.status) && (
                                                <button
                                                    onClick={() => handleSendEmail(request.id)}
                                                    disabled={sendingEmails[request.id]}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 disabled:opacity-50"
                                                >
                                                    {sendingEmails[request.id] ? "Sending..." : "Send Email"}
                                                </button>
                                            )}
                                            {canUploadReceipt(request.status) && (
                                                <button
                                                    onClick={() => { setSelectedRequest(request); setReceiptModalOpen(true); }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"
                                                >
                                                    Upload Receipt
                                                </button>
                                            )}
                                            {canDownloadPDF(request.status) && (
                                                <button
                                                    onClick={() => handleDownloadPDF(request.id)}
                                                    disabled={downloadingPDFs[request.id]}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 border border-brand-200 disabled:opacity-50"
                                                >
                                                    PDF
                                                </button>
                                            )}
                                            {canCancel(request.status) && (
                                                <button
                                                    onClick={() => handleCancel(request.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-500 border border-red-200"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white px-4 sm:px-5 py-5 space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InfoCard title="My Contact Info">
                                                    <DetailGrid>
                                                        <DetailItem label="Name" value={request.full_name || request.profiles?.name} />
                                                        <DetailItem label="Department" value={request.department || request.profiles?.department} />
                                                        <DetailItem label="Email" value={request.email} />
                                                        <DetailItem label="Contact" value={request.contact_no} />
                                                    </DetailGrid>
                                                </InfoCard>
                                                <InfoCard title="Project Details">
                                                    <DetailGrid>
                                                        <DetailItem label="Project Name" value={request.project_name} />
                                                        <DetailItem label="Amount" value={`THB ${request.amount.toLocaleString()}`} />
                                                        <DetailItem label="Billing" value={getBillingLabel(request.billing_type)} />
                                                        <DetailItem label="Period" value={`${fmtDate(request.start_date)} - ${fmtDate(request.end_date)}`} />
                                                    </DetailGrid>
                                                </InfoCard>
                                            </div>
                                            <SubProjectAllocation
                                                requestId={request.id}
                                                totalAmount={request.amount}
                                                isApproved={request.status === RequestStatus.APPROVED}
                                                addToast={addToast}
                                            />
                                        </div>
                                    )}
                                </GlassCard>
                            </div>
                        );
                    })}
                </div>
            )}

            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => { setReceiptModalOpen(false); setSelectedRequest(null); fetchRequests(); }}
                request={selectedRequest}
            />
            <RequestEditModal
                isOpen={editModalOpen}
                onClose={() => { setEditModalOpen(false); setSelectedRequest(null); fetchRequests(); }}
                request={selectedRequest}
            />
            <SignedUploadModal
                isOpen={signedModalOpen}
                onClose={() => { setSignedModalOpen(false); setSelectedRequest(null); fetchRequests(); }}
                request={selectedRequest}
                onSuccess={fetchRequests}
            />
        </div>
    );
}
