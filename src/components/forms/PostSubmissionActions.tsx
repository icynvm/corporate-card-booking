"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestFormData } from "@/lib/validations/schema";

interface PostSubmissionActionsProps {
    formData: RequestFormData;
}

export function PostSubmissionActions({ formData }: PostSubmissionActionsProps) {
    const [isSending, setIsSending] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch("/api/generate-pdf", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("PDF generation failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `card-request-${Date.now()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSendToManager = async () => {
        setIsSending(true);
        try {
            const res = await fetch("/api/send-approval", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Failed to send approval request");

            setSent(true);
        } catch (err) {
            console.error(err);
            alert("Failed to send approval request. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto animate-slide-up">
            {/* Success Header */}
            <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    Request <span className="gradient-text">Submitted!</span>
                </h2>
                <p className="text-sm text-gray-500">
                    Your card request has been recorded successfully.
                </p>
            </div>

            {/* Request Summary */}
            <GlassCard className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Request Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Requester</span>
                        <p className="font-medium text-gray-700">{formData.fullName}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Department</span>
                        <p className="font-medium text-gray-700">{formData.department}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">Amount</span>
                        <p className="font-medium text-gray-700">
                            ฿{formData.amount.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <span className="text-gray-400">Billing Type</span>
                        <p className="font-medium text-gray-700">
                            {formData.billingType.replace("_", " ")}
                        </p>
                    </div>
                    <div className="col-span-2">
                        <span className="text-gray-400">Objective</span>
                        <p className="font-medium text-gray-700">{formData.objective}</p>
                    </div>
                    {formData.promotionalChannels && formData.promotionalChannels.length > 0 && (
                        <div className="col-span-2">
                            <span className="text-gray-400">Channels</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {formData.promotionalChannels.map((ch) => (
                                    <span key={ch.channel} className="px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 text-xs font-medium">
                                        {ch.channel}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Action Buttons */}
            <GlassCard>
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">Next Steps</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        )}
                        {isDownloading ? "Generating..." : "Download PDF"}
                    </button>

                    <button
                        onClick={handleSendToManager}
                        disabled={isSending || sent}
                        className={`flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 ${sent ? "btn-success" : "btn-primary"
                            }`}
                    >
                        {sent ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Sent to Manager
                            </>
                        ) : isSending ? (
                            <>
                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Sending...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                                Send to Manager for Approval
                            </>
                        )}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}
