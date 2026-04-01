"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent, 
    CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { InfoCard, DetailItem, DetailGrid } from "@/components/ui/DataDisplay";
import { RequestRecord, STATUS_LABELS } from "@/lib/types";
import { RequestStatus } from "@/types/enums";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestEditModal } from "@/components/dashboard/RequestEditModal";
import { SignedUploadModal } from "@/components/dashboard/SignedUploadModal";
import { 
    FileText, 
    Plus, 
    Search, 
    Download, 
    Mail, 
    ChevronDown, 
    Upload, 
    XCircle, 
    Edit, 
    Eye,
    Clock,
    CheckCircle2
} from "lucide-react";

/* โ”€โ”€ helpers โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */
const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
    switch (status) {
        case "APPROVED":
        case "COMPLETED":
        case "ACTIVE":
            return "success";
        case "PENDING_APPROVAL":
        case "PENDING":
            return "warning";
        case "CANCELLED":
        case "REJECTED":
            return "destructive";
        case "DRAFT":
            return "secondary";
        default:
            return "info";
    }
};

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
        <div className="space-y-8 animate-in fade-in duration-500">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
                        My <span className="gradient-text">Requests</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">View and manage your corporate card requests</p>
                </div>
                <Button asChild variant="brand" className="shadow-brand/20">
                    <Link href="/request-form">
                        <Plus className="w-4 h-4 mr-2" />
                        New Request
                    </Link>
                </Button>
            </div>

            {loading ? (
                <Card glass className="py-20 flex flex-col items-center justify-center border-dashed">
                    <Clock className="w-10 h-10 text-brand-500 animate-pulse mb-4" />
                    <p className="text-muted-foreground animate-pulse font-medium">Synchronizing requests...</p>
                </Card>
            ) : requests.length === 0 ? (
                <Card glass className="text-center py-20 border-dashed">
                    <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Found</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm mx-auto">You haven&apos;t submitted any credit card requests yet. New requests will appear here.</p>
                    <Button asChild variant="outline">
                        <Link href="/request-form">Create Your First Request</Link>
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {requests.map((request) => {
                        const isExpanded = expandedRequests.includes(request.id);
                        return (
                            <Card key={request.id} glass className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-shadow duration-300">
                                {/* Header Row */}
                                <div className="p-6">
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Main Info Section */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-4 flex-wrap">
                                                <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-white/50">
                                                    {request.req_id || request.event_id}
                                                </Badge>
                                                <Badge variant={getStatusVariant(request.status)}>
                                                    {STATUS_LABELS[request.status] || request.status}
                                                </Badge>
                                                {request.approval_file_url && (
                                                    <Badge variant="info" className="bg-indigo-50 text-indigo-700 border-indigo-100 italic">
                                                        Signed
                                                    </Badge>
                                                )}
                                            </div>
                                            
                                            <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">
                                                {request.project_name || "Untitled Project"}
                                            </h3>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 backdrop-blur-sm">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Objective</span>
                                                    <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                                                        {request.objective || "No objective defined"}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Budget Summary</span>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-lg font-black text-brand-700">
                                                            THB {request.amount.toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-brand-500 bg-brand-50/50 px-1.5 py-0.5 rounded uppercase">
                                                            {getBillingLabel(request.billing_type)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center gap-4">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-8 text-xs font-semibold hover:bg-white/50"
                                                    onClick={() => toggleExpand(request.id)}
                                                >
                                                    {isExpanded ? "Hide Details" : "View Full Breakdown"}
                                                    <ChevronDown className={cn("ml-1.5 w-3.5 h-3.5 transition-transform duration-300", isExpanded && "rotate-180")} />
                                                </Button>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    Created {fmtDate(request.created_at)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions Section */}
                                        <div className="flex flex-wrap lg:flex-col items-center justify-center lg:items-end gap-2 lg:min-w-[200px]">
                                            {/* Primary Actions */}
                                            {request.status === "APPROVED" && request.approval_file_url && !request.approval_file_url.startsWith("data-ref:") && (
                                                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto h-9 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                                                    <a href={request.approval_file_url} target="_blank" rel="noopener noreferrer">
                                                        <Download className="w-3.5 h-3.5 mr-2" />
                                                        Signed File
                                                    </a>
                                                </Button>
                                            )}

                                            {canEdit(request.status) && (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200" onClick={() => { setSelectedRequest(request); setEditModalOpen(true); }}>
                                                    <Edit className="w-3.5 h-3.5 mr-2" />
                                                    Edit
                                                </Button>
                                            )}

                                            {canUploadSigned(request.status) && (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200" onClick={() => handleUploadSigned(request)}>
                                                    <Upload className="w-3.5 h-3.5 mr-2" />
                                                    Upload Signed
                                                </Button>
                                            )}

                                            {canSendEmail(request.status) && (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" onClick={() => handleSendEmail(request.id)} disabled={sendingEmails[request.id]}>
                                                    {sendingEmails[request.id] ? (
                                                        <Clock className="w-3.5 h-3.5 mr-2 animate-spin" />
                                                    ) : (
                                                        <Mail className="w-3.5 h-3.5 mr-2" />
                                                    )}
                                                    {sendingEmails[request.id] ? "Sending..." : "Notify Manager"}
                                                </Button>
                                            )}

                                            {canUploadReceipt(request.status) && (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-bold" onClick={() => handleUploadReceipt(request)}>
                                                    <Upload className="w-3.5 h-3.5 mr-2" />
                                                    Upload Receipt
                                                </Button>
                                            )}

                                            {canDownloadPDF(request.status) && (
                                                <Button size="sm" variant="outline" className="w-full sm:w-auto h-9 shadow-sm" onClick={() => handleDownloadPDF(request.id)} disabled={downloadingPDFs[request.id]}>
                                                    {downloadingPDFs[request.id] ? (
                                                        <Clock className="w-3.5 h-3.5 mr-2 animate-spin" />
                                                    ) : (
                                                        <FileText className="w-3.5 h-3.5 mr-2" />
                                                    )}
                                                    Request PDF
                                                </Button>
                                            )}

                                            {canCancel(request.status) && (
                                                <Button size="sm" variant="ghost" className="w-full sm:w-auto h-9 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleCancel(request.id)}>
                                                    <XCircle className="w-3.5 h-3.5 mr-2" />
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Detail Panels */}
                                {isExpanded && (
                                    <div className="animate-in slide-in-from-top-4 duration-300 border-t border-gray-100 bg-gradient-to-b from-gray-50/30 to-white/80 pb-6 px-6">
                                        <div className="pt-6 space-y-6">
                                            {/* Information Grid */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <InfoCard title="Applicant Information">
                                                    <div className="space-y-3">
                                                        <DetailItem label="Full Name" value={request.full_name || request.profiles?.name} />
                                                        <DetailItem label="Department" value={request.department || request.profiles?.department} />
                                                        <DetailItem label="Email Account" value={request.email} />
                                                        <DetailItem label="Contact Mobile" value={request.contact_no} />
                                                    </div>
                                                </InfoCard>

                                                <InfoCard title="Financial Timeline">
                                                    <div className="space-y-3">
                                                        <DetailItem label="Total Requested" value={`THB ${request.amount?.toLocaleString()}`} />
                                                        <DetailItem label="Billing Frequency" value={getBillingLabel(request.billing_type)} />
                                                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                                            <DetailItem label="Campaign Start" value={fmtDate(request.start_date)} horizontal={false} />
                                                            <DetailItem label="Campaign End" value={fmtDate(request.endDate || request.end_date)} horizontal={false} />
                                                        </div>
                                                    </div>
                                                </InfoCard>
                                            </div>

                                            {/* Multi-line Content */}
                                            <div className="space-y-6">
                                                {/* Objective Card */}
                                                <Card className="bg-white/50 shadow-none border-gray-100">
                                                    <CardHeader className="py-3 px-4 bg-gray-50/50 border-b">
                                                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center">
                                                            <Search className="w-3 h-3 mr-2" />
                                                            Strategic Objective
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="p-4">
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                            {request.objective || "No description provided."}
                                                        </p>
                                                    </CardContent>
                                                </Card>

                                                {/* Admin Notes */}
                                                {request.approval_notes && (
                                                    <Card className="border-amber-100 bg-amber-50/20 shadow-none">
                                                        <CardHeader className="py-3 px-4 bg-amber-50/50 border-b border-amber-100">
                                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 flex items-center">
                                                                <CheckCircle2 className="w-3 h-3 mr-2" />
                                                                Management Feedback
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-4">
                                                            <p className="text-sm text-amber-900/80 italic font-medium">
                                                                &ldquo;{request.approval_notes}&rdquo;
                                                            </p>
                                                        </CardContent>
                                                    </Card>
                                                )}

                                                {/* Channels */}
                                                {request.promotional_channels && request.promotional_channels.length > 0 && (
                                                    <Card className="bg-white/50 shadow-none border-gray-100">
                                                        <CardHeader className="py-3 px-4 bg-gray-50/50 border-b">
                                                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                                                Media Channels & Access Control ({request.promotional_channels.length})
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                                                {request.promotional_channels.map((chan: any, idx: number) => (
                                                                    <div key={idx} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                                                                            <span className="font-bold text-brand-600">{chan.channel}</span>
                                                                            <span className="text-[10px] font-bold text-gray-300">#{idx + 1}</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Account</span>
                                                                                <span className="text-xs font-medium text-gray-700 truncate">{chan.mediaAccountEmail || "—"}</span>
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Access Profile</span>
                                                                                <span className="text-xs font-medium text-gray-700">{chan.accessList || "—"}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                )}
                                            </div>

                                            {/* Sub-Project Allocation (Internal Component) */}
                                            <SubProjectAllocation
                                                requestId={request.id}
                                                totalAmount={request.amount}
                                                isApproved={request.status === "APPROVED"}
                                                addToast={addToast}
                                            />
                                        </div>
                                    </div>
                                )}
                            </Card>
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

