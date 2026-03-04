"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestRecord } from "@/lib/types";

export default function MyRequestsPage() {
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

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "PENDING": return "status-pending";
            case "APPROVED": return "status-approved";
            case "REJECTED": return "status-rejected";
            case "COMPLETED": return "status-completed";
            default: return "";
        }
    };

    const getBillingLabel = (type: string) => {
        switch (type) {
            case "ONE_TIME": return "One-time";
            case "MONTHLY": return "Monthly";
            case "YEARLY": return "Yearly";
            case "YEARLY_MONTHLY": return "Yearly (Monthly)";
            default: return type;
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    My <span className="gradient-text">Requests</span>
                </h1>
                <p className="text-sm text-gray-500">Track the status of your card requests.</p>
            </div>

            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Loading your requests...</p>
                </GlassCard>
            ) : requests.length === 0 ? (
                <GlassCard className="text-center py-16">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-200 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" />
                    </svg>
                    <p className="text-gray-400 mb-4">No requests yet</p>
                    <Link href="/request-form" className="btn-primary inline-flex items-center gap-2">
                        Create Your First Request
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
                                        <span className={getStatusStyle(request.status)}>{request.status}</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-700 text-sm mb-1">{request.objective}</h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                        <span>Project: {request.project_name || "N/A"}</span>
                                        <span>Amount: ฿{request.amount.toLocaleString()}</span>
                                        <span>Type: {getBillingLabel(request.billing_type)}</span>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date(request.created_at).toLocaleDateString("en-GB", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    })}
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
