"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { RequestRecord, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestEditModal } from "@/components/dashboard/RequestEditModal";
import { SignedUploadModal } from "@/components/dashboard/SignedUploadModal";

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function RequestViewPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const requestId = params.id;

    const [request, setRequest] = useState<RequestRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [signedModalOpen, setSignedModalOpen] = useState(false);
    const [downloadingPDF, setDownloadingPDF] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [toasts, setToasts] = useState<{ id: string; message: string; severity: AlertSeverity }[]>([]);

    const addToast = (message: string, severity: AlertSeverity = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const fetchRequest = async () => {
        try {
            const res = await fetch(`/api/requests/${requestId}`);
            if (res.ok) {
                const data = await res.json();
                setRequest(data);
            } else if (res.status === 404 || res.status === 403) {
                router.push("/");
            }
        } catch {
            addToast("Failed to load request.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) fetchRequest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    if(loading) {
        return (
            <div className="space-y-8 relative max-w-5xl mx-auto">
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Loading request details...</p>
                </GlassCard>
            </div>
        )
    }

    if(!request) return null;

    const getBillingLabel = (type: string) => {
        switch (type) {
            case "ONE_TIME": return "One-time";
            case "MONTHLY": return "Monthly";
            case "YEARLY": return "Yearly";
            case "YEARLY_MONTHLY": return "Yearly (Monthly)";
            default: return type;
        }
    };

    const handleDownloadPDF = async () => {
        setDownloadingPDF(true);
        try {
            const formData = {
                eventId: request.event_id,
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
            };

            const { generateRequestPdf } = await import("@/lib/pdf-generator");
            const pdfBytes = await generateRequestPdf(formData);

            const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
            if (blob.size === 0) throw new Error("Generated PDF is empty");

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `card-request-${formData.eventId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("PDF download error:", err);
            addToast(err instanceof Error ? err.message : "Failed to download PDF.", "error");
        } finally {
            setDownloadingPDF(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this request?")) return;
        try {
            const res = await fetch(`/api/requests/${requestId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "CANCELLED" }),
            });
            if (res.ok) {
                setRequest((prev) => prev ? { ...prev, status: "CANCELLED" } : null);
                addToast("Request cancelled successfully!", "success");
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to cancel", "error");
            }
        } catch {
            addToast("Failed to cancel request", "error");
        }
    };

    const handleSendEmail = async () => {
        setSendingEmail(true);
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
            addToast("Failed to send email.", "error");
        } finally {
            setSendingEmail(false);
        }
    };

    const canCancel = request.status === "DRAFT" || request.status === "PENDING_APPROVAL";
    const canDownloadPDF = request.status !== "CANCELLED";
    const canUploadSigned = request.status === "PENDING_APPROVAL";
    const canSendEmail = request.status === "PENDING_APPROVAL";
    const canUploadReceipt = ["APPROVED", "ACTIVE", "COMPLETED"].includes(request.status);
    const canEdit = request.status === "PENDING_APPROVAL";

    return (
        <div className="space-y-6 relative max-w-5xl mx-auto pb-10">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Request <span className="gradient-text">{request.event_id}</span>
                    </h1>
                </div>
            </div>

            <GlassCard className="!p-0 overflow-hidden shadow-sm">
                {/* ─── Header & Actions ─── */}
                <div className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-5 bg-white">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[request.status] || "bg-gray-100 text-gray-600"}`}>
                                {STATUS_LABELS[request.status] || request.status}
                            </span>
                            {request.status === "APPROVED" && request.approval_file_url && (
                                <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                    Signed Document
                                </span>
                            )}
                            <span className="text-sm font-bold text-brand-600 px-3 py-1 bg-brand-50 rounded-full border border-brand-100">
                                THB {request.amount?.toLocaleString()}
                            </span>
                            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider px-2 border-l border-gray-200">
                                {getBillingLabel(request.billing_type)}
                            </span>
                        </div>
                        
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1 truncate">{request.project_name || "No Project Attached"}</p>
                            <h3 className="font-bold text-gray-800 text-xl break-words">{request.objective}</h3>
                        </div>

                        {request.status === "CANCELLED" && (
                            <p className="text-xs text-red-400 italic">This request has been cancelled and is no longer active.</p>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap md:justify-end md:max-w-[320px]">
                        {/* Download Approved Signed File */}
                        {request.status === "APPROVED" && request.approval_file_url && !request.approval_file_url.startsWith("data-ref:") && (
                            <a
                                href={request.approval_file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors w-full sm:w-auto justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Approved File
                            </a>
                        )}

                        {/* Edit Button */}
                        {canEdit && (
                            <button
                                onClick={() => setEditModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                Edit
                            </button>
                        )}

                        {/* Upload Signed PDF */}
                        {canUploadSigned && (
                            <button
                                onClick={() => setSignedModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload Signed
                            </button>
                        )}
                        
                        {/* Send Email */}
                        {canSendEmail && (
                            <button
                                onClick={handleSendEmail}
                                disabled={sendingEmail}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                            >
                                {sendingEmail ? "Sending..." : "Send Email"}
                            </button>
                        )}
                        
                        {/* Upload Receipt */}
                        {canUploadReceipt && (
                            <button
                                onClick={() => setReceiptModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors w-full sm:w-auto justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="12" y2="12" /><line x1="15" y1="15" x2="12" y2="12" /></svg>
                                Upload Receipt
                            </button>
                        )}

                        {/* Download Generated Request PDF */}
                        {canDownloadPDF && (
                            <button
                                onClick={handleDownloadPDF}
                                disabled={downloadingPDF}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-colors disabled:opacity-50 w-full sm:w-auto justify-center"
                            >
                                {downloadingPDF ? "Downloading..." : "Generated PDF"}
                            </button>
                        )}
                        
                        {/* Cancel Button */}
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── Detailed Info section ─── */}
                <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                    <div className="p-5 space-y-5">
                        
                        {/* Row 1: My Info + Project */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* My Info */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requester Information</h4>
                                </div>
                                <div className="p-5 space-y-3 text-sm">
                                    <div className="flex flex-wrap justify-between gap-1">
                                        <span className="text-gray-400 text-xs">Name</span>
                                        <span className="font-medium text-gray-800 text-sm break-all text-right">{request.full_name || request.profiles?.name || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-wrap justify-between gap-1">
                                        <span className="text-gray-400 text-xs">Department</span>
                                        <span className="font-medium text-gray-800 text-sm break-all text-right">{request.department || request.profiles?.department || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-wrap justify-between gap-1">
                                        <span className="text-gray-400 text-xs">Email</span>
                                        <span className="font-medium text-gray-800 text-sm break-all text-right">{request.email || "N/A"}</span>
                                    </div>
                                    <div className="flex flex-wrap justify-between gap-1">
                                        <span className="text-gray-400 text-xs">Contact</span>
                                        <span className="font-medium text-gray-800 text-sm break-all text-right">{request.contact_no || "N/A"}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Project Details */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Timeline Mapping</h4>
                                </div>
                                <div className="p-5 space-y-3 text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-gray-400 text-xs block mb-1">Start Date</span>
                                            <p className="font-semibold text-gray-800 text-sm">{fmtDate(request.start_date)}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 text-xs block mb-1">End Date</span>
                                            <p className="font-semibold text-gray-800 text-sm">{fmtDate(request.end_date)}</p>
                                        </div>
                                    </div>
                                    {(request.booking_date || request.effective_date) && (
                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                            <div>
                                                <span className="text-gray-400 text-xs block mb-1">Booking Date</span>
                                                <p className="font-semibold text-gray-800 text-sm">{fmtDate(request.booking_date)}</p>
                                            </div>
                                            <div>
                                                <span className="text-brand-500 font-medium text-xs block mb-1">Effective Date</span>
                                                <p className="font-semibold text-gray-800 text-sm">{fmtDate(request.effective_date)}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Approval Notes (if any) */}
                        {request.approval_notes && (
                            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Admin Notes</h4>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">{request.approval_notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Promotional Channels */}
                        {request.promotional_channels && request.promotional_channels.length > 0 && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Promotional Channels</h4>
                                </div>
                                <div className="p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {request.promotional_channels.map((chan: { channel: string; mediaAccountEmail: string; accessList: string }, idx: number) => (
                                            <div key={idx} className="bg-gray-50/80 p-4 rounded-xl border border-gray-100 shadow-sm text-xs transition-colors hover:bg-gray-50">
                                                <div className="font-bold text-brand-600 text-sm mb-2 pb-2 border-b border-gray-200 flex justify-between items-center">
                                                    <span className="break-words">{chan.channel}</span>
                                                    <span className="px-2 py-0.5 bg-brand-50 rounded-md text-[10px] text-brand-500 flex-shrink-0">#{idx + 1}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <span className="text-gray-400 uppercase text-[10px] block font-semibold tracking-wider">Account</span>
                                                        <span className="text-gray-800 font-medium break-all">{chan.mediaAccountEmail || "N/A"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 uppercase text-[10px] block font-semibold tracking-wider">Access</span>
                                                        <span className="text-gray-800 font-medium break-all">{chan.accessList || "N/A"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Approval File Preview */}
                        {request.approval_file_url && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Signed Approval Document</h4>
                                </div>
                                <div className="p-5 flex items-center gap-4 flex-wrap">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 border border-purple-100">
                                        <span className="text-purple-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 break-words mb-0.5">
                                            {request.approval_file_url.startsWith("data-ref:") ? request.approval_file_url.replace("data-ref:", "") : "Approval Document"}
                                        </p>
                                        <p className="text-xs text-gray-500">Official signed copy</p>
                                    </div>
                                    {!request.approval_file_url.startsWith("data-ref:") && (
                                        <a
                                            href={request.approval_file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 hover:text-brand-700 transition-colors flex-shrink-0 shadow-sm"
                                        >
                                            View Document
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Sub-Project Allocation */}
                        <SubProjectAllocation
                            requestId={request.id}
                            totalAmount={request.amount}
                            isApproved={request.status === "APPROVED"}
                            addToast={addToast}
                        />

                    </div>
                </div>
            </GlassCard>

            {/* Modals */}
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => {
                    setReceiptModalOpen(false);
                    fetchRequest();
                }}
                request={request}
            />
            <RequestEditModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    fetchRequest();
                }}
                request={request}
            />
            <SignedUploadModal
                isOpen={signedModalOpen}
                onClose={() => {
                    setSignedModalOpen(false);
                    fetchRequest();
                }}
                request={request}
                onSuccess={fetchRequest}
            />
        </div>
    );
}
