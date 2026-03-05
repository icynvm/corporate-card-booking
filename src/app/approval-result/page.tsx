"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Suspense } from "react";

function ApprovalResultContent() {
    const searchParams = useSearchParams();
    const status = searchParams.get("status");
    const action = searchParams.get("action");
    const eventId = searchParams.get("eventId");
    const requester = searchParams.get("requester");
    const amount = searchParams.get("amount");
    const message = searchParams.get("message");

    const isApproved = action === "approve";
    const isError = status === "error";
    const isInfo = status === "info";

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="max-w-md w-full animate-slide-up">
                <GlassCard className="text-center">
                    {/* Icon */}
                    <div
                        className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${isError
                            ? "bg-red-100"
                            : isInfo
                                ? "bg-blue-100"
                                : isApproved
                                    ? "bg-emerald-100"
                                    : "bg-red-100"
                            }`}
                    >
                        {isError ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        ) : isInfo ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        ) : isApproved ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        {isError
                            ? "Something Went Wrong"
                            : isInfo
                                ? "Already Processed"
                                : isApproved
                                    ? "Request Approved"
                                    : "Request Rejected"}
                    </h2>

                    {/* Message */}
                    <p className="text-sm text-gray-500 mb-6">
                        {isError || isInfo
                            ? message
                            : isApproved
                                ? `The card request ${eventId} from ${requester} has been approved.`
                                : `The card request ${eventId} from ${requester} has been rejected.`}
                    </p>

                    {/* Details */}
                    {!isError && !isInfo && amount && (
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Event ID</span>
                                <span className="font-semibold text-gray-700">{eventId}</span>
                            </div>
                            <div className="flex justify-between mt-2">
                                <span className="text-gray-400">Amount</span>
                                <span className="font-semibold text-gray-700">
                                    THB {parseFloat(amount).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
                        Go to Dashboard
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </Link>
                </GlassCard>
            </div>
        </div>
    );
}

export default function ApprovalResultPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[80vh]"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>}>
            <ApprovalResultContent />
        </Suspense>
    );
}
