"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestRecord, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export default function MyRequestsPage() {
    const { t } = useLanguage();
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleDownloadPDF = (requestId: string) => {
        window.open(`/api/requests/${requestId}/pdf`, "_blank");
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
                alert(data.error || "Failed to cancel");
            }
        } catch {
            alert("Failed to cancel request");
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
                    alert("Signed file uploaded successfully! Status changed to Pending Approval.");
                } else {
                    const data = await res.json();
                    alert(data.error || "Upload failed");
                }
            } catch {
                alert("Upload failed");
            }
        };
        input.click();
    };

    const canCancel = (status: string) => {
        return ["DRAFT", "PENDING_APPROVAL"].includes(status);
    };

    const canDownloadPDF = (status: string) => {
        return status !== "CANCELLED";
    };

    const canUploadSigned = (status: string) => {
        return ["DRAFT", "PENDING_APPROVAL"].includes(status);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    {t("myReq.title").split(" ")[0]} <span className="gradient-text">{t("myReq.title").split(" ").slice(1).join(" ") || ""}</span>
                </h1>
                <p className="text-sm text-gray-500">{t("myReq.subtitle")}</p>
            </div>

            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">{t("common.loading")}</p>
                </GlassCard>
            ) : requests.length === 0 ? (
                <GlassCard className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <p className="text-gray-400 mb-4">{t("myReq.noRequests")}</p>
                    <Link href="/request-form" className="btn-primary inline-flex items-center gap-2">
                        {t("myReq.createNew")}
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
                                    <h3 className="font-semibold text-gray-700 text-sm mb-1">{request.objective}</h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                        <span>Project: {request.project_name || "N/A"}</span>
                                        <span>Amount: &#3647;{request.amount.toLocaleString()}</span>
                                        <span>Type: {getBillingLabel(request.billing_type)}</span>
                                    </div>
                                    {request.status === "CANCELLED" && (
                                        <p className="text-xs text-gray-400 mt-2 italic">{t("myReq.cancelled")}</p>
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
                                            {t("myReq.uploadSigned")}
                                        </button>
                                    )}
                                    {/* Download PDF */}
                                    {canDownloadPDF(request.status) && (
                                        <button
                                            onClick={() => handleDownloadPDF(request.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                            </svg>
                                            {t("myReq.downloadPdf")}
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
                                            {t("myReq.cancel")}
                                        </button>
                                    )}
                                    <div className="text-right text-xs text-gray-400">
                                        {new Date(request.created_at).toLocaleDateString("en-GB", {
                                            day: "2-digit", month: "short", year: "numeric",
                                        })}
                                    </div>
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
