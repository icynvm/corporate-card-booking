"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestRecord } from "@/lib/types";

// Demo data
const DEMO_REQUESTS: RequestRecord[] = [
    {
        id: "1", eventId: "REQ-2026-0001", userId: "u1", projectId: "proj-001",
        amount: 45000, objective: "Facebook Ads for Q1 Campaign", contactNo: "081-234-5678",
        billingType: "MONTHLY", startDate: "2026-01-01", endDate: "2026-03-31",
        status: "APPROVED", promotionalChannels: [{ channel: "Facebook", mediaAccountEmail: "ads@co.com", accessList: "Sarah" }],
        pdfUrl: null, createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-01-16T10:00:00Z",
        project: { id: "proj-001", projectName: "Q1 Digital Campaign 2026", totalBudget: 500000, remainingBudget: 455000 },
        receipts: [],
    },
    {
        id: "2", eventId: "REQ-2026-0002", userId: "u1", projectId: "proj-002",
        amount: 120000, objective: "Google Ads - Brand Awareness", contactNo: "081-234-5678",
        billingType: "ONE_TIME", startDate: "2026-02-01", endDate: "2026-02-28",
        status: "PENDING", promotionalChannels: [{ channel: "Google", mediaAccountEmail: "gads@co.com", accessList: "Team" }],
        pdfUrl: null, createdAt: "2026-02-10T10:00:00Z", updatedAt: "2026-02-10T10:00:00Z",
        project: { id: "proj-002", projectName: "Brand Awareness Initiative", totalBudget: 250000, remainingBudget: 130000 },
        receipts: [],
    },
];

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<RequestRecord[]>(DEMO_REQUESTS);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch("/api/requests");
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) setRequests(data);
                }
            } catch { /* Use demo data */ }
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

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    My <span className="gradient-text">Requests</span>
                </h1>
                <p className="text-sm text-gray-500">Track the status of your card requests.</p>
            </div>

            {requests.length === 0 ? (
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
                                        <span className="font-mono text-xs font-bold text-brand-600">{request.eventId}</span>
                                        <span className={getStatusStyle(request.status)}>{request.status}</span>
                                    </div>
                                    <h3 className="font-semibold text-gray-700 text-sm mb-1">{request.objective}</h3>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                                        <span>Project: {request.project?.projectName}</span>
                                        <span>Amount: ฿{request.amount.toLocaleString()}</span>
                                        <span>Type: {request.billingType.replace("_", " ")}</span>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-400">
                                    {new Date(request.createdAt).toLocaleDateString("en-GB", {
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
